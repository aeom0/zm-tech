create table public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  employee_id varchar not null,
  period_start date not null,
  period_end date not null,
  amount numeric(10,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index idx_commission_payouts_lookup
  on public.commission_payouts (tenant_id, employee_id, period_start, period_end);

alter table public.commission_payouts enable row level security;

create policy commission_payouts_admin_select on public.commission_payouts
  for select using (is_admin() and tenant_id = current_tenant_id());
create policy commission_payouts_admin_insert on public.commission_payouts
  for insert with check (is_admin() and tenant_id = current_tenant_id());
create policy commission_payouts_admin_delete on public.commission_payouts
  for delete using (is_admin() and tenant_id = current_tenant_id());

