-- Corrige bypasses de autorización reales encontrados por los security advisors
-- de Supabase: varias funciones SECURITY DEFINER eran invocables directamente
-- vía PostgREST (/rest/v1/rpc/...) sin ninguna verificación interna de que el
-- caller sea quien dice ser, permitiendo actuar sobre datos de otros usuarios
-- saltándose por completo la app de Next.js.

-- 1. accept_express_session: confiaba ciegamente en p_teacher_user_id sin
--    verificar que coincidiera con el caller autenticado. Cualquiera (incluso
--    anon, que tenía EXECUTE) podía secuestrar cualquier sesión Express para
--    cualquier profesor adivinando/enumerando su user_id.
CREATE OR REPLACE FUNCTION public.accept_express_session(p_session_id uuid, p_teacher_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_teacher_id   UUID;
  v_session      RECORD;
  v_code         TEXT;
  v_booking_id   UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_teacher_user_id THEN
    RETURN jsonb_build_object('error', 'UNAUTHORIZED');
  END IF;

  SELECT id INTO v_teacher_id FROM public.teachers
    WHERE user_id = p_teacher_user_id AND onboarding_step = 'verified';
  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('error', 'TEACHER_NOT_FOUND');
  END IF;

  UPDATE public.express_sessions
    SET status = 'matched', teacher_id = v_teacher_id, updated_at = NOW()
    WHERE id = p_session_id
      AND status = 'searching'
      AND expires_at > NOW()
  RETURNING student_id, subject_id, price_max, description, duration_min
    INTO v_session;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'SESSION_TAKEN');
  END IF;

  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  INSERT INTO public.bookings
    (student_id, teacher_id, subject_id, scheduled_at, duration_min,
     status, price, confirmation_code, notes)
  VALUES
    (v_session.student_id, v_teacher_id, v_session.subject_id,
     NOW(), COALESCE(v_session.duration_min, 60),
     'confirmed', COALESCE(v_session.price_max, 0), v_code,
     v_session.description)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'express', '¡Profesor encontrado!',
    'Tu solicitud Express fue aceptada. La clase comienza ahora.',
    jsonb_build_object('booking_id', v_booking_id)
  FROM public.students s JOIN public.users u ON u.id = s.user_id
  WHERE s.id = v_session.student_id;

  RETURN jsonb_build_object('booking_id', v_booking_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_express_session(uuid, uuid) FROM anon;

-- 2. get_active_plan: devolvía el plan/membresía de CUALQUIER usuario dado un
--    p_user_id arbitrario, sin comparar contra el caller — filtro de fuga de
--    datos entre estudiantes. Es LANGUAGE SQL (no puede RAISE), así que el
--    check se agrega como condición del WHERE.
CREATE OR REPLACE FUNCTION public.get_active_plan(p_user_id uuid)
RETURNS TABLE(membership_id uuid, plan_slug text, plan_name text, price_cop numeric, classes_per_month integer, free_express_per_month integer, reschedules_per_month integer, express_discount numeric, rollover_classes integer, remaining_classes integer, remaining_free_express integer, remaining_reschedules integer, expires_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.id,
    mp.slug,
    mp.name,
    mp.price,
    mp.classes_per_month,
    mp.free_express_per_month,
    mp.reschedules_per_month,
    mp.express_discount,
    mp.rollover_classes,
    m.remaining_classes,
    m.remaining_free_express,
    m.remaining_reschedules,
    m.expires_at
  FROM public.memberships m
  JOIN public.membership_plans mp ON mp.id = m.plan_id
  JOIN public.students s ON s.id = m.student_id
  WHERE s.user_id = p_user_id
    AND p_user_id = auth.uid()
    AND m.status = 'active'
    AND m.expires_at > now()
  ORDER BY mp.sort_order DESC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_plan(uuid) FROM anon;

-- 3. process_teacher_verification: no existe ningún caller en la app hoy (la
--    verificación de profesores es 100% manual desde el onboarding, no hay
--    workflow n8n W10 de IA todavía) — pero la función estaba abierta a
--    anon+authenticated, así que cualquiera podía auto-aprobarse (o aprobar a
--    cualquier profesor) como "verified" llamando el RPC directo. Se bloquea
--    a service_role hasta que exista un flujo admin/automatizado real.
REVOKE EXECUTE ON FUNCTION public.process_teacher_verification(uuid, numeric, text, text, numeric) FROM anon, authenticated;
ALTER FUNCTION public.process_teacher_verification(uuid, numeric, text, text, numeric) SET search_path = public;

-- 4. create_notification: no se llama desde ningún lado de la app (los call
--    sites insertan directo en `notifications`) — estaba abierta a
--    anon+authenticated, permitiendo forjar notificaciones (spam/phishing)
--    para cualquier user_id arbitrario.
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) FROM anon, authenticated;
ALTER FUNCTION public.create_notification(uuid, text, text, text, jsonb) SET search_path = public;

-- 5. Funciones que solo existen como triggers no tienen ninguna razón
--    legítima para ser invocables vía RPC — se revoca en profundidad, sin
--    impacto funcional (el trigger las sigue ejecutando igual).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_teacher_rating() FROM anon, authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_teacher_rating() SET search_path = public;

-- 6. Search_path fijo en el resto de funciones marcadas por el linter, sin
--    cambiar su comportamiento.
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.get_user_role() SET search_path = public;
ALTER FUNCTION public.get_available_slots(uuid, date, integer) SET search_path = public;
ALTER FUNCTION public.compute_booking_end() SET search_path = public;

-- 7. Extensiones fuera del schema public (mismo patrón ya usado para
--    uuid-ossp) — los índices/constraints ya creados (idx_users_full_name_trgm,
--    no_overlapping_bookings) siguen funcionando: Postgres re-liga las
--    referencias internas al mover el schema de la extensión.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION btree_gist SET SCHEMA extensions;
