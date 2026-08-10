-- ============================================================
-- Migración 036: create_scheduled_booking usa horas, no clases
-- ============================================================
-- create_scheduled_booking() (de la sesión de seguridad, aún no conectada
-- al frontend) ya hacía exactamente lo que se necesita: checkea saldo,
-- calcula precio, descuenta atómico, crea el booking en pending_teacher,
-- notifica al profesor. Solo faltaba:
-- 1. Usar remaining_hours (según duración real) en vez de remaining_classes
--    (1 unidad fija) — así una clase de 90 min descuenta 1.5h, no 1 "clase".
-- 2. Guardar membership_id + hours_charged en el booking, para poder
--    devolver las horas exactas si se cancela.
-- 3. Aceptar los campos de "¿Quién recibe la clase?" (migración 033).
--
-- reserve_membership_hours() de la migración 035 queda redundante (nunca
-- se llegó a usar desde el frontend) — se elimina para no dejar dos
-- caminos de reserva de horas.
-- ============================================================

DROP FUNCTION IF EXISTS public.reserve_membership_hours(uuid, numeric);

DROP FUNCTION IF EXISTS public.create_scheduled_booking(uuid, uuid, timestamptz, integer, text);

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
  p_recipient_age           INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id    UUID;
  v_membership_id UUID;
  v_hours_needed  NUMERIC(4,2);
  v_price         NUMERIC(10, 2);
  v_booking_id    UUID;
BEGIN
  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  v_hours_needed := p_duration_min / 60.0;

  -- Verificar que tiene paquete activo con saldo de horas suficiente
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

  -- Precio = tarifa del profesor × duración en horas (informativo — ya está
  -- prepago vía el paquete, no se cobra de nuevo por Mercado Pago)
  SELECT hourly_rate * v_hours_needed INTO v_price
  FROM public.teachers WHERE id = p_teacher_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'TEACHER_RATE_NOT_SET';
  END IF;

  -- Descontar horas del paquete (atómico con el INSERT de booking)
  UPDATE public.memberships
  SET remaining_hours = remaining_hours - v_hours_needed,
      updated_at      = NOW()
  WHERE id = v_membership_id;

  INSERT INTO public.bookings
    (student_id, teacher_id, subject_id, scheduled_at, duration_min, status, price, notes,
     membership_id, hours_charged,
     recipient_type, recipient_first_name, recipient_last_name, recipient_relationship, recipient_age)
  VALUES
    (v_student_id, p_teacher_id, p_subject_id, p_scheduled_at, p_duration_min,
     'pending_teacher', v_price, p_notes,
     v_membership_id, v_hours_needed,
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
  uuid, uuid, timestamptz, integer, text, text, text, text, text, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_scheduled_booking(
  uuid, uuid, timestamptz, integer, text, text, text, text, text, integer
) TO authenticated;
