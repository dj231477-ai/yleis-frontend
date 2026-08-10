-- Reemplaza el intento con pg_net (no viable: net.http_collect_response
-- con async:=false se queda esperando para siempre una respuesta a un
-- request que el worker de pg_net todavía no puede ver, porque el INSERT
-- que lo encola vive en la misma transacción sin commit — confirmado con
-- una prueba aislada antes de tocar la función real de pagos).
--
-- En su lugar: activate_membership() ahora exige un "grant" de un solo uso,
-- emitido por create_membership_activation_grant() SOLO después de que
-- frontend/src/app/app/plans/activate/page.tsx verificó el pago real
-- contra la API de Mercado Pago server-side. Así se cierra el bypass (nadie
-- puede activar una membresía llamando el RPC directo con un
-- p_mp_payment_id inventado) sin usar service_role en el frontend y sin
-- depender de pg_net.

CREATE TABLE public.membership_activation_grants (
  id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_slug         TEXT NOT NULL,
  mp_payment_id     TEXT NOT NULL,
  token             UUID NOT NULL UNIQUE DEFAULT extensions.uuid_generate_v4(),
  used              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '10 minutes'
);

ALTER TABLE public.membership_activation_grants ENABLE ROW LEVEL SECURITY;
-- Sin políticas: la tabla es intencionalmente inaccesible por PostgREST
-- directo (RLS habilitado + cero policies = deny-all). Todo el acceso pasa
-- por las funciones SECURITY DEFINER de abajo.

CREATE INDEX idx_membership_activation_grants_token
  ON public.membership_activation_grants (token) WHERE NOT used;

CREATE OR REPLACE FUNCTION public.create_membership_activation_grant(
  p_plan_slug text,
  p_mp_payment_id text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO public.membership_activation_grants (student_user_id, plan_slug, mp_payment_id)
  VALUES (auth.uid(), p_plan_slug, p_mp_payment_id)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_membership_activation_grant(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_membership_activation_grant(text, text) TO authenticated;

-- La firma vieja (2 argumentos, sin grant) se elimina explícitamente: un
-- CREATE OR REPLACE con un argumento nuevo crea una función SOBRECARGADA,
-- no reemplaza la vieja — hay que borrarla o seguiría siendo invocable tal
-- cual sin exigir ningún grant.
DROP FUNCTION IF EXISTS public.activate_membership(text, text);

CREATE OR REPLACE FUNCTION public.activate_membership(
  p_plan_slug text,
  p_mp_payment_id text,
  p_grant_token uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id       UUID;
  v_plan             public.membership_plans%ROWTYPE;
  v_old_membership   public.memberships%ROWTYPE;
  v_rollover_classes INTEGER := 0;
  v_membership_id    UUID;
  v_grant_id         UUID;
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

  -- Exigir un grant válido, de un solo uso, no expirado, emitido para este
  -- mismo usuario/plan/pago por create_membership_activation_grant().
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
    v_rollover_classes := LEAST(
      COALESCE(v_old_membership.remaining_classes, 0),
      COALESCE(v_plan.rollover_classes, 0)
    );
    UPDATE public.memberships
    SET status = 'expired', updated_at = now()
    WHERE id = v_old_membership.id;
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.activate_membership(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_membership(text, text, uuid) TO authenticated;

-- pg_net quedó habilitada de un intento anterior (descartado) — se retira
-- porque no se usa para nada más en el proyecto.
DROP EXTENSION IF EXISTS pg_net;
