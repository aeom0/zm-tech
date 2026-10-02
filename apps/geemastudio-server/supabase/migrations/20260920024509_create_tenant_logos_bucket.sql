insert into storage.buckets (id, name, public)
values ('tenant-logos', 'tenant-logos', true)
on conflict (id) do nothing;

create policy "public_read_tenant_logos"
on storage.objects for select
to public
using (bucket_id = 'tenant-logos' and name is not null and name <> '');

create policy "owner_dev_insert_tenant_logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tenant-logos'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = any (array['owner', 'dev'])
  )
);

create policy "owner_dev_update_tenant_logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'tenant-logos'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = any (array['owner', 'dev'])
  )
);

create policy "owner_dev_delete_tenant_logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tenant-logos'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = any (array['owner', 'dev'])
  )
);
