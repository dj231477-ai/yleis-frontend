-- ============================================================
-- Migración 040: RLS para teacher_calendar_connections
-- ============================================================
-- La 039 la dejó deny-all pensando en usar service_role desde el
-- backend de Next.js — pero CLAUDE.md prohíbe service_role en frontend.
-- En cambio: el propio profesor gestiona su fila con su sesión normal,
-- vía las API routes que ya validan que sea el dueño del booking.
-- ============================================================

CREATE POLICY "teacher_calendar_connections_own"
  ON public.teacher_calendar_connections FOR ALL
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  );
