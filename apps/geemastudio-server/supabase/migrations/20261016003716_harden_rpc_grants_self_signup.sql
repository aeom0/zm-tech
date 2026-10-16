-- Con el alta self-service (Plan 19 W13) cualquiera puede tener un usuario
-- authenticated, y la anon key es pública. Cierra las RPC SECURITY DEFINER
-- que no validan quién llama y deja cada función con el rol mínimo.

-- 1) Locks y debounce del webhook WABA: sin chequeo de tenant ni de rol.
--    Solo las Edge Functions (service_role) y pg_cron (postgres) las llaman.
REVOKE EXECUTE ON FUNCTION public.waba_try_phone_lock(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_release_phone_lock(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_claim_action_debounce(text, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_release_action_debounce(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_cleanup_action_debounce() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_mark_dispatch_watermark(text, timestamptz) FROM PUBLIC, anon, authenticated;

-- 2) Funciones de trigger: no se llaman por RPC; el trigger no exige EXECUTE al dispararse.
REVOKE EXECUTE ON FUNCTION public.audit_appointments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_held_slot_on_appointment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_waba_session_after_app_booking() FROM PUBLIC, anon, authenticated;

-- 3) RPC del panel: validan is_admin() + current_tenant_id(); quedan para authenticated.
REVOKE EXECUTE ON FUNCTION public.adjust_inventory_quantity(varchar, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_product_order_paid(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_employee_services(text, boolean, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_employee_work_hours(text, jsonb) FROM PUBLIC, anon;

-- 4) search_path fijo (solo usan funciones de pg_catalog).
ALTER FUNCTION public.wa_phone_variants(text) SET search_path = '';
ALTER FUNCTION public.reset_appointment_reminders_on_date_change() SET search_path = '';
