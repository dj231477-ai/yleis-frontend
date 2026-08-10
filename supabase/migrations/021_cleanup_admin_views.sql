-- Eliminar vistas admin del schema público
-- No son necesarias: el admin opera desde Supabase Dashboard
DROP VIEW IF EXISTS public.admin_global_bookings;
DROP VIEW IF EXISTS public.admin_payments_overview;
DROP VIEW IF EXISTS public.admin_teachers_pending;
-- admin_tasks es una tabla, no una vista
DROP TABLE IF EXISTS public.admin_tasks;
