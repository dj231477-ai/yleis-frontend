-- Vistas SQL para FlutterFlow
-- Las vistas heredan el RLS de las tablas subyacentes.

-- Vista: catálogo público de profesores
-- Propósito: listado y búsqueda para alumnos y visitantes anónimos
CREATE OR REPLACE VIEW public.teacher_public_catalog AS
SELECT
  t.id              AS teacher_id,
  u.id              AS user_id,
  u.full_name,
  u.avatar_url,
  t.headline,
  t.hourly_rate,
  t.currency,
  t.rating_avg,
  t.total_reviews,
  t.languages,
  t.onboarding_step = 'verified' AS is_verified,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category))
     FROM public.teacher_subjects ts
     JOIN public.subjects s ON s.id = ts.subject_id
     WHERE ts.teacher_id = t.id),
    '[]'
  ) AS subjects
FROM public.teachers t
JOIN public.users u ON u.id = t.user_id
WHERE t.onboarding_step = 'verified'
  AND t.status = 'active';

-- Vista: perfil completo de un profesor para la página de detalle
CREATE OR REPLACE VIEW public.teacher_public_profile AS
SELECT
  t.id              AS teacher_id,
  u.id              AS user_id,
  u.full_name,
  u.avatar_url,
  t.headline,
  t.bio,
  t.video_intro_url,
  t.hourly_rate,
  t.currency,
  t.rating_avg,
  t.total_reviews,
  t.total_hours_taught,
  t.languages,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category))
     FROM public.teacher_subjects ts
     JOIN public.subjects s ON s.id = ts.subject_id
     WHERE ts.teacher_id = t.id),
    '[]'
  ) AS subjects,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
       'day_of_week', ta.day_of_week,
       'start_time',  ta.start_time,
       'end_time',    ta.end_time
     ) ORDER BY ta.day_of_week, ta.start_time)
     FROM public.teacher_availabilities ta
     WHERE ta.teacher_id = t.id AND ta.is_active = TRUE),
    '[]'
  ) AS availability,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
       'rating',      r.rating,
       'comment',     r.comment,
       'student_name', su.full_name,
       'created_at',  r.created_at
     ) ORDER BY r.created_at DESC)
     FROM (SELECT * FROM public.reviews WHERE teacher_id = t.id AND is_public = TRUE LIMIT 5) r
     JOIN public.students st ON st.id = r.student_id
     JOIN public.users su ON su.id = st.user_id),
    '[]'
  ) AS recent_reviews
FROM public.teachers t
JOIN public.users u ON u.id = t.user_id
WHERE t.onboarding_step = 'verified'
  AND t.status = 'active';

-- Vista: próximas reservas del alumno autenticado
-- RLS de bookings aplica: solo devuelve las del alumno autenticado
CREATE OR REPLACE VIEW public.student_upcoming_bookings AS
SELECT
  b.id              AS booking_id,
  b.scheduled_at,
  b.duration_min,
  b.status,
  b.meet_link,
  b.price,
  b.notes,
  s.name            AS subject_name,
  u.full_name       AS teacher_name,
  u.avatar_url      AS teacher_avatar,
  t.id              AS teacher_id
FROM public.bookings b
JOIN public.subjects s ON s.id = b.subject_id
JOIN public.teachers t ON t.id = b.teacher_id
JOIN public.users u ON u.id = t.user_id
WHERE b.status IN ('confirmed', 'paid', 'in_progress')
  AND b.scheduled_at > now() - INTERVAL '2 hours';

-- Vista: historial de reservas del alumno
CREATE OR REPLACE VIEW public.student_booking_history AS
SELECT
  b.id              AS booking_id,
  b.scheduled_at,
  b.duration_min,
  b.status,
  b.price,
  b.cancellation_reason,
  s.name            AS subject_name,
  u.full_name       AS teacher_name,
  u.avatar_url      AS teacher_avatar,
  EXISTS (
    SELECT 1 FROM public.reviews r WHERE r.booking_id = b.id
  )                 AS has_review
FROM public.bookings b
JOIN public.subjects s ON s.id = b.subject_id
JOIN public.teachers t ON t.id = b.teacher_id
JOIN public.users u ON u.id = t.user_id
WHERE b.status IN ('completed', 'cancelled_student', 'cancelled_teacher', 'refunded', 'no_show');

-- Vista: resumen del dashboard del profesor autenticado
CREATE OR REPLACE VIEW public.teacher_dashboard_summary AS
SELECT
  t.id AS teacher_id,
  t.rating_avg,
  t.total_reviews,
  (
    SELECT COUNT(*)
    FROM public.bookings b
    WHERE b.teacher_id = t.id
      AND b.status IN ('confirmed', 'paid')
      AND DATE_TRUNC('week', b.scheduled_at) = DATE_TRUNC('week', now())
  ) AS classes_this_week,
  (
    SELECT COALESCE(SUM(p.teacher_payout), 0)
    FROM public.payments p
    JOIN public.bookings b ON b.id = p.booking_id
    WHERE b.teacher_id = t.id
      AND p.status = 'approved'
      AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', now())
  ) AS earnings_this_month,
  (
    SELECT COUNT(*)
    FROM public.bookings b
    WHERE b.teacher_id = t.id AND b.status = 'pending'
  ) AS pending_confirmations
FROM public.teachers t
WHERE t.user_id = auth.uid();

-- Vista: reservas pendientes de confirmación para el profesor
CREATE OR REPLACE VIEW public.teacher_pending_bookings AS
SELECT
  b.id          AS booking_id,
  b.scheduled_at,
  b.duration_min,
  b.price,
  b.created_at,
  s.name        AS subject_name,
  u.full_name   AS student_name,
  u.avatar_url  AS student_avatar
FROM public.bookings b
JOIN public.subjects s ON s.id = b.subject_id
JOIN public.students st ON st.id = b.student_id
JOIN public.users u ON u.id = st.user_id
JOIN public.teachers t ON t.id = b.teacher_id
WHERE b.status = 'pending'
  AND t.user_id = auth.uid();

-- Vista: detalle de ganancias del profesor
CREATE OR REPLACE VIEW public.teacher_earnings_detail AS
SELECT
  p.id            AS payment_id,
  p.created_at,
  p.amount,
  p.platform_fee,
  p.teacher_payout,
  p.status,
  p.currency,
  s.name          AS subject_name,
  u.full_name     AS student_name,
  b.scheduled_at  AS class_date
FROM public.payments p
JOIN public.bookings b ON b.id = p.booking_id
JOIN public.subjects s ON s.id = b.subject_id
JOIN public.students st ON st.id = b.student_id
JOIN public.users u ON u.id = st.user_id
JOIN public.teachers t ON t.id = b.teacher_id
WHERE t.user_id = auth.uid()
  AND p.status = 'approved'
ORDER BY p.created_at DESC;

-- Vista: profesores pendientes de verificación (admin)
CREATE OR REPLACE VIEW public.admin_teachers_pending AS
SELECT
  t.id              AS teacher_id,
  u.id              AS user_id,
  u.full_name,
  u.email,
  u.avatar_url,
  t.headline,
  t.bio,
  t.onboarding_step,
  t.created_at
FROM public.teachers t
JOIN public.users u ON u.id = t.user_id
WHERE t.onboarding_step = 'pending_verification';

-- Vista: todas las reservas (admin)
CREATE OR REPLACE VIEW public.admin_global_bookings AS
SELECT
  b.id          AS booking_id,
  b.scheduled_at,
  b.duration_min,
  b.status,
  b.price,
  b.created_at,
  s.name        AS subject_name,
  tu.full_name  AS teacher_name,
  su.full_name  AS student_name
FROM public.bookings b
JOIN public.subjects s ON s.id = b.subject_id
JOIN public.teachers t ON t.id = b.teacher_id
JOIN public.users tu ON tu.id = t.user_id
JOIN public.students st ON st.id = b.student_id
JOIN public.users su ON su.id = st.user_id;

-- Vista: resumen de pagos (admin)
CREATE OR REPLACE VIEW public.admin_payments_overview AS
SELECT
  p.id            AS payment_id,
  p.amount,
  p.platform_fee,
  p.teacher_payout,
  p.status,
  p.currency,
  p.mp_payment_id,
  p.created_at,
  tu.full_name    AS teacher_name,
  su.full_name    AS student_name
FROM public.payments p
JOIN public.bookings b ON b.id = p.booking_id
JOIN public.teachers t ON t.id = b.teacher_id
JOIN public.users tu ON tu.id = t.user_id
JOIN public.students st ON st.id = b.student_id
JOIN public.users su ON su.id = st.user_id;
