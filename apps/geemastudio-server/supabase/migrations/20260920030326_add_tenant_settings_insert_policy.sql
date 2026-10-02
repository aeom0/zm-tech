create policy "tenant_settings_insert_admin"
on public.tenant_settings for insert
to authenticated
with check (tenant_slug = current_tenant_id() and is_admin());
