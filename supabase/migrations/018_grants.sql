-- ============================================================
-- Migración 018: Permisos de acceso a tablas
-- ============================================================
-- Sin GRANT, el rol `authenticated` (usuarios logueados) recibe
-- "permission denied" al intentar leer cualquier tabla, incluso
-- si las policies de RLS lo permitirían.
-- ============================================================

-- Permisos para usuarios autenticados (rol `authenticated`)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permisos para usuarios anónimos (rol `anon`) — solo lectura pública
-- RLS se encarga de qué filas específicas pueden ver
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Permisos para futuros tablas (cuando se creen en migraciones nuevas)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
