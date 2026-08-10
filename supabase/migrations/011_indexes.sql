-- Índices de rendimiento para todas las tablas
-- Regla: índice en toda FK y todo campo frecuente en WHERE/ORDER BY

-- users
CREATE INDEX idx_users_role      ON public.users(role);
CREATE INDEX idx_users_email     ON public.users(email);

-- teachers
CREATE INDEX idx_teachers_user_id        ON public.teachers(user_id);
CREATE INDEX idx_teachers_status         ON public.teachers(status);
CREATE INDEX idx_teachers_onboarding     ON public.teachers(onboarding_step);
CREATE INDEX idx_teachers_rating         ON public.teachers(rating_avg DESC);

-- GIN index para búsqueda de texto por nombre de profesor (usa pg_trgm)
CREATE INDEX idx_users_full_name_trgm    ON public.users USING gin(full_name gin_trgm_ops);

-- students
CREATE INDEX idx_students_user_id  ON public.students(user_id);

-- subjects
CREATE INDEX idx_subjects_category  ON public.subjects(category);
CREATE INDEX idx_subjects_active    ON public.subjects(is_active);

-- teacher_subjects
CREATE INDEX idx_teacher_subjects_teacher  ON public.teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_subjects_subject  ON public.teacher_subjects(subject_id);

-- teacher_availabilities
CREATE INDEX idx_avail_teacher_day  ON public.teacher_availabilities(teacher_id, day_of_week);
CREATE INDEX idx_avail_active       ON public.teacher_availabilities(teacher_id) WHERE is_active = TRUE;

-- teacher_status
CREATE INDEX idx_teacher_status_status  ON public.teacher_status(status);

-- bookings
CREATE INDEX idx_bookings_student_id  ON public.bookings(student_id);
CREATE INDEX idx_bookings_teacher_id  ON public.bookings(teacher_id);
CREATE INDEX idx_bookings_subject_id  ON public.bookings(subject_id);
CREATE INDEX idx_bookings_status      ON public.bookings(status);
CREATE INDEX idx_bookings_scheduled   ON public.bookings(teacher_id, scheduled_at);
-- Para los crons de recordatorio
CREATE INDEX idx_bookings_reminders   ON public.bookings(scheduled_at, status)
  WHERE reminder_24h_sent = FALSE OR reminder_1h_sent = FALSE;

-- express_sessions
CREATE INDEX idx_express_student   ON public.express_sessions(student_id);
CREATE INDEX idx_express_teacher   ON public.express_sessions(teacher_id);
CREATE INDEX idx_express_status    ON public.express_sessions(status);

-- payments
CREATE INDEX idx_payments_booking_id   ON public.payments(booking_id);
CREATE INDEX idx_payments_student_id   ON public.payments(student_id);
CREATE INDEX idx_payments_status       ON public.payments(status);
CREATE INDEX idx_payments_mp_id        ON public.payments(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- sessions
CREATE INDEX idx_sessions_booking_id  ON public.sessions(booking_id);

-- reviews
CREATE INDEX idx_reviews_teacher_id  ON public.reviews(teacher_id);
CREATE INDEX idx_reviews_student_id  ON public.reviews(student_id);
CREATE INDEX idx_reviews_public      ON public.reviews(teacher_id) WHERE is_public = TRUE;

-- notifications
CREATE INDEX idx_notif_user_id   ON public.notifications(user_id);
CREATE INDEX idx_notif_unread    ON public.notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created   ON public.notifications(user_id, created_at DESC);

-- mp_webhook_logs
CREATE INDEX idx_webhook_event_id  ON public.mp_webhook_logs(mp_event_id);

-- admin_tasks
CREATE INDEX idx_admin_tasks_status  ON public.admin_tasks(status) WHERE status = 'pending';
