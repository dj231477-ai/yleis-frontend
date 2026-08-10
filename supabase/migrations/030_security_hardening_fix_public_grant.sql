-- Corrige la migración 029: REVOKE ... FROM anon/authenticated no alcanza
-- porque Postgres otorga EXECUTE al pseudo-rol PUBLIC por defecto al crear
-- una función, y todo rol (incluido anon) hereda de PUBLIC salvo que se
-- revoque explícitamente ahí. service_role y (donde corresponde)
-- authenticated ya tienen su propio GRANT explícito independiente de
-- PUBLIC (verificado vía pg_proc.proacl), así que revocar PUBLIC no les
-- quita acceso.

REVOKE EXECUTE ON FUNCTION public.accept_express_session(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_plan(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_teacher_verification(uuid, numeric, text, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_teacher_rating() FROM PUBLIC;
