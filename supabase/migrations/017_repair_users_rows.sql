-- ============================================================
-- Migración 017: Reparar filas faltantes en public.users
-- ============================================================
-- Problema: handle_new_user puede fallar silenciosamente si
-- admin_tasks no existe aún, dejando public.users sin fila.
-- Solución:
--   1. Insertar filas faltantes desde auth.users
--   2. Agregar política INSERT para que el cliente pueda crearlas si faltan
-- ============================================================

-- 1. Insertar filas faltantes en public.users para todos los usuarios de auth
INSERT INTO public.users (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, ''),
  COALESCE(au.raw_user_meta_data->>'role', 'student')
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

-- 2. Permitir que usuarios autenticados inserten su propia fila si falta
--    (seguro: CHECK garantiza que solo puedan insertar con su propio UUID)
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());
