-- Atomic accept for Express sessions: match session + create booking in one transaction.
-- SECURITY DEFINER bypasses RLS so the teacher's JWT can create a booking for a student.

CREATE OR REPLACE FUNCTION public.accept_express_session(
  p_session_id UUID,
  p_teacher_user_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_teacher_id   UUID;
  v_session      RECORD;
  v_code         TEXT;
  v_booking_id   UUID;
BEGIN
  -- Resolve teacher profile
  SELECT id INTO v_teacher_id FROM public.teachers
    WHERE user_id = p_teacher_user_id AND onboarding_step = 'verified';
  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('error', 'TEACHER_NOT_FOUND');
  END IF;

  -- Anti-race: claim the session atomically
  UPDATE public.express_sessions
    SET status = 'matched', teacher_id = v_teacher_id, updated_at = NOW()
    WHERE id = p_session_id
      AND status = 'searching'
      AND expires_at > NOW()
  RETURNING student_id, subject_id, price_max, description, duration_min
    INTO v_session;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'SESSION_TAKEN');
  END IF;

  -- Generate 6-digit code
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Create confirmed booking
  INSERT INTO public.bookings
    (student_id, teacher_id, subject_id, scheduled_at, duration_min,
     status, price, confirmation_code, notes)
  VALUES
    (v_session.student_id, v_teacher_id, v_session.subject_id,
     NOW(), COALESCE(v_session.duration_min, 60),
     'confirmed', COALESCE(v_session.price_max, 0), v_code,
     v_session.description)
  RETURNING id INTO v_booking_id;

  -- Notify student
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'express', '¡Profesor encontrado!',
    'Tu solicitud Express fue aceptada. La clase comienza ahora.',
    jsonb_build_object('booking_id', v_booking_id)
  FROM public.students s JOIN public.users u ON u.id = s.user_id
  WHERE s.id = v_session.student_id;

  RETURN jsonb_build_object('booking_id', v_booking_id);
END;
$$;
