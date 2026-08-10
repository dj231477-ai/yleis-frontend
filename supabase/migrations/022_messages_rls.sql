-- Migration 022: RLS policies + helper function for messaging system
-- Conversations are linked to bookings. Messages can only be sent while
-- the booking is active (status = 'confirmed' or 'paid').

-- ─── Helper function ──────────────────────────────────────────────────────────

-- Creates or retrieves a conversation for a booking.
-- SECURITY DEFINER: runs as DB owner to bypass RLS when creating participants.
-- Caller must be the student or teacher of the booking, and booking must be active.
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
  v_booking_status  TEXT;
BEGIN
  -- Verify caller is a participant AND booking is active
  SELECT b.status, s.user_id, t.user_id
  INTO   v_booking_status, v_student_user_id, v_teacher_user_id
  FROM   public.bookings  b
  JOIN   public.students  s ON s.id = b.student_id
  JOIN   public.teachers  t ON t.id = b.teacher_id
  WHERE  b.id = p_booking_id
    AND  (s.user_id = auth.uid() OR t.user_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_permission: not a participant of this booking';
  END IF;

  IF v_booking_status NOT IN ('confirmed', 'paid') THEN
    RAISE EXCEPTION 'booking_not_active: booking status is %', v_booking_status;
  END IF;

  -- Return existing conversation if it already exists
  SELECT id INTO v_conversation_id
  FROM   public.conversations
  WHERE  booking_id = p_booking_id;

  IF FOUND THEN
    RETURN v_conversation_id;
  END IF;

  -- Create conversation + both participants atomically
  INSERT INTO public.conversations (booking_id)
  VALUES (p_booking_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, v_student_user_id),
    (v_conversation_id, v_teacher_user_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ─── conversations ────────────────────────────────────────────────────────────

-- User can see conversations they participate in
CREATE POLICY "conversations_select_participant"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = id
        AND  cp.user_id = auth.uid()
    )
    OR get_user_role() = 'admin'
  );

-- No direct INSERT — only via get_or_create_conversation (SECURITY DEFINER)

-- ─── conversation_participants ────────────────────────────────────────────────

-- Users can see their own participation records (+ admin sees all)
CREATE POLICY "conv_participants_select_own"
  ON public.conversation_participants
  FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

-- No direct INSERT — only via get_or_create_conversation (SECURITY DEFINER)

-- ─── messages ────────────────────────────────────────────────────────────────

-- Participants can read all messages in their conversations (including after booking ends)
CREATE POLICY "messages_select_participant"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = messages.conversation_id
        AND  cp.user_id = auth.uid()
    )
    OR get_user_role() = 'admin'
  );

-- Messages can only be sent while the booking is active
CREATE POLICY "messages_insert_active_booking"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = messages.conversation_id
        AND  cp.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM   public.conversations  c
      JOIN   public.bookings       b ON b.id = c.booking_id
      WHERE  c.id = messages.conversation_id
        AND  b.status IN ('confirmed', 'paid')
    )
  );

-- Participants can mark messages as read
CREATE POLICY "messages_update_read"
  ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = messages.conversation_id
        AND  cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = messages.conversation_id
        AND  cp.user_id = auth.uid()
    )
  );
