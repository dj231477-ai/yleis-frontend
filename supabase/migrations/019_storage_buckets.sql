-- ─── Storage Buckets ──────────────────────────────────────────────────────────
-- teacher-docs: privado (solo el profesor y el admin pueden ver)
-- avatars:      público (foto de perfil, visible en el marketplace)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('teacher-docs', 'teacher-docs', false, 10485760,
   ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']),
  ('avatars', 'avatars', true, 5242880,
   ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ─── Policies: teacher-docs ───────────────────────────────────────────────────

-- El profesor puede subir archicontigo a su propia carpeta (/{user_id}/...)
CREATE POLICY "teacher_docs_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- El profesor puede ver sus propios documentos
CREATE POLICY "teacher_docs_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'teacher-docs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- El profesor puede eliminar sus propios documentos
CREATE POLICY "teacher_docs_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'teacher-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Policies: avatars ────────────────────────────────────────────────────────

-- Cualquier usuario autenticado puede subir su propio avatar
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lectura pública de avatares (bucket público, pero también política explícita)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- El usuario puede reemplazar su propio avatar
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- El usuario puede eliminar su propio avatar
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
