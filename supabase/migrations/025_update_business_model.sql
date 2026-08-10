-- =============================================================================
-- Migración 025 — Actualización modelo de negocio
-- Cambios: planes A/B, confirmation_code en bookings, express_sessions fix,
--          funciones SECURITY DEFINER, RLS messages actualizada
-- Idempotente: usa ADD COLUMN IF NOT EXISTS, ON CONFLICT, DROP CONSTRAINT IF EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MEMBERSHIP_PLANS — nueva columna category + re-seed 7 planes
-- ---------------------------------------------------------------------------

ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('A', 'B'));

-- Desactivar planes genéricos anteriores (reemplazados por variantes A/B)
UPDATE public.membership_plans
SET is_active = FALSE
WHERE slug IN ('basic', 'standard', 'premium');

-- Upsert 7 planes (idempotente)
-- Precios = precio_hora × clases × (1 - descuento)
-- Categoría A: $65.000/h  |  Categoría B: $80.000/h
INSERT INTO public.membership_plans
  (slug, name, category, price, currency, classes_per_month,
   discount_pct, free_express_per_month, express_discount,
   rollover_classes, sort_order, is_active)
VALUES
  ('free',       'Gratuito',   NULL, 0,      'COP', 0,  0.00, 0, 0.00, 0, 0, TRUE),
  -- Básico: 5 clases, 5% dto, sin Express gratis, sin descuento Express
  -- A: 65000 × 5 × 0.95 = 308.750  |  B: 80000 × 5 × 0.95 = 380.000
  ('basico_a',   'Básico A',   'A',  308750, 'COP', 5,  0.05, 0, 0.00, 0, 1, TRUE),
  ('basico_b',   'Básico B',   'B',  380000, 'COP', 5,  0.05, 0, 0.00, 0, 2, TRUE),
  -- Estándar: 8 clases, 8% dto, 1 Express gratis, 8% dto Express, rollover 1
  -- A: 65000 × 8 × 0.92 = 478.400  |  B: 80000 × 8 × 0.92 = 588.800
  ('estandar_a', 'Estándar A', 'A',  481600, 'COP', 8,  0.08, 1, 0.08, 1, 3, TRUE),
  ('estandar_b', 'Estándar B', 'B',  588800, 'COP', 8,  0.08, 1, 0.08, 1, 4, TRUE),
  -- Premium: 12 clases, 12% dto, 2 Express gratis, 12% dto Express, rollover 2
  -- A: 65000 × 12 × 0.88 = 655.200  |  B: 80000 × 12 × 0.88 = 844.800
  ('premium_a',  'Premium A',  'A',  655200, 'COP', 12, 0.12, 2, 0.12, 2, 5, TRUE),
  ('premium_b',  'Premium B',  'B',  844800, 'COP', 12, 0.12, 2, 0.12, 2, 6, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name                   = EXCLUDED.name,
  category               = EXCLUDED.category,
  price                  = EXCLUDED.price,
  currency               = EXCLUDED.currency,
  classes_per_month      = EXCLUDED.classes_per_month,
  discount_pct           = EXCLUDED.discount_pct,
  free_express_per_month = EXCLUDED.free_express_per_month,
  express_discount       = EXCLUDED.express_discount,
  rollover_classes       = EXCLUDED.rollover_classes,
  sort_order             = EXCLUDED.sort_order,
  is_active              = EXCLUDED.is_active,
  updated_at             = NOW();

-- ---------------------------------------------------------------------------
-- 2. BOOKINGS — confirmation_code + status pending_teacher
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmation_code TEXT;

-- Recrear CHECK para incluir pending_teacher
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (
  status IN (
    'pending_teacher', -- esperando que el profesor acepte (flujo Mis Clases)
    'pending',         -- esperando pago (flujo pago directo)
    'confirmed',
    'paid',
    'in_progress',
    'completed',
    'cancelled_student',
    'cancelled_teacher',
    'refunded',
    'no_show'
  )
);

-- ---------------------------------------------------------------------------
-- 3. EXPRESS_SESSIONS — correcciones estructurales
-- ---------------------------------------------------------------------------

-- teacher_id nullable: al crear solicitud no hay profesor asignado aún
ALTER TABLE public.express_sessions
  ALTER COLUMN teacher_id DROP NOT NULL;

-- Nuevas columnas para el modelo inDrive
ALTER TABLE public.express_sessions
  ADD COLUMN IF NOT EXISTS price_min   NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS price_max   NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

-- Extender status para el flujo searching → matched
ALTER TABLE public.express_sessions DROP CONSTRAINT IF EXISTS express_sessions_status_check;
ALTER TABLE public.express_sessions ADD CONSTRAINT express_sessions_status_check CHECK (
  status IN (
    'searching',         -- estudiante buscando, sin profesor asignado
    'requested',         -- (legacy) solicitud enviada
    'accepted',          -- (legacy)
    'matched',           -- primer profesor aceptó
    'in_progress',
    'completed',
    'cancelled_student',
    'cancelled_teacher',
    'expired'            -- timer de 15 min venció sin match
  )
);

-- ---------------------------------------------------------------------------
-- 4. FUNCIÓN: create_scheduled_booking() — atómica (deducir clase + crear booking)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_scheduled_booking(
  p_teacher_id   UUID,
  p_subject_id   UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_duration_min INTEGER,
  p_notes        TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id    UUID;
  v_membership_id UUID;
  v_price         NUMERIC(10, 2);
  v_booking_id    UUID;
BEGIN
  -- Obtener student_id del usuario autenticado
  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  -- Verificar que tiene plan activo con clases disponibles
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE student_id    = v_student_id
    AND status        = 'active'
    AND expires_at    > NOW()
    AND remaining_classes > 0
  ORDER BY expires_at ASC
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION 'NO_CLASSES_AVAILABLE';
  END IF;

  -- Precio = tarifa del profesor × duración en horas
  SELECT hourly_rate * p_duration_min / 60.0 INTO v_price
  FROM public.teachers WHERE id = p_teacher_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'TEACHER_RATE_NOT_SET';
  END IF;

  -- Descontar clase del plan (atómico con el INSERT de booking)
  UPDATE public.memberships
  SET remaining_classes = remaining_classes - 1,
      updated_at        = NOW()
  WHERE id = v_membership_id;

  -- Crear booking en estado pending_teacher
  INSERT INTO public.bookings
    (student_id, teacher_id, subject_id, scheduled_at, duration_min, status, price, notes)
  VALUES
    (v_student_id, p_teacher_id, p_subject_id, p_scheduled_at, p_duration_min,
     'pending_teacher', v_price, p_notes)
  RETURNING id INTO v_booking_id;

  -- Notificar al profesor
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id,
         'booking',
         'Nueva solicitud de clase',
         'Un estudiante quiere reservar contigo',
         jsonb_build_object('booking_id', v_booking_id)
  FROM public.teachers t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.id = p_teacher_id;

  RETURN v_booking_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise para que el caller reciba el mensaje original
    RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. FUNCIÓN: restore_booking_class() — restituye clase si el profesor rechaza
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.restore_booking_class(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_user_id UUID;
BEGIN
  -- Verificar que quien llama es el profesor del booking
  SELECT u.id INTO v_teacher_user_id
  FROM public.bookings b
  JOIN public.teachers t ON t.id = b.teacher_id
  JOIN public.users u ON u.id = t.user_id
  WHERE b.id = p_booking_id
    AND u.id = auth.uid();

  IF v_teacher_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Restaurar clase en el plan activo del estudiante
  UPDATE public.memberships m
  SET remaining_classes = remaining_classes + 1,
      updated_at        = NOW()
  FROM public.bookings b
  JOIN public.students s ON s.id = b.student_id
  WHERE b.id             = p_booking_id
    AND m.student_id     = s.id
    AND m.status         = 'active'
    AND m.expires_at     > NOW();

  -- Cancelar el booking
  UPDATE public.bookings
  SET status     = 'cancelled_teacher',
      updated_at = NOW()
  WHERE id     = p_booking_id
    AND status = 'pending_teacher';
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS MESSAGES — incluir in_progress para que el chat no se cierre
-- ---------------------------------------------------------------------------

-- Reemplazar política INSERT existente (creada en migración 016/022)
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert"     ON public.messages;

CREATE POLICY "messages_insert" ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id         = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM conversations c
    JOIN bookings b ON b.id = c.booking_id
    WHERE c.id       = messages.conversation_id
      AND b.status   IN ('confirmed', 'paid', 'in_progress')
  )
);
