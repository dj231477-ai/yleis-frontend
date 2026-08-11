-- Modalidad de la clase (presencial / virtual), elegida por el estudiante al
-- solicitar — tanto en el flujo de paquetes (create_scheduled_booking) como
-- en Express (express_sessions -> accept_express_session).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS modality TEXT NOT NULL DEFAULT 'virtual'
  CHECK (modality IN ('presencial', 'virtual'));

ALTER TABLE public.express_sessions
  ADD COLUMN IF NOT EXISTS modality TEXT NOT NULL DEFAULT 'virtual'
  CHECK (modality IN ('presencial', 'virtual'));

-- create_scheduled_booking: agrega p_modality al final (signature nueva,
-- hay que dropear la anterior de 10 args primero).
DROP FUNCTION IF EXISTS public.create_scheduled_booking(
  uuid, uuid, timestamptz, integer, text, text, text, text, text, integer
);

CREATE OR REPLACE FUNCTION public.create_scheduled_booking(
  p_teacher_id              UUID,
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
  v_student_id    UUID;
  v_membership_id UUID;
  v_hours_needed  NUMERIC(4,2);
  v_price         NUMERIC(10, 2);
  v_booking_id    UUID;
BEGIN
  IF p_modality NOT IN ('presencial', 'virtual') THEN
    RAISE EXCEPTION 'INVALID_MODALITY';
  END IF;

  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  v_hours_needed := p_duration_min / 60.0;

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

  SELECT hourly_rate * v_hours_needed INTO v_price
  FROM public.teachers WHERE id = p_teacher_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'TEACHER_RATE_NOT_SET';
  END IF;

  UPDATE public.memberships
  SET remaining_hours = remaining_hours - v_hours_needed,
      updated_at      = NOW()
  WHERE id = v_membership_id;

  INSERT INTO public.bookings
    (student_id, teacher_id, subject_id, scheduled_at, duration_min, status, price, notes,
     membership_id, hours_charged, modality,
     recipient_type, recipient_first_name, recipient_last_name, recipient_relationship, recipient_age)
  VALUES
    (v_student_id, p_teacher_id, p_subject_id, p_scheduled_at, p_duration_min,
     'pending_teacher', v_price, p_notes,
     v_membership_id, v_hours_needed, p_modality,
     p_recipient_type, p_recipient_first_name, p_recipient_last_name, p_recipient_relationship, p_recipient_age)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id,
         'booking',
         'Nueva solicitud de clase',
         'Un estudiante quiere reservar contigo',
         jsonb_build_object('booking_id', v_booking_id)
  FROM public.teachers t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.id = p_teacher_id;

  RETURN v_booking_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_scheduled_booking(
  uuid, uuid, timestamptz, integer, text, text, text, text, text, integer, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_scheduled_booking(
  uuid, uuid, timestamptz, integer, text, text, text, text, text, integer, text
) TO authenticated;

-- accept_express_session: la modalidad ya vive en express_sessions (elegida
-- al crear la solicitud) — solo hay que copiarla al booking que se crea.
CREATE OR REPLACE FUNCTION public.accept_express_session(p_session_id uuid, p_teacher_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_teacher_id   UUID;
  v_session      RECORD;
  v_code         TEXT;
  v_booking_id   UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_teacher_user_id THEN
    RETURN jsonb_build_object('error', 'UNAUTHORIZED');
  END IF;

  SELECT id INTO v_teacher_id FROM public.teachers
    WHERE user_id = p_teacher_user_id AND onboarding_step = 'verified';
  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('error', 'TEACHER_NOT_FOUND');
  END IF;

  UPDATE public.express_sessions
    SET status = 'matched', teacher_id = v_teacher_id, updated_at = NOW()
    WHERE id = p_session_id
      AND status = 'searching'
      AND expires_at > NOW()
  RETURNING student_id, subject_id, price_max, description, duration_min, modality
    INTO v_session;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'SESSION_TAKEN');
  END IF;

  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  BEGIN
    INSERT INTO public.bookings
      (student_id, teacher_id, subject_id, scheduled_at, duration_min,
       status, price, confirmation_code, notes, modality)
    VALUES
      (v_session.student_id, v_teacher_id, v_session.subject_id,
       NOW(), COALESCE(v_session.duration_min, 60),
       'confirmed', COALESCE(v_session.price_max, 0), v_code,
       v_session.description, COALESCE(v_session.modality, 'virtual'))
    RETURNING id INTO v_booking_id;
  EXCEPTION WHEN exclusion_violation THEN
    UPDATE public.express_sessions
      SET status = 'searching', teacher_id = NULL, updated_at = NOW()
      WHERE id = p_session_id;
    RETURN jsonb_build_object('error', 'TIME_CONFLICT');
  END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'express', '¡Profesor encontrado!',
    'Tu solicitud Express fue aceptada. La clase comienza ahora.',
    jsonb_build_object('booking_id', v_booking_id)
  FROM public.students s JOIN public.users u ON u.id = s.user_id
  WHERE s.id = v_session.student_id;

  RETURN jsonb_build_object('booking_id', v_booking_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_express_session(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_express_session(uuid, uuid) TO authenticated;
