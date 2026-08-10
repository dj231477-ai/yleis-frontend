-- Fix: allow verified teachers to read express_sessions with status='searching'
-- Previously, teacher_id was NULL on searching sessions so the SELECT policy blocked all teachers.

DROP POLICY IF EXISTS "express_select_parties" ON public.express_sessions;

CREATE POLICY "express_select_parties"
  ON public.express_sessions FOR SELECT
  USING (
    -- Student who owns the session
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    -- Assigned teacher (post-match)
    OR (teacher_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid()))
    -- Any verified teacher can see searching sessions to accept them
    OR (
      status = 'searching'
      AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = auth.uid() AND t.onboarding_step = 'verified')
    )
    -- Admin sees everything
    OR get_user_role() = 'admin'
  );
