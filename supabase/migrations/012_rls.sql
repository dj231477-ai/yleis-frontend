-- RLS — Row Level Security para todas las tablas
-- Este es el archivo más crítico de seguridad del proyecto.
-- NUNCA usar USING (TRUE) en tablas con datos sensibles.
-- Cada política cubre exactamente una operación.

-- ─── users ────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_or_public"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- ─── subjects ─────────────────────────────────────────────────────────────────
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select_all"
  ON public.subjects FOR SELECT
  USING (is_active = TRUE OR get_user_role() = 'admin');

CREATE POLICY "subjects_admin_insert"
  ON public.subjects FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "subjects_admin_update"
  ON public.subjects FOR UPDATE
  USING (get_user_role() = 'admin');

-- ─── teachers ─────────────────────────────────────────────────────────────────
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Catálogo público: alumnos anónimos ven solo profesores verificados
CREATE POLICY "teachers_public_select"
  ON public.teachers FOR SELECT
  USING (
    onboarding_step = 'verified'
    OR user_id = auth.uid()
    OR get_user_role() = 'admin'
  );

CREATE POLICY "teachers_update_own"
  ON public.teachers FOR UPDATE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

-- El INSERT lo hace handle_new_user (SECURITY DEFINER), no el cliente
CREATE POLICY "teachers_service_insert"
  ON public.teachers FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR get_user_role() = 'admin');

-- ─── students ─────────────────────────────────────────────────────────────────
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own"
  ON public.students FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "students_update_own"
  ON public.students FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "students_service_insert"
  ON public.students FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR get_user_role() = 'admin');

-- ─── teacher_subjects ─────────────────────────────────────────────────────────
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_subjects_select_all"
  ON public.teacher_subjects FOR SELECT
  USING (TRUE);

CREATE POLICY "teacher_subjects_manage_own"
  ON public.teacher_subjects FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

CREATE POLICY "teacher_subjects_delete_own"
  ON public.teacher_subjects FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

-- ─── teacher_availabilities ───────────────────────────────────────────────────
ALTER TABLE public.teacher_availabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_select_all"
  ON public.teacher_availabilities FOR SELECT
  USING (TRUE);

CREATE POLICY "availability_manage_own"
  ON public.teacher_availabilities FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
  );

CREATE POLICY "availability_update_own"
  ON public.teacher_availabilities FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
  );

CREATE POLICY "availability_delete_own"
  ON public.teacher_availabilities FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
  );

-- ─── teacher_status ───────────────────────────────────────────────────────────
ALTER TABLE public.teacher_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_status_select_all"
  ON public.teacher_status FOR SELECT
  USING (TRUE);

CREATE POLICY "teacher_status_manage_own"
  ON public.teacher_status FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
  );

CREATE POLICY "teacher_status_update_own"
  ON public.teacher_status FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- ─── bookings ─────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Alumno ve sus reservas; profesor ve las suyas; admin ve todo
CREATE POLICY "bookings_select_parties"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

-- Solo el alumno puede crear una reserva (para sí mismo)
CREATE POLICY "bookings_student_insert"
  ON public.bookings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

-- Actualización: alumno o profesor de esa reserva, o sistema, o admin
CREATE POLICY "bookings_update_parties"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
    OR auth.role() = 'service_role'
    OR get_user_role() = 'admin'
  );

-- ─── express_sessions ─────────────────────────────────────────────────────────
ALTER TABLE public.express_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "express_select_parties"
  ON public.express_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

CREATE POLICY "express_student_insert"
  ON public.express_sessions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

CREATE POLICY "express_update_parties"
  ON public.express_sessions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid())
    OR auth.role() = 'service_role'
    OR get_user_role() = 'admin'
  );

-- ─── payments ─────────────────────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Solo el alumno dueño del pago puede verlo (y admin)
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

-- Solo el sistema (service_role via Edge Functions) puede crear/modificar pagos
CREATE POLICY "payments_service_insert"
  ON public.payments FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "payments_service_update"
  ON public.payments FOR UPDATE
  USING (auth.role() = 'service_role' OR get_user_role() = 'admin');

-- ─── sessions ─────────────────────────────────────────────────────────────────
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_parties"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.students s ON s.id = b.student_id
      WHERE b.id = booking_id AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE b.id = booking_id AND t.user_id = auth.uid()
    )
    OR get_user_role() = 'admin'
  );

CREATE POLICY "sessions_service_write"
  ON public.sessions FOR ALL
  USING (auth.role() = 'service_role' OR get_user_role() = 'admin');

-- ─── reviews ──────────────────────────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  USING (
    is_public = TRUE
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

CREATE POLICY "reviews_student_insert"
  ON public.reviews FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

CREATE POLICY "reviews_student_update"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

-- ─── notifications ────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- El sistema crea notificaciones (via create_notification() SECURITY DEFINER o service_role)
CREATE POLICY "notifications_service_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ─── mp_webhook_logs ──────────────────────────────────────────────────────────
ALTER TABLE public.mp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs_admin_select"
  ON public.mp_webhook_logs FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "webhook_logs_service_insert"
  ON public.mp_webhook_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ─── admin_tasks ──────────────────────────────────────────────────────────────
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_tasks_admin_all"
  ON public.admin_tasks FOR ALL
  USING (get_user_role() = 'admin' OR auth.role() = 'service_role');
