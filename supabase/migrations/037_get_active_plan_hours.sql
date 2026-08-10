-- ============================================================
-- Migración 037: get_active_plan() devuelve horas, no clases
-- ============================================================
-- Complementa la 035 — la tabla ya tenía hours_included/remaining_hours,
-- pero la función que el frontend consulta seguía devolviendo
-- classes_per_month/remaining_classes/rollover_classes.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_active_plan(uuid);

CREATE OR REPLACE FUNCTION public.get_active_plan(p_user_id UUID)
RETURNS TABLE(
  membership_id          UUID,
  plan_slug              TEXT,
  plan_name              TEXT,
  price_cop              NUMERIC,
  hours_included         NUMERIC,
  free_express_per_month INTEGER,
  reschedules_per_month  INTEGER,
  express_discount       NUMERIC,
  remaining_hours        NUMERIC,
  remaining_free_express INTEGER,
  remaining_reschedules  INTEGER,
  expires_at             TIMESTAMPTZ
)
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    m.id,
    mp.slug,
    mp.name,
    mp.price,
    mp.hours_included,
    mp.free_express_per_month,
    mp.reschedules_per_month,
    mp.express_discount,
    m.remaining_hours,
    m.remaining_free_express,
    m.remaining_reschedules,
    m.expires_at
  FROM public.memberships m
  JOIN public.membership_plans mp ON mp.id = m.plan_id
  JOIN public.students s ON s.id = m.student_id
  WHERE s.user_id = p_user_id
    AND m.status = 'active'
    AND m.expires_at > now()
  ORDER BY mp.sort_order DESC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_plan(uuid) TO authenticated;
