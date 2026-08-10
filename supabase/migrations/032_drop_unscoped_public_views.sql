-- student_upcoming_bookings y student_booking_history (migración 013) no
-- filtran por auth.uid() en absoluto — solo por status del booking — y al
-- ser SECURITY DEFINER bypasean la RLS de `bookings`. Combinado con que
-- `anon` (la api key pública, sin login) tiene SELECT sobre ambas vistas,
-- cualquiera en internet podía leer el horario, precio, notas y el link de
-- Google Meet de TODAS las clases de TODOS los estudiantes.
--
-- Confirmado sin ningún uso real: cero referencias a estas vistas en
-- frontend/src, supabase/functions o n8n/workflows — el dashboard de
-- estudiante consulta `bookings` directo (con su RLS correcta) en su lugar.
--
-- Las otras 5 vistas SECURITY DEFINER del proyecto (teacher_public_catalog,
-- teacher_public_profile, teacher_dashboard_summary, teacher_earnings_detail,
-- teacher_pending_bookings) SÍ necesitan legítimamente SECURITY DEFINER:
-- bypasean intencionalmente la RLS de `users`/`payments` (que solo permite
-- leer tu propia fila) para exponer, de forma curada y ya filtrada por
-- auth.uid(), datos de la otra parte de una relación real (profesor
-- verificado visible públicamente, o nombre del alumno/monto de un pago
-- dentro de un booking del que el profesor es parte). Verificado contra las
-- policies de RLS reales antes de decidir no tocarlas — cambiarlas a
-- SECURITY INVOKER rompería silenciosamente esas vistas (JOINs que hoy
-- devuelven filas dejarían de hacerlo por la RLS de la tabla base).

DROP VIEW IF EXISTS public.student_upcoming_bookings;
DROP VIEW IF EXISTS public.student_booking_history;
