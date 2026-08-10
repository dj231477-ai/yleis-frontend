-- Extensiones requeridas por Yleis
-- uuid-ossp: PKs con UUID v4
-- pg_trgm:   búsqueda de texto por nombre de profesor
-- btree_gist: EXCLUDE constraint en bookings para prevenir doble reserva

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
