-- Corregir política UPDATE de teachers para admin
-- El problema: get_user_role() en algunos contextos no retorna correctamente 'admin'
-- Solución: política explícita con EXISTS que no depende de la función helper

DROP POLICY IF EXISTS "teachers_update_own" ON public.teachers;

-- Política separada para el propio profesor
CREATE POLICY "teachers_update_own"
  ON public.teachers FOR UPDATE
  USING (user_id = auth.uid());

-- Política separada y explícita para admin
CREATE POLICY "teachers_update_admin"
  ON public.teachers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
