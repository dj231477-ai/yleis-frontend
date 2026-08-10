-- Fix: allow verified teachers to UPDATE express_sessions with status='searching'
-- Previously teacher_id=NULL on searching sessions blocked all teacher UPDATEs (accept action).

DROP POLICY IF EXISTS "express_update_parties" ON public.express_sessions;

CREATE POLICY "express_update_parties"
  ON public.express_sessions FOR UPDATE
  USING (
    -- Student who owns the session
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    -- Assigned teacher (post-match)
    OR (teacher_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid()))
    -- Any verified teacher can accept a searching session
    OR (
      status = 'searching'
      AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = auth.uid() AND t.onboarding_step = 'verified')
    )
    -- Service role and admin
    OR auth.role() = 'service_role'
    OR get_user_role() = 'admin'
  );
