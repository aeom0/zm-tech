-- Hub ZM Tech — RLS (Fase 1)
-- Proyecto: ZMTech (llacowjutjfefboqgfnj)
-- BORRADOR: no aplicar sin instrucción explícita. Al aplicar, renombrar con timestamp real.

-- ── Helper ───────────────────────────────────────────────────────────────

create function hub_is_member() returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from hub_members where user_id = auth.uid());
$$;

create function hub_is_founder() returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from hub_members
    where user_id = auth.uid() and role = 'founder'
  );
$$;

-- ── RLS deny-by-default: solo miembros, nada para anon ───────────────────

alter table hub_members enable row level security;
alter table hub_clients enable row level security;
alter table hub_projects enable row level security;
alter table hub_contracts enable row level security;

-- hub_members: los miembros se ven entre sí; escritura solo founder
create policy hub_members_select on hub_members
  for select to authenticated using (hub_is_member());
create policy hub_members_write on hub_members
  for all to authenticated using (hub_is_founder()) with check (hub_is_founder());

create policy hub_clients_member_all on hub_clients
  for all to authenticated using (hub_is_member()) with check (hub_is_member());

create policy hub_projects_member_all on hub_projects
  for all to authenticated using (hub_is_member()) with check (hub_is_member());

create policy hub_contracts_member_all on hub_contracts
  for all to authenticated using (hub_is_member()) with check (hub_is_member());

-- ── Inbox de leads: lectura de tablas de la landing ──────────────────────
-- Única excepción cross-producto permitida (solo SELECT, documentada en
-- docs/SUPABASE.md). Política ADITIVA: no modifica las políticas existentes
-- de la landing. Verificar nombres de columnas/políticas reales al aplicar.

create policy contacts_hub_member_read on contacts
  for select to authenticated using (hub_is_member());

create policy quote_leads_hub_member_read on quote_leads
  for select to authenticated using (hub_is_member());

-- Hardening: helpers no ejecutables por anon vía RPC
revoke all on function public.hub_is_member() from public, anon;
revoke all on function public.hub_is_founder() from public, anon;
grant execute on function public.hub_is_member() to authenticated;
grant execute on function public.hub_is_founder() to authenticated;
