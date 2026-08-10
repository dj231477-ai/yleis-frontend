-- Agregar mp_payment_id a memberships para idempotencia
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT UNIQUE;

-- Función SECURITY DEFINER: activa plan desde el frontend (anon key)
-- Verifica autenticación, calcula rollover, crea membresía
CREATE OR REPLACE FUNCTION activate_membership(
  p_plan_slug    TEXT,
  p_mp_payment_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id       UUID;
  v_plan             public.membership_plans%ROWTYPE;
  v_old_membership   public.memberships%ROWTYPE;
  v_rollover_classes INTEGER := 0;
  v_membership_id    UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Idempotencia: si el pago ya fue procesado, devolver la membresía existente
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE mp_payment_id = p_mp_payment_id;

  IF v_membership_id IS NOT NULL THEN
    RETURN v_membership_id;
  END IF;

  -- Obtener student_id del usuario actual
  SELECT id INTO v_student_id
  FROM public.students
  WHERE user_id = auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de estudiante no encontrado';
  END IF;

  -- Obtener el plan
  SELECT * INTO v_plan
  FROM public.membership_plans
  WHERE slug = p_plan_slug AND is_active = TRUE;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Plan no encontrado: %', p_plan_slug;
  END IF;

  -- Calcular rollover de la membresía activa anterior
  SELECT * INTO v_old_membership
  FROM public.memberships
  WHERE student_id = v_student_id
    AND status = 'active'
  ORDER BY expires_at DESC
  LIMIT 1;

  IF v_old_membership.id IS NOT NULL THEN
    -- Tomar el mínimo entre clases restantes y el máximo de rollover del NUEVO plan
    v_rollover_classes := LEAST(
      COALESCE(v_old_membership.remaining_classes, 0),
      COALESCE(v_plan.rollover_classes, 0)
    );
    -- Expirar la membresía anterior
    UPDATE public.memberships
    SET status = 'expired', updated_at = now()
    WHERE id = v_old_membership.id;
  END IF;

  -- Crear nueva membresía
  INSERT INTO public.memberships (
    student_id, plan_id, status,
    started_at, expires_at, renewed_at,
    remaining_classes, remaining_free_express, remaining_reschedules,
    mp_payment_id
  ) VALUES (
    v_student_id,
    v_plan.id,
    'active',
    now(),
    now() + INTERVAL '30 days',
    now(),
    COALESCE(v_plan.classes_per_month, 0) + v_rollover_classes,
    COALESCE(v_plan.free_express_per_month, 0),
    COALESCE(v_plan.reschedules_per_month, 0),
    p_mp_payment_id
  )
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;
