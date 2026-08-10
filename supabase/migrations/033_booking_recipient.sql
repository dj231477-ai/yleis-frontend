-- ============================================================
-- Migración 033: ¿Quién recibe la clase?
-- ============================================================
-- Al solicitar una clase, el estudiante puede reservarla para sí
-- mismo o para otra persona (hijo, familiar, etc.). Si es para
-- otra persona, se guardan sus datos básicos junto al booking.
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN recipient_type TEXT NOT NULL DEFAULT 'self'
    CHECK (recipient_type IN ('self', 'other')),
  ADD COLUMN recipient_first_name TEXT,
  ADD COLUMN recipient_last_name  TEXT,
  ADD COLUMN recipient_relationship TEXT
    CHECK (recipient_relationship IS NULL OR recipient_relationship IN (
      'Padre', 'Madre', 'Abuelo', 'Abuela', 'Familiar',
      'Herman@', 'Cónyuge', 'Pareja', 'Amigo'
    )),
  ADD COLUMN recipient_age INTEGER CHECK (recipient_age IS NULL OR recipient_age > 0);

COMMENT ON COLUMN public.bookings.recipient_type IS
  'self = el propio estudiante recibe la clase; other = la clase es para otra persona (recipient_*)';
