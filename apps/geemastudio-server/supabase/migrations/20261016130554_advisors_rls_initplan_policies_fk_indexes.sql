-- Advisors de Supabase (16-oct-2026): políticas que evaluaban auth.uid() por fila,
-- políticas permisivas duplicadas en SELECT y FKs sin índice. Mismo acceso que antes.

-- 1) auth.uid() → (select auth.uid()): se evalúa una vez por consulta.
alter policy look_preview_styles_select_auth on public.look_preview_styles
  using (tenant_id = coalesce((select p.tenant_id from public.profiles p where p.id = (select auth.uid())), 'zm-lash-nails'));
alter policy look_preview_orders_select_auth on public.look_preview_orders
  using (tenant_id = coalesce((select p.tenant_id from public.profiles p where p.id = (select auth.uid())), 'zm-lash-nails'));
alter policy look_preview_results_select_auth on public.look_preview_results
  using (tenant_id = coalesce((select p.tenant_id from public.profiles p where p.id = (select auth.uid())), 'zm-lash-nails'));
alter policy admins_select_waba_account_event_log on public.waba_account_event_log
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.role = 'dev' or (p.role = 'owner' and p.tenant_id = waba_account_event_log.tenant_id))
  ));

-- 2) Las políticas FOR ALL también cubrían SELECT y se sumaban a la de lectura.
--    Se separan en insert/update/delete con la misma condición.
drop policy service_portfolio_images_all_admin on public.service_portfolio_images;
create policy service_portfolio_images_insert_admin on public.service_portfolio_images
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  );
create policy service_portfolio_images_update_admin on public.service_portfolio_images
  for update to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  );
create policy service_portfolio_images_delete_admin on public.service_portfolio_images
  for delete to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  );

drop policy tenant_waba_numbers_admin_write on public.tenant_waba_numbers;
create policy tenant_waba_numbers_admin_insert on public.tenant_waba_numbers
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  );
create policy tenant_waba_numbers_admin_update on public.tenant_waba_numbers
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  )
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  );
create policy tenant_waba_numbers_admin_delete on public.tenant_waba_numbers
  for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['dev', 'owner']))
    and tenant_id = public.current_tenant_id()
  );

-- 3) Índices para las FKs sin índice.
create index if not exists idx_employee_coverages_covered_employee_id on public.employee_coverages (covered_employee_id);
create index if not exists idx_employee_coverages_covering_employee_id on public.employee_coverages (covering_employee_id);
create index if not exists idx_employee_services_service_id on public.employee_services (service_id);
create index if not exists idx_employee_time_off_employee_id on public.employee_time_off (employee_id);
create index if not exists idx_employee_work_hours_employee_id on public.employee_work_hours (employee_id);
create index if not exists idx_inventory_movements_created_by on public.inventory_movements (created_by);
create index if not exists idx_look_preview_orders_client_id on public.look_preview_orders (client_id);
create index if not exists idx_look_preview_results_tenant_id on public.look_preview_results (tenant_id);
create index if not exists idx_meta_ads_sync_log_tenant_id on public.meta_ads_sync_log (tenant_id);
create index if not exists idx_operational_expenses_created_by on public.operational_expenses (created_by);
create index if not exists idx_product_orders_client_id on public.product_orders (client_id);
create index if not exists idx_product_orders_created_by on public.product_orders (created_by);
create index if not exists idx_product_orders_payment_id on public.product_orders (payment_id);
create index if not exists idx_tenants_plan_code on public.tenants (plan_code);
