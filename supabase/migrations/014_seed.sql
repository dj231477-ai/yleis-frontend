-- Seed data para staging — NO ejecutar en producción
-- Para crear usuarios de prueba: usar el script scripts/seed-staging.sh
-- que utiliza la Admin API de Supabase (no se pueden insertar en auth.users directamente en prod)

-- ─── Materias ────────────────────────────────────────────────────────────────
INSERT INTO public.subjects (name, category) VALUES
  ('Matemáticas',       'Exactas'),
  ('Física',            'Exactas'),
  ('Química',           'Exactas'),
  ('Inglés',            'Idiomas'),
  ('Francés',           'Idiomas'),
  ('Portugués',         'Idiomas'),
  ('Alemán',            'Idiomas'),
  ('Historia',          'Humanidades'),
  ('Biología',          'Ciencias Naturales'),
  ('Programación',      'Tecnología'),
  ('Piano',             'Música'),
  ('Guitarra',          'Música')
ON CONFLICT (name) DO NOTHING;
