-- ============================================================
-- Migración 035: Paquetes por horas (reemplaza el marco "planes/mes")
-- ============================================================
-- Los 6 paquetes reales (básico/estándar/premium × A/B) mantienen el mismo
-- precio y cantidad — antes "N clases/mes", ahora "N horas, vencen a los
-- 30 días de la compra". classes_per_month ya asumía 1 clase = 1 hora en
-- su fórmula de precio (precio_hora × clases), así que el número se
-- reutiliza tal cual como hours_included.
--
-- Cambios de comportamiento (confirmados con el founder):
-- - "Solicitar una clase o paquete" ahora descuenta horas del paquete
--   activo del estudiante en vez de cobrar por Mercado Pago en cada
--   reserva — si no hay saldo, no se puede reservar por ahí (Express
--   sigue siendo pago directo negociado, sin tocar el saldo).
-- - Cancelar una reserva pagada con saldo de paquete devuelve las horas
--   completas al saldo (a diferencia del reembolso en plata, que sí
--   escala según cuánto falte para la clase).
-- - Comprar un paquete nuevo con uno activo suma el saldo restante
--   completo (no solo hasta rollover_classes) y extiende el vencimiento
--   a 30 días desde la compra más reciente.
-- ============================================================

-- 1. membership_plans: horas incluidas (= classes_per_month, mismo precio)
ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS hours_included NUMERIC(6,2) NOT NULL DEFAULT 0;

UPDATE public.membership_plans
SET hours_included = classes_per_month
WHERE slug != 'free';

-- 2. memberships: saldo en horas
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS remaining_hours NUMERIC(6,2) NOT NULL DEFAULT 0;

UPDATE public.memberships
SET remaining_hours = remaining_classes
WHERE remaining_hours = 0 AND remaining_classes > 0;

-- 3. bookings: qué membresía (si alguna) pagó esta clase, y cuántas horas
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id),
  ADD COLUMN IF NOT EXISTS hours_charged NUMERIC(4,2);

CREATE INDEX IF NOT EXISTS idx_bookings_membership
  ON public.bookings(membership_id) WHERE membership_id IS NOT NULL;

-- 4. activate_membership: mismo grant de un solo uso (migración 031), pero
--    ahora suma el saldo en horas completo de la membresía anterior (no
--    limitado por rollover_classes) y también puebla remaining_hours.
CREATE OR REPLACE FUNCTION public.activate_membership(
  p_plan_slug text,
  p_mp_payment_id text,
  p_grant_token uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id     UUID;
  v_plan           public.membership_plans%ROWTYPE;
  v_old_membership public.memberships%ROWTYPE;
  v_carry_hours    NUMERIC(6,2) := 0;
  v_membership_id  UUID;
  v_grant_id       UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE mp_payment_id = p_mp_payment_id;

  IF v_membership_id IS NOT NULL THEN
    RETURN v_membership_id;
  END IF;

  SELECT id INTO v_grant_id
  FROM public.membership_activation_grants
  WHERE token = p_grant_token
    AND student_user_id = auth.uid()
    AND plan_slug = p_plan_slug
    AND mp_payment_id = p_mp_payment_id
    AND NOT used
    AND expires_at > now()
  FOR UPDATE;

  IF v_grant_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_GRANT';
  END IF;

  UPDATE public.membership_activation_grants
  SET used = TRUE
  WHERE id = v_grant_id;

  SELECT id INTO v_student_id
  FROM public.students
  WHERE user_id = auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de estudiante no encontrado';
  END IF;

  SELECT * INTO v_plan
  FROM public.membership_plans
  WHERE slug = p_plan_slug AND is_active = TRUE;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Plan no encontrado: %', p_plan_slug;
  END IF;

  SELECT * INTO v_old_membership
  FROM public.memberships
  WHERE student_id = v_student_id
    AND status = 'active'
  ORDER BY expires_at DESC
  LIMIT 1;

  IF v_old_membership.id IS NOT NULL THEN
    v_carry_hours := COALESCE(v_old_membership.remaining_hours, 0);
    UPDATE public.memberships
    SET status = 'expired', updated_at = now()
    WHERE id = v_old_membership.id;
  END IF;

  INSERT INTO public.memberships (
    student_id, plan_id, status,
    started_at, expires_at, renewed_at,
    remaining_classes, remaining_hours, remaining_free_express, remaining_reschedules,
    mp_payment_id
  ) VALUES (
    v_student_id,
    v_plan.id,
    'active',
    now(),
    now() + INTERVAL '30 days',
    now(),
    COALESCE(v_plan.classes_per_month, 0),
    COALESCE(v_plan.hours_included, 0) + v_carry_hours,
    COALESCE(v_plan.free_express_per_month, 0),
    COALESCE(v_plan.reschedules_per_month, 0),
    p_mp_payment_id
  )
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_membership(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_membership(text, text, uuid) TO authenticated;

-- 5. Reservar horas: usada por createBooking al solicitar clase/paquete.
--    Atómica (FOR UPDATE) — encuentra la membresía activa con saldo
--    suficiente y la descuenta en la misma transacción. Devuelve el id de
--    la membresía usada, o NULL si no hay saldo suficiente en ninguna.
CREATE OR REPLACE FUNCTION public.reserve_membership_hours(
  p_student_id UUID,
  p_hours      NUMERIC
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_membership_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Debe ser el propio estudiante (o un service_role para uso interno)
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sin permisos sobre este estudiante';
  END IF;

  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE student_id = p_student_id
    AND status = 'active'
    AND expires_at > now()
    AND remaining_hours >= p_hours
  ORDER BY expires_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_membership_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.memberships
  SET remaining_hours = remaining_hours - p_hours,
      updated_at = now()
  WHERE id = v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_membership_hours(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_membership_hours(uuid, numeric) TO authenticated, service_role;

-- 6. Devolver horas al cancelar (siempre completo, a diferencia del
--    reembolso en plata que sí escala por cercanía a la clase).
CREATE OR REPLACE FUNCTION public.refund_membership_hours(
  p_membership_id UUID,
  p_hours         NUMERIC
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.memberships
  SET remaining_hours = remaining_hours + p_hours,
      updated_at = now()
  WHERE id = p_membership_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_membership_hours(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_membership_hours(uuid, numeric) TO service_role;
