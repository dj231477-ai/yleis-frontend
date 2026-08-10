-- restore_booking_class() todavía escribía en la columna legacy remaining_classes,
-- que la migración 035 dejó de mantener en favor de remaining_hours. Desde entonces,
-- cuando un profesor rechazaba una reserva pendiente (pending_teacher), las horas
-- cobradas al paquete del estudiante se perdían silenciosamente (no se devolvían al
-- saldo real). Se corrige para usar el mismo membership_id/hours_charged del booking
-- que ya usa refund_membership_hours() en cancel-booking.

CREATE OR REPLACE FUNCTION public.restore_booking_class(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_user_id UUID;
  v_membership_id    UUID;
  v_hours_charged    NUMERIC;
BEGIN
  -- Verificar que quien llama es el profesor del booking, y traer los datos
  -- del paquete que se cobró al crear la reserva.
  SELECT u.id, b.membership_id, b.hours_charged
  INTO v_teacher_user_id, v_membership_id, v_hours_charged
  FROM public.bookings b
  JOIN public.teachers t ON t.id = b.teacher_id
  JOIN public.users u ON u.id = t.user_id
  WHERE b.id = p_booking_id
    AND u.id = auth.uid();

  IF v_teacher_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Devolver las horas cobradas al paquete exacto que se usó (no "cualquier
  -- membresía activa" — puede haber más de una fila histórica).
  IF v_membership_id IS NOT NULL AND v_hours_charged IS NOT NULL THEN
    UPDATE public.memberships
    SET remaining_hours = remaining_hours + v_hours_charged,
        updated_at      = NOW()
    WHERE id = v_membership_id;
  END IF;

  -- Cancelar el booking
  UPDATE public.bookings
  SET status     = 'cancelled_teacher',
      updated_at = NOW()
  WHERE id     = p_booking_id
    AND status = 'pending_teacher';
END;
$$;
