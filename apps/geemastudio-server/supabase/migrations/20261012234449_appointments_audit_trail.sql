-- Auditoría de citas: quién creó, movió, canceló o borró cada cita.
-- Caso Melanie (12-oct-2026): dos filas para una reprogramación y sin forma de saber quién las tocó.
create table if not exists public.appointment_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  tenant_id text,
  appointment_id text not null,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  actor_role text,
  actor_uid text,
  client_info text,
  changed_fields text[],
  old_row jsonb,
  new_row jsonb
);

create index if not exists appointment_audit_appt_idx
  on public.appointment_audit (appointment_id, at);
create index if not exists appointment_audit_tenant_at_idx
  on public.appointment_audit (tenant_id, at desc);

comment on table public.appointment_audit is
  'Bitácora de INSERT/UPDATE/DELETE de appointments. Escribe solo el trigger; lee admin del tenant. client_info: x-client-info/user-agent de PostgREST (distingue bot Deno de panel web/mobile).';

create or replace function public.audit_appointments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers jsonb;
  v_claims jsonb;
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select array_agg(n.key order by n.key)
      into v_changed
      from jsonb_each(v_new) n
      where v_old -> n.key is distinct from n.value;
    if v_changed is null then
      return new;
    end if;
    -- Solo lo que cambió (más claro y liviano).
    select jsonb_object_agg(k, v_old -> k) into v_old
      from unnest(v_changed) k;
    select jsonb_object_agg(k, v_new -> k) into v_new
      from unnest(v_changed) k;
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new);
  else
    v_old := to_jsonb(old);
  end if;

  insert into public.appointment_audit (
    tenant_id, appointment_id, op, actor_role, actor_uid, client_info,
    changed_fields, old_row, new_row
  ) values (
    coalesce(case when tg_op = 'DELETE' then old.tenant_id else new.tenant_id end, null),
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    coalesce(v_claims ->> 'role', current_user),
    v_claims ->> 'sub',
    left(
      coalesce(v_headers ->> 'x-client-info', '') || ' | ' ||
      coalesce(v_headers ->> 'user-agent', ''),
      300
    ),
    v_changed,
    v_old,
    v_new
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_appointments on public.appointments;
create trigger trg_audit_appointments
  after insert or update or delete on public.appointments
  for each row execute function public.audit_appointments();

alter table public.appointment_audit enable row level security;

create policy appointment_audit_select on public.appointment_audit
  for select to authenticated
  using (public.is_admin() and tenant_id = public.current_tenant_id());

revoke all on public.appointment_audit from anon, authenticated;
grant select on public.appointment_audit to authenticated;
