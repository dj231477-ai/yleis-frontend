-- Ampliar membership_plans con los campos del modelo de negocio
ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS slug              TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS free_express_per_month  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reschedules_per_month   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS express_discount  NUMERIC(4,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rollover_classes  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order        INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.membership_plans ALTER COLUMN currency SET DEFAULT 'COP';

-- Ampliar memberships con contadores mensuales
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS remaining_classes        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_free_express   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_reschedules    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewed_at               TIMESTAMPTZ;

-- Política de escritura solo para service_role
CREATE POLICY "memberships_service_write" ON public.memberships
  FOR ALL USING (auth.role() = 'service_role');

-- Índices
CREATE INDEX IF NOT EXISTS idx_memberships_student  ON public.memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status   ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_expires  ON public.memberships(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_plans_slug           ON public.membership_plans(slug);

-- Seed: 4 planes
INSERT INTO public.membership_plans (
  slug, name, price, currency,
  classes_per_month, free_express_per_month, reschedules_per_month,
  express_discount, rollover_classes, is_active, sort_order
) VALUES
  ('free',     'Gratuito', 0,     'COP', 0, 0, 0, 0.00, 0, true, 0),
  ('basic',    'Básico',   5000,  'COP', 3, 0, 1, 0.00, 0, true, 1),
  ('standard', 'Estándar', 12000, 'COP', 5, 1, 2, 0.10, 1, true, 2),
  ('premium',  'Premium',  20000, 'COP', 8, 2, 3, 0.15, 2, true, 3)
ON CONFLICT (slug) DO UPDATE SET
  name                   = EXCLUDED.name,
  price                  = EXCLUDED.price,
  classes_per_month      = EXCLUDED.classes_per_month,
  free_express_per_month = EXCLUDED.free_express_per_month,
  reschedules_per_month  = EXCLUDED.reschedules_per_month,
  express_discount       = EXCLUDED.express_discount,
  rollover_classes       = EXCLUDED.rollover_classes,
  is_active              = EXCLUDED.is_active,
  sort_order             = EXCLUDED.sort_order;

-- Función: devuelve el plan activo del usuario (o valores del plan free si no tiene membresía)
CREATE OR REPLACE FUNCTION get_active_plan(p_user_id UUID)
RETURNS TABLE(
  membership_id          UUID,
  plan_slug              TEXT,
  plan_name              TEXT,
  price_cop              NUMERIC,
  classes_per_month      INTEGER,
  free_express_per_month INTEGER,
  reschedules_per_month  INTEGER,
  express_discount       NUMERIC,
  rollover_classes       INTEGER,
  remaining_classes      INTEGER,
  remaining_free_express INTEGER,
  remaining_reschedules  INTEGER,
  expires_at             TIMESTAMPTZ
)
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT
    m.id,
    mp.slug,
    mp.name,
    mp.price,
    mp.classes_per_month,
    mp.free_express_per_month,
    mp.reschedules_per_month,
    mp.express_discount,
    mp.rollover_classes,
    m.remaining_classes,
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
