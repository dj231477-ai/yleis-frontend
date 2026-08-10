-- Tablas post-MVP creadas vacías para no bloquear migraciones futuras
-- conversations, messages: chat in-app (v1.1)
-- memberships, membership_plans: suscripciones (v1.2)

CREATE TABLE public.membership_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  price       NUMERIC(10, 2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'COP',
  classes_per_month INTEGER,
  discount_pct NUMERIC(4, 2) DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_plans_select_all"
  ON public.membership_plans FOR SELECT
  USING (is_active = TRUE OR get_user_role() = 'admin');

CREATE TABLE public.memberships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  plan_id     UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  status      TEXT NOT NULL DEFAULT 'inactive'
                CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  started_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_select_own"
  ON public.memberships FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

CREATE TABLE public.conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  body            TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
