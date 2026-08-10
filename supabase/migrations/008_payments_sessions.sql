-- payments: pagos y reembolsos — solo el sistema puede escribir aquí (RLS service-only)
CREATE TABLE public.payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  express_session_id  UUID REFERENCES public.express_sessions(id) ON DELETE SET NULL,
  student_id          UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending',
                          'approved',
                          'rejected',
                          'cancelled',
                          'refunded',
                          'in_process',
                          'charged_back'
                        )),
  amount              NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  platform_fee        NUMERIC(10, 2),
  teacher_payout      NUMERIC(10, 2),
  refund_amount       NUMERIC(10, 2),
  currency            TEXT NOT NULL DEFAULT 'COP',
  mp_payment_id       TEXT UNIQUE,
  mp_preference_id    TEXT,
  payment_method      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Al menos uno de los dos debe estar presente
  CHECK (booking_id IS NOT NULL OR express_session_id IS NOT NULL)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- sessions: registro de la sesión en vivo (apertura/cierre del Meet)
CREATE TABLE public.sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
