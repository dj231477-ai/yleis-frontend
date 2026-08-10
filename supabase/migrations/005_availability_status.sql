-- teacher_availabilities: disponibilidad semanal recurrente del profesor
-- day_of_week: 0=Domingo, 1=Lunes ... 6=Sábado
CREATE TABLE public.teacher_availabilities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.teacher_availabilities
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- teacher_status: disponibilidad en tiempo real para el modelo Express
CREATE TABLE public.teacher_status (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL UNIQUE REFERENCES public.teachers(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'offline'
                CHECK (status IN ('online', 'busy', 'offline')),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.teacher_status
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Retorna los slots disponibles de un profesor para una fecha y duración dadas
-- Genera slots de p_duration_min minutos dentro de cada ventana de disponibilidad,
-- excluyendo los que ya tienen un booking activo con overlap.
CREATE OR REPLACE FUNCTION get_available_slots(
  p_teacher_id  UUID,
  p_date        DATE,
  p_duration_min INTEGER
)
RETURNS TABLE (
  slot_start    TIMESTAMPTZ,
  slot_end      TIMESTAMPTZ,
  is_available  BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_day_of_week INTEGER;
  v_tz TEXT := 'America/Colombia/Buenos_Aires';
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date::TIMESTAMPTZ AT TIME ZONE v_tz);

  RETURN QUERY
  WITH availability_windows AS (
    SELECT
      (p_date || ' ' || ta.start_time)::TIMESTAMPTZ AT TIME ZONE v_tz AS win_start,
      (p_date || ' ' || ta.end_time)::TIMESTAMPTZ   AT TIME ZONE v_tz AS win_end
    FROM public.teacher_availabilities ta
    WHERE ta.teacher_id = p_teacher_id
      AND ta.day_of_week = v_day_of_week
      AND ta.is_active = TRUE
  ),
  generated_slots AS (
    SELECT
      gs AS slot_s,
      gs + p_duration_min * INTERVAL '1 minute' AS slot_e
    FROM availability_windows aw,
         generate_series(aw.win_start, aw.win_end - p_duration_min * INTERVAL '1 minute',
                         p_duration_min * INTERVAL '1 minute') gs
  )
  SELECT
    gs.slot_s,
    gs.slot_e,
    NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.teacher_id = p_teacher_id
        AND b.status NOT IN ('cancelled_student', 'cancelled_teacher', 'refunded')
        AND tstzrange(b.scheduled_at, b.scheduled_at + (b.duration_min || ' minutes')::INTERVAL)
            && tstzrange(gs.slot_s, gs.slot_e)
    ) AS is_available
  FROM generated_slots gs
  WHERE gs.slot_s >= now();
END;
$$;
