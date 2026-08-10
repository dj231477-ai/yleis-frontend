-- accept_express_session() no manejaba el caso en que el profesor ya tiene otra
-- reserva activa que se superpone con "ahora" (constraint no_overlapping_bookings):
-- el INSERT lanzaba una excepción sin capturar, tirando abajo toda la función y
-- devolviendo un error interno genérico al frontend sin explicar la causa real.
-- Además, la sesión Express quedaba "matched" con este profesor aunque el booking
-- nunca se creó (la excepción hizo rollback del INSERT pero el runtime necesitaba
-- decidir explícitamente si revertir también el claim de la sesión).

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
  RETURNING student_id, subject_id, price_max, description, duration_min
    INTO v_session;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'SESSION_TAKEN');
  END IF;

  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  BEGIN
    INSERT INTO public.bookings
      (student_id, teacher_id, subject_id, scheduled_at, duration_min,
       status, price, confirmation_code, notes)
    VALUES
      (v_session.student_id, v_teacher_id, v_session.subject_id,
       NOW(), COALESCE(v_session.duration_min, 60),
       'confirmed', COALESCE(v_session.price_max, 0), v_code,
       v_session.description)
    RETURNING id INTO v_booking_id;
  EXCEPTION WHEN exclusion_violation THEN
    -- El profesor ya tiene otra clase activa que se superpone con ahora mismo.
    -- Revertir el claim para que la sesión vuelva a estar disponible.
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
