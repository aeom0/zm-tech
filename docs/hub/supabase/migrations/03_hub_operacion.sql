-- Hub ZM Tech — operación: tickets y recordatorios (Fase 2)
-- Proyecto: ZMTech (llacowjutjfefboqgfnj)
-- BORRADOR: no aplicar sin instrucción explícita (y solo al iniciar Fase 2).

-- ── Enums ────────────────────────────────────────────────────────────────

create type hub_ticket_status as enum ('abierto', 'en_progreso', 'esperando_cliente', 'resuelto', 'cerrado');
create type hub_ticket_priority as enum ('baja', 'media', 'alta', 'urgente');
create type hub_ticket_channel as enum ('whatsapp', 'email', 'directo', 'hub');
create type hub_reminder_kind as enum ('dominio', 'token', 'soporte', 'certificado', 'pago', 'otro');
create type hub_reminder_recurrence as enum ('ninguna', 'mensual', 'anual');
create type hub_reminder_status as enum ('pendiente', 'hecho', 'descartado');

-- ── Tablas ───────────────────────────────────────────────────────────────

create table hub_tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references hub_clients (id) on delete cascade,
  project_id uuid references hub_projects (id) on delete set null,
  title text not null,
  description text,
  priority hub_ticket_priority not null default 'media',
  status hub_ticket_status not null default 'abierto',
  channel hub_ticket_channel not null default 'directo',
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hub_reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind hub_reminder_kind not null,
  client_id uuid references hub_clients (id) on delete set null,
  project_id uuid references hub_projects (id) on delete set null,
  due_date date not null,
  recurrence hub_reminder_recurrence not null default 'ninguna',
  status hub_reminder_status not null default 'pendiente',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────────────────

create index hub_tickets_client_idx on hub_tickets (client_id);
create index hub_tickets_status_idx on hub_tickets (status);
create index hub_reminders_due_idx on hub_reminders (due_date) where status = 'pendiente';

-- ── Triggers ─────────────────────────────────────────────────────────────

create trigger hub_tickets_updated_at before update on hub_tickets
  for each row execute function hub_set_updated_at();
create trigger hub_reminders_updated_at before update on hub_reminders
  for each row execute function hub_set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table hub_tickets enable row level security;
alter table hub_reminders enable row level security;

create policy hub_tickets_member_all on hub_tickets
  for all to authenticated using (hub_is_member()) with check (hub_is_member());

create policy hub_reminders_member_all on hub_reminders
  for all to authenticated using (hub_is_member()) with check (hub_is_member());
