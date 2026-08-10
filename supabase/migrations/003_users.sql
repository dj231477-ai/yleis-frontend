-- Tabla principal de usuarios — extiende auth.users
-- El trigger handle_new_user la puebla automáticamente al registrarse

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'teacher', 'admin')),
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Crea el registro en public.users y el perfil correspondiente
-- cuando se registra un nuevo usuario en auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
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

CREATE TRIGGER trg_auth_users_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Función helper para obtener el rol del usuario autenticado actual
-- SECURITY DEFINER permite ejecutarla incluso con RLS activo
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- Función helper para crear notificaciones desde triggers o Edge Functions
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id  UUID,
  p_type     TEXT,
  p_title    TEXT,
  p_body     TEXT,
  p_data     JSONB DEFAULT '{}'
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;
$$;
