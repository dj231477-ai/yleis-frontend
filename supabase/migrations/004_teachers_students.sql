-- subjects: materias y áreas de conocimiento
CREATE TABLE public.subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  category    TEXT,
  icon_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- teachers: perfil extendido del profesor (1:1 con users)
CREATE TABLE public.teachers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  headline           TEXT,
  bio                TEXT,
  hourly_rate        NUMERIC(10, 2),
  currency           TEXT NOT NULL DEFAULT 'COP',
  rating_avg         NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  total_reviews      INTEGER NOT NULL DEFAULT 0,
  total_hours_taught NUMERIC(8, 2) NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive', 'suspended')),
  onboarding_step    TEXT NOT NULL DEFAULT 'profile'
                       CHECK (onboarding_step IN ('profile', 'availability', 'pending_verification', 'verified', 'rejected')),
  video_intro_url    TEXT,
  languages          TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- students: perfil extendido del alumno (1:1 con users)
CREATE TABLE public.students (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  learning_goals TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- teacher_subjects: qué materias enseña cada profesor (N:M)
CREATE TABLE public.teacher_subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);

-- Actualiza rating_avg y total_reviews del profesor cuando se agrega/modifica una reseña
CREATE OR REPLACE FUNCTION update_teacher_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.teachers
  SET
    rating_avg    = (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews
                     WHERE teacher_id = COALESCE(NEW.teacher_id, OLD.teacher_id) AND is_public = TRUE),
    total_reviews = (SELECT COUNT(*) FROM public.reviews
                     WHERE teacher_id = COALESCE(NEW.teacher_id, OLD.teacher_id) AND is_public = TRUE)
  WHERE id = COALESCE(NEW.teacher_id, OLD.teacher_id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.admin_tasks (type, description, data)
    VALUES ('trigger_error', 'update_teacher_rating: ' || SQLERRM,
            jsonb_build_object('teacher_id', COALESCE(NEW.teacher_id, OLD.teacher_id)));
    RETURN NEW;
END;
$$;
