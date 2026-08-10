-- ============================================================
-- Migración 016: Verificación de profesores + ajuste de trigger
-- ============================================================
-- Cambios:
-- 1. handle_new_user ya no crea teachers/students automáticamente.
--    FlutterFlow lo hace según el camino elegido ("Quiero aprender" / "Quiero enseñar").
-- 2. Teachers: nuecontigo estados de onboarding alineados al flujo de verificación IA.
-- 3. Teachers: campos para datos profesionales + resultado del análisis IA.
-- ============================================================

-- 1. Actualizar handle_new_user — solo crea el registro en public.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role      TEXT;
  v_full_name TEXT;
BEGIN
  v_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  -- La creación de teachers/students la maneja FlutterFlow
  -- según el camino de registro elegido por el usuario.

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.admin_tasks (type, description, data)
    VALUES ('trigger_error', 'handle_new_user: ' || SQLERRM,
            jsonb_build_object('user_id', NEW.id, 'email', NEW.email));
    RETURN NEW;
END;
$$;

-- 2. Actualizar CHECK de onboarding_step en teachers
--    Nuecontigo estados: profile → documents → submitted → under_review → verified / rejected
ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_onboarding_step_check;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_onboarding_step_check
  CHECK (onboarding_step IN (
    'profile',        -- recién registrado, llenando perfil básico
    'documents',      -- subiendo títulos y certificaciones
    'submitted',      -- envió solicitud, esperando análisis
    'under_review',   -- IA o admin analizando
    'verified',       -- aprobado, accede al dashboard completo
    'rejected'        -- rechazado con motivo
  ));

-- 3. Agregar campos de verificación y datos profesionales al perfil del profesor
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS title              TEXT,
  ADD COLUMN IF NOT EXISTS years_experience   INTEGER CHECK (years_experience >= 0),
  ADD COLUMN IF NOT EXISTS certifications     JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS documents_urls     JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS verification_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ;

-- 4. Función helper para que n8n registre el resultado del análisis IA
CREATE OR REPLACE FUNCTION process_teacher_verification(
  p_teacher_id        UUID,
  p_score             NUMERIC,
  p_recommendation    TEXT,   -- 'approve' | 'review' | 'reject'
  p_notes             TEXT,
  p_auto_threshold    NUMERIC DEFAULT 75
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_step TEXT;
  v_result   TEXT;
BEGIN
  IF p_recommendation = 'approve' OR p_score >= p_auto_threshold THEN
    v_new_step := 'verified';
    v_result   := 'approved';
  ELSIF p_recommendation = 'reject' THEN
    v_new_step := 'rejected';
    v_result   := 'rejected';
  ELSE
    v_new_step := 'under_review';
    v_result   := 'manual_review';
  END IF;

  UPDATE public.teachers
  SET
    verification_score = p_score,
    verification_notes = p_notes,
    onboarding_step    = v_new_step,
    verified_at        = CASE WHEN v_new_step = 'verified' THEN now() ELSE NULL END,
    rejection_reason   = CASE WHEN v_new_step = 'rejected' THEN p_notes ELSE NULL END,
    updated_at         = now()
  WHERE id = p_teacher_id;

  RETURN v_result;
END;
$$;

-- 5. RLS: permitir que el propio usuario inserte su perfil en teachers/students
--    (antes lo hacía el trigger con SECURITY DEFINER; ahora lo hace el cliente autenticado)

-- Teachers: el usuario puede insertar su propio perfil
DROP POLICY IF EXISTS "teachers_insert_own" ON public.teachers;
CREATE POLICY "teachers_insert_own" ON public.teachers
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Students: el usuario puede insertar su propio perfil
DROP POLICY IF EXISTS "students_insert_own" ON public.students;
CREATE POLICY "students_insert_own" ON public.students
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Teachers: el propio profesor puede actualizar su perfil
DROP POLICY IF EXISTS "teachers_update_own" ON public.teachers;
CREATE POLICY "teachers_update_own" ON public.teachers
  FOR UPDATE USING (user_id = auth.uid());

-- Students: el propio alumno puede actualizar su perfil
DROP POLICY IF EXISTS "students_update_own" ON public.students;
CREATE POLICY "students_update_own" ON public.students
  FOR UPDATE USING (user_id = auth.uid());
