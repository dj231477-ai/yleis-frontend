-- Función global para mantener updated_at sincronizado en todas las tablas
-- Se aplica via trigger BEFORE UPDATE en cada tabla que tenga updated_at

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
