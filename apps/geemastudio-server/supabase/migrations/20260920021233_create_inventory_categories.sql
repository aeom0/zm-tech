create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'zm-lash-nails',
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint inventory_categories_tenant_key_unique unique (tenant_id, key)
);

create index idx_inventory_categories_tenant_id on public.inventory_categories (tenant_id);

alter table public.inventory_categories enable row level security;

create policy "Inventory categories admin only"
  on public.inventory_categories
  for all
  using (is_admin() and tenant_id = current_tenant_id())
  with check (is_admin() and tenant_id = current_tenant_id());

