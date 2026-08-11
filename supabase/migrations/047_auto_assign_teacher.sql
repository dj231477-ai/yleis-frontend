-- Asignación automática de profesor: el estudiante indica materia + horario
-- (y no tiene que conocer/elegir un profesor). Se envía la solicitud al
-- profesor verificado más antiguo (verified_at más temprano) que dicte esa
-- materia y no tenga ya una clase en ese horario. Si el profesor asignado
-- RECHAZA la solicitud, se reasigna automáticamente al siguiente candidato
-- (mismo criterio, excluyendo a los ya intentados) en vez de cancelarse.
--
-- Nota sobre "disponibilidad": teacher_availabilities existe en el schema
-- pero ningún flujo del producto la puebla (no hay UI para que el profesor
-- declare su horario semanal) — usarla dejaría la función sin candidatos
-- siempre. "Disponible" se interpreta como "no tiene ya una clase que se
-- superponga con ese horario", que es exactamente lo que ya hace cumplir
-- la constraint no_overlapping_bookings al intentar asignar/reasignar.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS auto_assign_excluded_teacher_ids UUID[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.create_auto_assigned_booking(
  p_subject_id              UUID,
  p_scheduled_at            TIMESTAMPTZ,
  p_duration_min            INTEGER,
  p_notes                   TEXT DEFAULT NULL,
  p_recipient_type          TEXT DEFAULT 'self',
  p_recipient_first_name    TEXT DEFAULT NULL,
  p_recipient_last_name     TEXT DEFAULT NULL,
  p_recipient_relationship  TEXT DEFAULT NULL,
  p_recipient_age           INTEGER DEFAULT NULL,
  p_modality                TEXT DEFAULT 'virtual'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id     UUID;
  v_membership_id  UUID;
  v_hours_needed   NUMERIC(4,2);
  v_teacher_id     UUID;
  v_price          NUMERIC(10, 2);
  v_booking_id     UUID;
  v_excluded       UUID[] := '{}';
BEGIN
  IF p_modality NOT IN ('presencial', 'virtual') THEN
    RAISE EXCEPTION 'INVALID_MODALITY';
  END IF;

  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  v_hours_needed := p_duration_min / 60.0;

  -- Bloquear el paquete con saldo suficiente ANTES del loop de asignación,
  -- para que el descuento sea atómico con la única inserción que prospere.
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE student_id     = v_student_id
    AND status         = 'active'
    AND expires_at     > NOW()
    AND remaining_hours >= v_hours_needed
  ORDER BY expires_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION 'NO_HOURS_AVAILABLE';
  END IF;

  LOOP
    SELECT t.id INTO v_teacher_id
    FROM public.teachers t
    JOIN public.teacher_subjects ts ON ts.teacher_id = t.id AND ts.subject_id = p_subject_id
    WHERE t.onboarding_step = 'verified'
      AND t.hourly_rate IS NOT NULL
      AND t.id <> ALL(v_excluded)
    ORDER BY t.verified_at ASC NULLS LAST, t.created_at ASC
    LIMIT 1;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'NO_TEACHER_AVAILABLE';
    END IF;

    SELECT hourly_rate * v_hours_needed INTO v_price
    FROM public.teachers WHERE id = v_teacher_id;

    BEGIN
      INSERT INTO public.bookings
        (student_id, teacher_id, subject_id, scheduled_at, duration_min, status, price, notes,
         membership_id, hours_charged, modality, auto_assign, auto_assign_excluded_teacher_ids,
         recipient_type, recipient_first_name, recipient_last_name, recipient_relationship, recipient_age)
      VALUES
        (v_student_id, v_teacher_id, p_subject_id, p_scheduled_at, p_duration_min,
         'pending_teacher', v_price, p_notes,
         v_membership_id, v_hours_needed, p_modality, true, v_excluded,
         p_recipient_type, p_recipient_first_name, p_recipient_last_name, p_recipient_relationship, p_recipient_age)
      RETURNING id INTO v_booking_id;
    EXCEPTION WHEN exclusion_violation THEN
      v_excluded := v_excluded || v_teacher_id;
      CONTINUE;
    END;

    EXIT;
  END LOOP;

  -- Descontar horas del paquete (una sola vez, tras la inserción exitosa)
  UPDATE public.memberships
  SET remaining_hours = remaining_hours - v_hours_needed,
      updated_at      = NOW()
  WHERE id = v_membership_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id,
         'booking',
         'Nueva solicitud de clase',
         'Un estudiante quiere reservar contigo (asignación automática)',
         jsonb_build_object('booking_id', v_booking_id)
  FROM public.teachers t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.id = v_teacher_id;

  RETURN v_booking_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_auto_assigned_booking(
  uuid, timestamptz, integer, text, text, text, text, text, integer, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_auto_assigned_booking(
  uuid, timestamptz, integer, text, text, text, text, text, integer, text
) TO authenticated;

-- Llamada por el profesor actualmente asignado al rechazar una reserva de
-- auto-asignación: en vez de cancelar, intenta reasignar al siguiente
-- candidato. Si no queda ninguno, cancela y devuelve las horas (mismo
-- comportamiento que restore_booking_class).
CREATE OR REPLACE FUNCTION public.reassign_or_cancel_auto_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_teacher_user_id UUID;
  v_booking                 RECORD;
  v_next_teacher_id         UUID;
  v_excluded                UUID[];
BEGIN
  SELECT b.id, b.subject_id, b.membership_id, b.hours_charged,
         b.teacher_id, b.auto_assign, b.auto_assign_excluded_teacher_ids,
         t.user_id AS current_teacher_user_id
  INTO v_booking
  FROM public.bookings b
  JOIN public.teachers t ON t.id = b.teacher_id
  WHERE b.id = p_booking_id
    AND b.status = 'pending_teacher'
  FOR UPDATE OF b;

  IF v_booking IS NULL OR v_booking.current_teacher_user_id != auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT v_booking.auto_assign THEN
    RAISE EXCEPTION 'NOT_AUTO_ASSIGNED';
  END IF;

  v_excluded := v_booking.auto_assign_excluded_teacher_ids || v_booking.teacher_id;

  LOOP
    SELECT t.id INTO v_next_teacher_id
    FROM public.teachers t
    JOIN public.teacher_subjects ts ON ts.teacher_id = t.id AND ts.subject_id = v_booking.subject_id
    WHERE t.onboarding_step = 'verified'
      AND t.hourly_rate IS NOT NULL
      AND t.id <> ALL(v_excluded)
    ORDER BY t.verified_at ASC NULLS LAST, t.created_at ASC
    LIMIT 1;

    EXIT WHEN v_next_teacher_id IS NULL;

    BEGIN
      UPDATE public.bookings
      SET teacher_id = v_next_teacher_id,
          auto_assign_excluded_teacher_ids = v_excluded,
          updated_at = now()
      WHERE id = p_booking_id;

      INSERT INTO public.notifications (user_id, type, title, body, data)
      SELECT u.id, 'booking', 'Nueva solicitud de clase',
             'Un estudiante quiere reservar contigo (asignación automática)',
             jsonb_build_object('booking_id', p_booking_id)
      FROM public.teachers t2 JOIN public.users u ON u.id = t2.user_id
      WHERE t2.id = v_next_teacher_id;

      RETURN jsonb_build_object('reassigned', true, 'teacher_id', v_next_teacher_id);
    EXCEPTION WHEN exclusion_violation THEN
      v_excluded := v_excluded || v_next_teacher_id;
      CONTINUE;
    END;
  END LOOP;

  -- No quedan candidatos: cancelar y devolver las horas al paquete
  IF v_booking.membership_id IS NOT NULL AND v_booking.hours_charged IS NOT NULL THEN
    UPDATE public.memberships
    SET remaining_hours = remaining_hours + v_booking.hours_charged,
        updated_at      = now()
    WHERE id = v_booking.membership_id;
  END IF;

  UPDATE public.bookings
  SET status     = 'cancelled_teacher',
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('reassigned', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reassign_or_cancel_auto_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_or_cancel_auto_booking(uuid) TO authenticated;
