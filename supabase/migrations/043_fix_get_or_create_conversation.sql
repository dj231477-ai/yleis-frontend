-- get_or_create_conversation() seguía exigiendo status IN ('confirmed','paid') ANTES
-- de siquiera buscar si la conversación ya existía. Migración 025 amplió la policy
-- de INSERT en messages para permitir 'in_progress' también, pero esta función nunca
-- se actualizó — resultado: apenas la clase pasa a in_progress (o termina/se cancela),
-- CADA llamada tira 'booking_not_active', el chat nunca carga (ni siquiera en modo
-- solo-lectura para historial ya existente, que sí es un requisito del producto).
--
-- Fix: el check de permiso (¿el caller es estudiante o profesor de este booking?)
-- se mantiene siempre. El check de estado del booking ya no bloquea la función
-- completa — sigue vigente donde realmente importa: la RLS de INSERT en messages
-- (que ya sólo permite confirmed/paid/in_progress) es la que decide si se puede
-- escribir. Leer una conversación ya creada nunca debería fallar por el estado.

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
  v_student_user_id UUID;
  v_teacher_user_id UUID;
BEGIN
  -- Verificar que quien llama es estudiante o profesor de este booking
  SELECT s.user_id, t.user_id
  INTO   v_student_user_id, v_teacher_user_id
  FROM   public.bookings  b
  JOIN   public.students  s ON s.id = b.student_id
  JOIN   public.teachers  t ON t.id = b.teacher_id
  WHERE  b.id = p_booking_id
    AND  (s.user_id = auth.uid() OR t.user_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_permission: not a participant of this booking';
  END IF;

  SELECT id INTO v_conversation_id
  FROM   public.conversations
  WHERE  booking_id = p_booking_id;

  IF FOUND THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO public.conversations (booking_id)
  VALUES (p_booking_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, v_student_user_id),
    (v_conversation_id, v_teacher_user_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

-- Policy de INSERT duplicada/obsoleta de la migración 022 (solo confirmed/paid,
-- sin in_progress) — quedó viva porque 025 la reemplazó por nombre distinto
-- ("messages_insert") en vez de hacer DROP de esta. No bloqueaba nada por sí sola
-- (policies permissive se combinan con OR), pero es dead weight confuso.
DROP POLICY IF EXISTS "messages_insert_active_booking" ON public.messages;
