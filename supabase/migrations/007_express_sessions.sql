-- express_sessions: sesiones inmediatas del modelo Express (estilo marketplace)
CREATE TABLE public.express_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  teacher_id  UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  subject_id  UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'requested'
                CHECK (status IN (
                  'requested',
                  'accepted',
                  'in_progress',
                  'completed',
                  'cancelled_student',
                  'cancelled_teacher',
                  'expired'
                )),
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_min     INTEGER DEFAULT 30,
  price            NUMERIC(10, 2),
  meet_link        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.express_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
