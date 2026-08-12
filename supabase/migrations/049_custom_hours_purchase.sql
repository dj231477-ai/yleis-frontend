-- ============================================================
-- Migración 049: Compra de horas sueltas (cantidad libre)
-- ============================================================
-- Los estudiantes ya podían comprar 6 paquetes de tamaño fijo
-- (básico/estándar/premium × A/B). Esto agrega una alternativa:
-- comprar cualquier cantidad de horas, con el mismo descuento
-- escalonado por volumen que ya usan los paquetes fijos (menos
-- de 8h = tarifa básico, 8-11h = tarifa estándar, 12h+ = tarifa
-- premium), reutilizando el mismo sistema de saldo/vencimiento
-- de 30 días y stacking que activate_membership (migración 035).
--
-- Igual patrón de seguridad que la compra de paquetes (migración
-- 031): el pago se verifica server-side contra la API de MP antes
-- de emitir un grant de un solo uso, y el precio se calcula
-- SIEMPRE en el servidor (nunca se confía en un monto enviado por
-- el cliente).
-- ============================================================

-- 1. Planes ocultos (is_active = FALSE) que representan "horas
--    sueltas categoría A/B" — permiten reusar memberships.plan_id
--    (NOT NULL) sin tocar el esquema, y quedan fuera del catálogo
--    de /app/plans porque getAllPlans() filtra is_active = TRUE.
INSERT INTO public.membership_plans
  (slug, name, category, price, currency, classes_per_month, hours_included,
   discount_pct, free_express_per_month, express_discount, rollover_classes,
   sort_order, is_active)
VALUES
  ('custom_a', 'Horas sueltas A', 'A', 0, 'COP', 0, 0, 0.00, 0, 0.00, 0, 100, FALSE),
  ('custom_b', 'Horas sueltas B', 'B', 0, 'COP', 0, 0, 0.00, 0, 0.00, 0, 101, FALSE)
ON CONFLICT (slug) DO NOTHING;

-- 2. calculate_custom_hours_price: fuente única de verdad del precio.
--    Toma la tarifa por hora del paquete fijo cuyo umbral de horas
--    corresponde (mismo descuento escalonado que ya existe), para
--    que comprar suelto nunca salga más barato que el paquete
--    equivalente. Sin SECURITY DEFINER — solo lee membership_plans
--    (catálogo público) y no muta nada, así que se puede llamar
--    antes de que exista ningún pago (para cotizar el precio de la
--    preferencia de Mercado Pago).
CREATE OR REPLACE FUNCTION public.calculate_custom_hours_price(
  p_category text,
  p_hours    numeric
) RETURNS numeric
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_basico_rate     numeric;
  v_basico_hours    numeric;
  v_estandar_rate   numeric;
  v_estandar_hours  numeric;
  v_premium_rate    numeric;
  v_premium_hours   numeric;
  v_rate            numeric;
BEGIN
  IF p_category NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'INVALID_CATEGORY';
  END IF;

  IF p_hours IS NULL OR p_hours <= 0 OR p_hours > 200 THEN
    RAISE EXCEPTION 'INVALID_HOURS';
  END IF;

  SELECT price / hours_included, hours_included
    INTO v_basico_rate, v_basico_hours
    FROM public.membership_plans
    WHERE slug = 'basico_' || lower(p_category);

  SELECT price / hours_included, hours_included
    INTO v_estandar_rate, v_estandar_hours
    FROM public.membership_plans
    WHERE slug = 'estandar_' || lower(p_category);

  SELECT price / hours_included, hours_included
    INTO v_premium_rate, v_premium_hours
    FROM public.membership_plans
    WHERE slug = 'premium_' || lower(p_category);

  IF v_basico_rate IS NULL OR v_estandar_rate IS NULL OR v_premium_rate IS NULL THEN
    RAISE EXCEPTION 'PRICING_NOT_CONFIGURED';
  END IF;

  IF p_hours >= v_premium_hours THEN
    v_rate := v_premium_rate;
  ELSIF p_hours >= v_estandar_hours THEN
    v_rate := v_estandar_rate;
  ELSE
    v_rate := v_basico_rate;
  END IF;

  RETURN ROUND(v_rate * p_hours);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_custom_hours_price(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_custom_hours_price(text, numeric) TO authenticated;

-- 3. Grants de un solo uso — mismo patrón que membership_activation_grants
--    (migración 031), tabla separada porque este flujo no tiene un
--    plan_slug fijo (categoría + cantidad libre) y el precio se
--    calcula y congela recién cuando el pago ya fue verificado.
CREATE TABLE public.custom_hours_grants (
  id               UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category         TEXT NOT NULL CHECK (category IN ('A', 'B')),
  hours            NUMERIC(6,2) NOT NULL CHECK (hours > 0),
  price_cop        NUMERIC(10,2) NOT NULL,
  mp_payment_id    TEXT NOT NULL,
  token            UUID NOT NULL UNIQUE DEFAULT extensions.uuid_generate_v4(),
  used             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '10 minutes'
);

ALTER TABLE public.custom_hours_grants ENABLE ROW LEVEL SECURITY;
-- Sin políticas: deny-all vía PostgREST directo, todo el acceso pasa
-- por las funciones SECURITY DEFINER de abajo (igual que
-- membership_activation_grants).

CREATE INDEX idx_custom_hours_grants_token
  ON public.custom_hours_grants (token) WHERE NOT used;

-- 4. create_custom_hours_grant: solo debe llamarse DESPUÉS de que
--    frontend/src/app/app/plans/activate-hours/page.tsx verificó el
--    pago real contra la API de Mercado Pago server-side (mismo
--    orden que create_membership_activation_grant).
CREATE OR REPLACE FUNCTION public.create_custom_hours_grant(
  p_category      text,
  p_hours         numeric,
  p_mp_payment_id text
) RETURNS TABLE(token uuid, price_cop numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price numeric;
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_price := public.calculate_custom_hours_price(p_category, p_hours);

  INSERT INTO public.custom_hours_grants (student_user_id, category, hours, price_cop, mp_payment_id)
  VALUES (auth.uid(), p_category, p_hours, v_price, p_mp_payment_id)
  RETURNING custom_hours_grants.token INTO v_token;

  RETURN QUERY SELECT v_token, v_price;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_custom_hours_grant(text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_custom_hours_grant(text, numeric, text) TO authenticated;

-- 5. activate_custom_hours: exige el grant emitido en el paso 4,
--    hace stacking con cualquier membresía activa igual que
--    activate_membership (migración 035), y usa el plan oculto
--    custom_a/custom_b solo para satisfacer memberships.plan_id.
CREATE OR REPLACE FUNCTION public.activate_custom_hours(
  p_category      text,
  p_hours         numeric,
  p_mp_payment_id text,
  p_grant_token   uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id     UUID;
  v_plan_id        UUID;
  v_old_membership public.memberships%ROWTYPE;
  v_carry_hours    NUMERIC(6,2) := 0;
  v_membership_id  UUID;
  v_grant_id       UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_category NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'INVALID_CATEGORY';
  END IF;

  -- Idempotencia: si este pago ya fue procesado, devolver la membresía existente
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE mp_payment_id = p_mp_payment_id;

  IF v_membership_id IS NOT NULL THEN
    RETURN v_membership_id;
  END IF;

  SELECT id INTO v_grant_id
  FROM public.custom_hours_grants
  WHERE token = p_grant_token
    AND student_user_id = auth.uid()
    AND category = p_category
    AND hours = p_hours
    AND mp_payment_id = p_mp_payment_id
    AND NOT used
    AND expires_at > now()
  FOR UPDATE;

  IF v_grant_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_GRANT';
  END IF;

  UPDATE public.custom_hours_grants
  SET used = TRUE
  WHERE id = v_grant_id;

  SELECT id INTO v_student_id
  FROM public.students
  WHERE user_id = auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de estudiante no encontrado';
  END IF;

  SELECT id INTO v_plan_id
  FROM public.membership_plans
  WHERE slug = 'custom_' || lower(p_category);

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan de horas sueltas no configurado: %', p_category;
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
    v_plan_id,
    'active',
    now(),
    now() + INTERVAL '30 days',
    now(),
    0,
    p_hours + v_carry_hours,
    0,
    0,
    p_mp_payment_id
  )
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_custom_hours(text, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_custom_hours(text, numeric, text, uuid) TO authenticated;
