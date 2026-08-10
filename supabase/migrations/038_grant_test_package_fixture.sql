-- ============================================================
-- Migración 038: fixture de horas para tests E2E
-- ============================================================
-- Función de fixture para tests E2E: le da saldo de horas a la cuenta de
-- prueba fija (cuentaestudiante@prueba.com) sin necesitar el service_role
-- key en el código de test. Bloqueada por email — inofensiva en producción
-- porque solo funciona para esa cuenta semilla.
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_test_package_hours(p_hours NUMERIC DEFAULT 10)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id    UUID;
  v_plan_id       UUID;
  v_membership_id UUID;
BEGIN
  IF auth.email() IS DISTINCT FROM 'cuentaestudiante@prueba.com' THEN
    RAISE EXCEPTION 'Solo disponible para la cuenta de prueba E2E';
  END IF;

  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  SELECT id INTO v_plan_id FROM public.membership_plans WHERE slug = 'basico_a';

  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE student_id = v_student_id AND status = 'active' AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  IF v_membership_id IS NOT NULL THEN
    UPDATE public.memberships
    SET remaining_hours = p_hours,
        expires_at = now() + INTERVAL '30 days',
        updated_at = now()
    WHERE id = v_membership_id;
  ELSE
    INSERT INTO public.memberships
      (student_id, plan_id, status, started_at, expires_at, remaining_hours, remaining_classes)
    VALUES
      (v_student_id, v_plan_id, 'active', now(), now() + INTERVAL '30 days', p_hours, p_hours)
    RETURNING id INTO v_membership_id;
  END IF;

  RETURN v_membership_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_test_package_hours(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_test_package_hours(numeric) TO authenticated;
