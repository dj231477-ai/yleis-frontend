-- BUG DE FONDO del chat interno: conversations_select_participant (migración 022)
-- comparaba "cp.conversation_id = id" dentro de una subconsulta sobre
-- conversation_participants (alias cp). Como esa tabla también tiene su propia
-- columna "id", Postgres resuelve el "id" sin calificar contra la tabla MÁS
-- CERCANA en el scope (cp), no contra la tabla externa "conversations" como se
-- pretendía. La policy terminaba siendo, en la práctica, "cp.conversation_id =
-- cp.id" — una comparación que virtualmente nunca es cierta.
--
-- Esto no se notó en la carga inicial del chat porque get_or_create_conversation()
-- es SECURITY DEFINER y bypasea RLS. Pero messages_insert() sí hace un JOIN normal
-- contra conversations (sujeto a esta policy rota), así que TODO envío de mensaje
-- fallaba con "new row violates row-level security policy for table messages",
-- sin importar el estado del booking.

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;

CREATE POLICY "conversations_select_participant"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.conversation_participants cp
      WHERE  cp.conversation_id = conversations.id
        AND  cp.user_id = auth.uid()
    )
    OR get_user_role() = 'admin'
  );
