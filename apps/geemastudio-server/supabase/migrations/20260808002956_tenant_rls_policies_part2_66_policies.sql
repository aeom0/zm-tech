-- Plan 02 Fase C — Parte 2/2
-- DROP + CREATE de las 66 policies (patron A/B/C), filtrando por tenant_id = current_tenant_id()
-- Patron D (app_config, anthropic_billing_snapshots) NO se toca.
-- Precondicion: Auth Hook custom_access_token_hook ya activo en prod (confirmado).

DROP POLICY IF EXISTS "Appointments modify staff and admin" ON public.appointments;
CREATE POLICY "Appointments modify staff and admin" ON public.appointments
  USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['staff'::text, 'dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['staff'::text, 'dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Clients delete staff and admin" ON public.clients;
CREATE POLICY "Clients delete staff and admin" ON public.clients
  FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['staff'::text, 'dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Clients insert staff and admin" ON public.clients;
CREATE POLICY "Clients insert staff and admin" ON public.clients
  FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['staff'::text, 'dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Clients select staff and admin" ON public.clients;
CREATE POLICY "Clients select staff and admin" ON public.clients
  FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['staff'::text, 'dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Clients update staff and admin" ON public.clients;
CREATE POLICY "Clients update staff and admin" ON public.clients
  FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['staff'::text, 'dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['staff'::text, 'dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Employees delete admin" ON public.employees;
CREATE POLICY "Employees delete admin" ON public.employees
  FOR DELETE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Employees insert admin" ON public.employees;
CREATE POLICY "Employees insert admin" ON public.employees
  FOR INSERT WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Employees select authenticated" ON public.employees;
CREATE POLICY "Employees select authenticated" ON public.employees
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Employees update admin" ON public.employees;
CREATE POLICY "Employees update admin" ON public.employees
  FOR UPDATE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Inventory admin only" ON public.inventory_items;
CREATE POLICY "Inventory admin only" ON public.inventory_items
  USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Payments delete admin" ON public.payments;
CREATE POLICY "Payments delete admin" ON public.payments
  FOR DELETE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Payments insert admin" ON public.payments;
CREATE POLICY "Payments insert admin" ON public.payments
  FOR INSERT WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Payments select admin or staff own" ON public.payments;
CREATE POLICY "Payments select admin or staff own" ON public.payments
  FOR SELECT USING ((((public.is_admin() OR (EXISTS ( SELECT 1
   FROM (public.appointments a
     JOIN public.profiles p ON (((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'staff'::text) AND (p.employee_id IS NOT NULL) AND ((p.employee_id)::text = (a.employee_id)::text))))
  WHERE ((a.id)::text = (payments.appointment_id)::text))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Payments update admin" ON public.payments;
CREATE POLICY "Payments update admin" ON public.payments
  FOR UPDATE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Profiles select own or admin" ON public.profiles;
CREATE POLICY "Profiles select own or admin" ON public.profiles
  FOR SELECT USING (((((id = ( SELECT auth.uid() AS uid)) OR public.is_admin())) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Profiles update own or admin" ON public.profiles;
CREATE POLICY "Profiles update own or admin" ON public.profiles
  FOR UPDATE USING (((((id = ( SELECT auth.uid() AS uid)) OR public.is_admin())) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((((id = ( SELECT auth.uid() AS uid)) OR public.is_admin())) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcast items delete admin" ON public.promo_broadcast_items;
CREATE POLICY "Promo broadcast items delete admin" ON public.promo_broadcast_items
  FOR DELETE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcast items insert admin" ON public.promo_broadcast_items;
CREATE POLICY "Promo broadcast items insert admin" ON public.promo_broadcast_items
  FOR INSERT WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcast items select admin" ON public.promo_broadcast_items;
CREATE POLICY "Promo broadcast items select admin" ON public.promo_broadcast_items
  FOR SELECT USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcast items update admin" ON public.promo_broadcast_items;
CREATE POLICY "Promo broadcast items update admin" ON public.promo_broadcast_items
  FOR UPDATE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcasts delete admin" ON public.promo_broadcasts;
CREATE POLICY "Promo broadcasts delete admin" ON public.promo_broadcasts
  FOR DELETE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcasts insert admin" ON public.promo_broadcasts;
CREATE POLICY "Promo broadcasts insert admin" ON public.promo_broadcasts
  FOR INSERT WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcasts select admin" ON public.promo_broadcasts;
CREATE POLICY "Promo broadcasts select admin" ON public.promo_broadcasts
  FOR SELECT USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Promo broadcasts update admin" ON public.promo_broadcasts;
CREATE POLICY "Promo broadcasts update admin" ON public.promo_broadcasts
  FOR UPDATE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Salon holidays delete admin" ON public.salon_holidays;
CREATE POLICY "Salon holidays delete admin" ON public.salon_holidays
  FOR DELETE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Salon holidays insert admin" ON public.salon_holidays;
CREATE POLICY "Salon holidays insert admin" ON public.salon_holidays
  FOR INSERT WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Salon holidays select authenticated" ON public.salon_holidays;
CREATE POLICY "Salon holidays select authenticated" ON public.salon_holidays
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Salon holidays update admin" ON public.salon_holidays;
CREATE POLICY "Salon holidays update admin" ON public.salon_holidays
  FOR UPDATE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Service categories delete admin" ON public.service_categories;
CREATE POLICY "Service categories delete admin" ON public.service_categories
  FOR DELETE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Service categories insert admin" ON public.service_categories;
CREATE POLICY "Service categories insert admin" ON public.service_categories
  FOR INSERT WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Service categories select authenticated" ON public.service_categories;
CREATE POLICY "Service categories select authenticated" ON public.service_categories
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Service categories update admin" ON public.service_categories;
CREATE POLICY "Service categories update admin" ON public.service_categories
  FOR UPDATE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Services delete admin" ON public.services;
CREATE POLICY "Services delete admin" ON public.services
  FOR DELETE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Services insert admin" ON public.services;
CREATE POLICY "Services insert admin" ON public.services
  FOR INSERT WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Services select authenticated" ON public.services;
CREATE POLICY "Services select authenticated" ON public.services
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Services update admin" ON public.services;
CREATE POLICY "Services update admin" ON public.services
  FOR UPDATE USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "Whatsapp sessions admin only" ON public.whatsapp_sessions;
CREATE POLICY "Whatsapp sessions admin only" ON public.whatsapp_sessions
  USING (((public.is_admin()) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((public.is_admin()) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "admins_delete_wa_messages" ON public.wa_messages;
CREATE POLICY "admins_delete_wa_messages" ON public.wa_messages
  FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "admins_read_wa_messages" ON public.wa_messages;
CREATE POLICY "admins_read_wa_messages" ON public.wa_messages
  FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "admins_select_wa_action_debounce" ON public.wa_action_debounce;
CREATE POLICY "admins_select_wa_action_debounce" ON public.wa_action_debounce
  FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "admins_select_wa_error_log" ON public.wa_error_log;
CREATE POLICY "admins_select_wa_error_log" ON public.wa_error_log
  FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "admins_select_waba_intent_shadow_log" ON public.waba_intent_shadow_log;
CREATE POLICY "admins_select_waba_intent_shadow_log" ON public.waba_intent_shadow_log
  FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "ai_usage_log_admin_select" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_admin_select" ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "apt_svc_delete" ON public.appointment_services;
CREATE POLICY "apt_svc_delete" ON public.appointment_services
  FOR DELETE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.appointments a
  WHERE (((a.id)::text = (appointment_services.appointment_id)::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'staff'::text) AND (p.employee_id IS NOT NULL) AND ((p.employee_id)::text = (a.employee_id)::text)))))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "apt_svc_insert" ON public.appointment_services;
CREATE POLICY "apt_svc_insert" ON public.appointment_services
  FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.appointments a
  WHERE (((a.id)::text = (appointment_services.appointment_id)::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'staff'::text) AND (p.employee_id IS NOT NULL) AND ((p.employee_id)::text = (a.employee_id)::text)))))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "apt_svc_select" ON public.appointment_services;
CREATE POLICY "apt_svc_select" ON public.appointment_services
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "apt_svc_update" ON public.appointment_services;
CREATE POLICY "apt_svc_update" ON public.appointment_services
  FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.appointments a
  WHERE (((a.id)::text = (appointment_services.appointment_id)::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'staff'::text) AND (p.employee_id IS NOT NULL) AND ((p.employee_id)::text = (a.employee_id)::text)))))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.appointments a
  WHERE (((a.id)::text = (appointment_services.appointment_id)::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
           FROM public.profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'staff'::text) AND (p.employee_id IS NOT NULL) AND ((p.employee_id)::text = (a.employee_id)::text)))))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "owner_dev_all" ON public.appointment_verifications;
CREATE POLICY "owner_dev_all" ON public.appointment_verifications
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['owner'::text, 'dev'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "packs_delete_admin" ON public.packs;
CREATE POLICY "packs_delete_admin" ON public.packs
  FOR DELETE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "packs_insert_admin" ON public.packs;
CREATE POLICY "packs_insert_admin" ON public.packs
  FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "packs_select" ON public.packs;
CREATE POLICY "packs_select" ON public.packs
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "packs_update_admin" ON public.packs;
CREATE POLICY "packs_update_admin" ON public.packs
  FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "promotion_items_delete_admin" ON public.promotion_items;
CREATE POLICY "promotion_items_delete_admin" ON public.promotion_items
  FOR DELETE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "promotion_items_insert_admin" ON public.promotion_items;
CREATE POLICY "promotion_items_insert_admin" ON public.promotion_items
  FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "promotion_items_select" ON public.promotion_items;
CREATE POLICY "promotion_items_select" ON public.promotion_items
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "promotion_items_update_admin" ON public.promotion_items;
CREATE POLICY "promotion_items_update_admin" ON public.promotion_items
  FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "promotions_delete_admin" ON public.promotions;
CREATE POLICY "promotions_delete_admin" ON public.promotions
  FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['owner'::text, 'dev'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "promotions_insert_admin" ON public.promotions;
CREATE POLICY "promotions_insert_admin" ON public.promotions
  FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['owner'::text, 'dev'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "promotions_read_all" ON public.promotions;
CREATE POLICY "promotions_read_all" ON public.promotions
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "promotions_update_admin" ON public.promotions;
CREATE POLICY "promotions_update_admin" ON public.promotions
  FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['owner'::text, 'dev'::text]))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['owner'::text, 'dev'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "service_portfolio_images_all_admin" ON public.service_portfolio_images;
CREATE POLICY "service_portfolio_images_all_admin" ON public.service_portfolio_images
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "service_portfolio_images_select" ON public.service_portfolio_images;
CREATE POLICY "service_portfolio_images_select" ON public.service_portfolio_images
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "user_own_token" ON public.push_tokens;
CREATE POLICY "user_own_token" ON public.push_tokens
  USING ((( SELECT auth.uid() AS uid) = user_id) AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "waba_config_admin_only" ON public.waba_config;
CREATE POLICY "waba_config_admin_only" ON public.waba_config
  USING (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "waba_pricing_daily_admin_select" ON public.waba_pricing_daily;
CREATE POLICY "waba_pricing_daily_admin_select" ON public.waba_pricing_daily
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));

DROP POLICY IF EXISTS "waba_pricing_sync_log_admin_select" ON public.waba_pricing_sync_log;
CREATE POLICY "waba_pricing_sync_log_admin_select" ON public.waba_pricing_sync_log
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['dev'::text, 'owner'::text]))))) AND tenant_id = public.current_tenant_id()));
