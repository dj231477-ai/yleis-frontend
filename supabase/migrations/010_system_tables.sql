-- mp_webhook_logs: registro de eventos de Mercado Pago para idempotencia
-- mp_event_id es el data.id del payload — UNIQUE garantiza que no procesamos dos veces
CREATE TABLE public.mp_webhook_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mp_event_id   TEXT NOT NULL UNIQUE,
  action        TEXT NOT NULL,
  status        INTEGER NOT NULL,
  payload       JSONB NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- admin_tasks: tareas manuales pendientes y errores del sistema
-- Los triggers y workflows lo usan para registrar fallos silenciosos
CREATE TABLE public.admin_tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         TEXT NOT NULL,
  description  TEXT NOT NULL,
  data         JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'resolved', 'ignored')),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
