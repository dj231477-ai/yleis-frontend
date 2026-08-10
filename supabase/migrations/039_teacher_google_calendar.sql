-- ============================================================
-- Migración 039: Conexión de Google Calendar por profesor
-- ============================================================
-- Cada profesor puede conectar su propia cuenta de Google (OAuth directo,
-- separado del login) para que, al confirmar una reserva, se cree
-- automáticamente el evento + link de Meet en su calendario real.
--
-- teachers.google_calendar_connected/email: estado visible al cliente.
-- teacher_calendar_connections: tokens — RLS habilitado sin policies
-- (inaccesible directo desde PostgREST), solo accesible via service_role
-- desde las API routes/Edge Functions del servidor.
-- ============================================================

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS google_calendar_email TEXT;

CREATE TABLE IF NOT EXISTS public.teacher_calendar_connections (
  id             UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  teacher_id     UUID NOT NULL UNIQUE REFERENCES public.teachers(id) ON DELETE CASCADE,
  google_email   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  access_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.teacher_calendar_connections;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.teacher_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.teacher_calendar_connections ENABLE ROW LEVEL SECURITY;
-- Sin policies a propósito — deny-all vía PostgREST, solo service_role.
