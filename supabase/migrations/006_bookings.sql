-- bookings: núcleo del negocio — reservas de clase programada
-- scheduled_end_at se calcula via trigger (BEFORE INSERT/UPDATE) para poder usarlo
-- en el EXCLUDE constraint — tstzrange en un índice requiere referencias IMMUTABLE a columnas.
CREATE TABLE public.bookings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id           UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  teacher_id           UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  subject_id           UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  scheduled_at         TIMESTAMPTZ NOT NULL,
  duration_min         INTEGER NOT NULL CHECK (duration_min IN (30, 60, 90)),
  scheduled_end_at     TIMESTAMPTZ NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN (
                           'pending',
                           'confirmed',
                           'paid',
                           'in_progress',
                           'completed',
                           'cancelled_student',
                           'cancelled_teacher',
                           'refunded',
                           'no_show'
                         )),
  price                NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  meet_link            TEXT,
  notes                TEXT,
  cancellation_reason  TEXT,
  reminder_24h_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_1h_sent     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Previene que el mismo profesor tenga dos bookings acticontigo que se superpongan en el tiempo
  CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
    teacher_id WITH =,
    tstzrange(scheduled_at, scheduled_end_at) WITH &&
  ) WHERE (status NOT IN ('cancelled_student', 'cancelled_teacher', 'refunded', 'no_show'))
);

-- Trigger que mantiene scheduled_end_at sincronizado con scheduled_at + duration_min
CREATE OR REPLACE FUNCTION compute_booking_end()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.scheduled_end_at := NEW.scheduled_at + NEW.duration_min * INTERVAL '1 minute';
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_booking_end_at
  BEFORE INSERT OR UPDATE OF scheduled_at, duration_min ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION compute_booking_end();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
