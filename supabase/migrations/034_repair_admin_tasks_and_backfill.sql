-- ============================================================
-- Reparar admin_tasks + confirmar creación automática de teachers/students
-- ============================================================
-- Este archivo existía localmente sin aplicar, numerado 029 (colisión con
-- 029_security_hardening.sql de esta sesión) — renombrado a 033 y revisado
-- contra el estado real de producción antes de aplicarlo:
--
-- 1. La migración 016 le sacó a handle_new_user() la creación de las filas
--    en public.teachers/public.students (asumía que FlutterFlow lo hacía
--    del lado cliente). El proyecto ya es 100% Next.js. Verificado contra
--    la función EN VIVO (pg_get_functiondef): ya tiene la creación de
--    teachers/students restaurada — alguien la corrigió antes, fuera del
--    tracking de migraciones. Se re-aplica igual (CREATE OR REPLACE
--    idéntico + SET search_path, que faltaba) para que quede en el
--    historial y el search_path quede fijo como el resto de funciones
--    endurecidas en la migración 029_security_hardening.
-- 2. La migración 021 sí borró por error la tabla public.admin_tasks (su
--    propio comentario dice "es una tabla, no una vista" y la dropea
--    igual) — confirmado ausente en producción (list_tables). El fallback
--    de errores de handle_new_user, update_teacher_rating, y los edge
--    functions mp-webhook/cancel-booking insertan ahí — sin la tabla, esos
--    paths de error fallan en cascada en vez de loguear silenciosamente.
-- 3. Backfill defensivo: confirmado 0 usuarios sin perfil hoy (la fila
--    creation ya corre bien), pero se deja el backfill idempotente por si
--    hubo una ventana sin cubrir entre la migración 016 y el fix manual.
-- ============================================================

-- 1. Recrear admin_tasks (igual que en 010 + índice de 011 + RLS de 012)
CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id           UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  type         TEXT NOT NULL,
  description  TEXT NOT NULL,
  data         JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'resolved', 'ignored')),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.admin_tasks;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON public.admin_tasks(status) WHERE status = 'pending';

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_tasks_admin_all" ON public.admin_tasks;
CREATE POLICY "admin_tasks_admin_all"
  ON public.admin_tasks FOR ALL
  USING (get_user_role() = 'admin' OR auth.role() = 'service_role');

-- 2. Re-confirmar handle_new_user() con search_path fijo (idéntica lógica
--    a la que ya corre en producción, solo agrega el SET que faltaba)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role      TEXT;
  v_full_name TEXT;
BEGIN
  v_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'teacher' THEN
    INSERT INTO public.teachers (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.students (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.admin_tasks (type, description, data)
    VALUES ('trigger_error', 'handle_new_user: ' || SQLERRM,
            jsonb_build_object('user_id', NEW.id, 'email', NEW.email));
    RETURN NEW;
END;
$$;

-- CREATE OR REPLACE preserva el ACL existente, pero se re-revoca por las
-- dudas (idempotente) — handle_new_user es solo-trigger, sin caller legítimo.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 3. Backfill: crear teachers/students faltantes para usuarios ya existentes
INSERT INTO public.teachers (user_id)
SELECT u.id FROM public.users u
LEFT JOIN public.teachers t ON t.user_id = u.id
WHERE u.role = 'teacher' AND t.user_id IS NULL;

INSERT INTO public.students (user_id)
SELECT u.id FROM public.users u
LEFT JOIN public.students s ON s.user_id = u.id
WHERE u.role != 'teacher' AND s.user_id IS NULL;
