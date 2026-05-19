-- ============================================================
-- YLEIS — Esquema de base de datos completo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Tipos enumerados
CREATE TYPE user_role     AS ENUM ('student', 'teacher', 'translator', 'interpreter', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE express_status AS ENUM ('pending', 'accepted', 'timeout', 'cancelled');
CREATE TYPE service_type   AS ENUM ('language_class', 'translation', 'interpretation');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'refunded');
CREATE TYPE modality       AS ENUM ('live', 'recorded', 'both');

-- ── PROFILES ────────────────────────────────────────────────
-- Extiende auth.users de Supabase (un registro por usuario)
CREATE TABLE profiles (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                     user_role NOT NULL DEFAULT 'student',
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  avatar_url               TEXT,
  phone                    TEXT,
  city                     TEXT,
  country                  TEXT DEFAULT 'Colombia',
  timezone                 TEXT DEFAULT 'America/Bogota',
  bio                      TEXT,
  languages                JSONB DEFAULT '[]',
  is_active                BOOLEAN DEFAULT TRUE,
  google_calendar_connected BOOLEAN DEFAULT FALSE,
  google_calendar_email    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crea perfil automáticamente cuando alguien se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Nuevo'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SERVICE CATEGORIES ──────────────────────────────────────
CREATE TABLE service_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        service_type NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO service_categories (name, type, description) VALUES
  ('Inglés',              'language_class',  'Clases de inglés todos los niveles'),
  ('Francés',             'language_class',  'Clases de francés todos los niveles'),
  ('Alemán',              'language_class',  'Clases de alemán todos los niveles'),
  ('Portugués',           'language_class',  'Clases de portugués todos los niveles'),
  ('Traducción Legal',    'translation',     'Contratos, poderes, sentencias'),
  ('Traducción Médica',   'translation',     'Historias clínicas, informes'),
  ('Traducción Técnica',  'translation',     'Manuales, software, ingeniería'),
  ('Interpretación Simultánea', 'interpretation', 'Conferencias y eventos en vivo'),
  ('Interpretación Consecutiva','interpretation', 'Reuniones y negociaciones');

-- ── PROVIDER OFFERINGS ──────────────────────────────────────
CREATE TABLE provider_offerings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES service_categories(id),
  price_per_hour NUMERIC(10,2) NOT NULL,
  modality       modality DEFAULT 'live',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOOKINGS ────────────────────────────────────────────────
CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES profiles(id),
  provider_id   UUID NOT NULL REFERENCES profiles(id),
  offering_id   UUID NOT NULL REFERENCES provider_offerings(id),
  status        booking_status DEFAULT 'pending',
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_min  INT DEFAULT 60,
  price         NUMERIC(10,2) NOT NULL,
  currency      TEXT DEFAULT 'COP',
  meeting_url   TEXT,
  recording_url TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── EXPRESS REQUESTS (flujo tipo Uber) ──────────────────────
CREATE TABLE express_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES profiles(id),
  category_id   UUID NOT NULL REFERENCES service_categories(id),
  status        express_status DEFAULT 'pending',
  accepted_by   UUID REFERENCES profiles(id),
  price_offered NUMERIC(10,2) NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── PAYMENTS ────────────────────────────────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  mp_payment_id   TEXT,
  amount          NUMERIC(10,2) NOT NULL,
  platform_fee    NUMERIC(10,2) NOT NULL,
  provider_amount NUMERIC(10,2) NOT NULL,
  status          payment_status DEFAULT 'pending',
  method          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REVIEWS ─────────────────────────────────────────────────
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewed_id UUID NOT NULL REFERENCES profiles(id),
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES ────────────────────────────────────────────────
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  sender_id  UUID NOT NULL REFERENCES profiles(id),
  content    TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE express_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;

-- Helper: verifica si el usuario actual es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── PROFILES RLS ────────────────────────────────────────────
-- Cualquiera puede ver perfiles públicos
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (TRUE);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Solo el sistema (trigger) inserta perfiles
CREATE POLICY "profiles_insert_trigger" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── SERVICE CATEGORIES RLS ──────────────────────────────────
-- Todos pueden ver categorías
CREATE POLICY "categories_select_all" ON service_categories
  FOR SELECT USING (TRUE);

-- Solo admin puede crear/editar categorías
CREATE POLICY "categories_admin_all" ON service_categories
  FOR ALL USING (is_admin());

-- ── PROVIDER OFFERINGS RLS ──────────────────────────────────
-- Todos pueden ver ofertas activas
CREATE POLICY "offerings_select_active" ON provider_offerings
  FOR SELECT USING (is_active = TRUE);

-- Solo el proveedor gestiona sus propias ofertas
CREATE POLICY "offerings_provider_own" ON provider_offerings
  FOR ALL USING (auth.uid() = provider_id);

-- ── BOOKINGS RLS ────────────────────────────────────────────
-- Estudiante ve solo sus reservas
CREATE POLICY "bookings_student_own" ON bookings
  FOR SELECT USING (auth.uid() = student_id);

-- Profesional ve las reservas donde él es proveedor
CREATE POLICY "bookings_provider_own" ON bookings
  FOR SELECT USING (auth.uid() = provider_id);

-- Admin ve todo
CREATE POLICY "bookings_admin_all" ON bookings
  FOR ALL USING (is_admin());

-- Estudiante puede crear reservas
CREATE POLICY "bookings_student_insert" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Proveedor puede actualizar estado de sus reservas
CREATE POLICY "bookings_provider_update" ON bookings
  FOR UPDATE USING (auth.uid() = provider_id);

-- ── EXPRESS REQUESTS RLS ────────────────────────────────────
-- Estudiante ve sus solicitudes
CREATE POLICY "express_student_own" ON express_requests
  FOR SELECT USING (auth.uid() = student_id);

-- Proveedores ven solicitudes pendientes (para aceptar)
CREATE POLICY "express_providers_pending" ON express_requests
  FOR SELECT USING (status = 'pending');

-- Estudiante crea solicitudes
CREATE POLICY "express_student_insert" ON express_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Proveedor acepta (actualiza) la solicitud
CREATE POLICY "express_provider_accept" ON express_requests
  FOR UPDATE USING (status = 'pending');

-- ── PAYMENTS RLS ────────────────────────────────────────────
-- Usuario ve pagos de sus reservas
CREATE POLICY "payments_own_booking" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND (bookings.student_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Admin ve todos los pagos
CREATE POLICY "payments_admin_all" ON payments
  FOR ALL USING (is_admin());

-- ── REVIEWS RLS ─────────────────────────────────────────────
CREATE POLICY "reviews_select_all" ON reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ── MESSAGES RLS ────────────────────────────────────────────
-- Solo los participantes de la reserva ven los mensajes
CREATE POLICY "messages_participants" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.student_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- ÍNDICES (performance en queries frecuentes)
-- ============================================================

CREATE INDEX idx_bookings_student    ON bookings(student_id);
CREATE INDEX idx_bookings_provider   ON bookings(provider_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_scheduled  ON bookings(scheduled_at);
CREATE INDEX idx_express_status      ON express_requests(status);
CREATE INDEX idx_express_expires     ON express_requests(expires_at);
CREATE INDEX idx_offerings_provider  ON provider_offerings(provider_id);
CREATE INDEX idx_messages_booking    ON messages(booking_id);
CREATE INDEX idx_reviews_reviewed    ON reviews(reviewed_id);
