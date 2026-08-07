-- Hub ZM Tech — schema inicial (Fase 1)
-- Proyecto: ZMTech (llacowjutjfefboqgfnj)
-- BORRADOR: no aplicar sin instrucción explícita. Al aplicar, renombrar con timestamp real.

-- ── Enums ────────────────────────────────────────────────────────────────

create type hub_member_role as enum ('founder', 'admin', 'viewer');
create type hub_client_status as enum ('lead', 'activo', 'pausado', 'cerrado');
create type hub_client_source as enum ('landing', 'cotizador', 'referido', 'directo');
create type hub_vertical as enum ('beauty', 'inmobiliaria', 'wellness', 'automotriz', 'sports', 'enterprise', 'salud', 'otro');
create type hub_project_type as enum ('web', 'mobile', 'fullstack', 'bot', 'otro');
create type hub_project_status as enum ('propuesta', 'desarrollo', 'produccion', 'pausado', 'archivado');

-- ── Trigger updated_at ───────────────────────────────────────────────────

create function hub_set_updated_at() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Tablas ───────────────────────────────────────────────────────────────

create table hub_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role hub_member_role not null default 'viewer',
  display_name text,
  created_at timestamptz not null default now()
);

create table hub_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  country text,
  city text,
  vertical hub_vertical not null default 'otro',
  status hub_client_status not null default 'lead',
  source hub_client_source not null default 'directo',
  -- refs suaves a tablas de la landing (misma BD, sin FK para no acoplar productos)
  source_contact_id uuid,
  source_quote_lead_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hub_projects (
  id uuid primary key default gen_random_uuid(),
  -- nullable: los productos propios ZM Tech no tienen cliente
  client_id uuid references hub_clients (id) on delete set null,
  name text not null,
  slug text not null unique,
  type hub_project_type not null default 'web',
  status hub_project_status not null default 'desarrollo',
  repo_url text,
  stack text[] not null default '{}',
  production_url text,
  vercel_project text,
  eas_project text,
  supabase_ref text,
  version text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hub_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references hub_clients (id) on delete cascade,
  project_id uuid references hub_projects (id) on delete set null,
  amount_usd numeric(10, 2),
  payment_model text not null default '50/50',
  monthly_support_usd numeric(10, 2),
  support_active boolean not null default false,
  start_date date,
  delivered_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────────────────

create index hub_clients_status_idx on hub_clients (status);
create index hub_clients_source_contact_idx on hub_clients (source_contact_id) where source_contact_id is not null;
create index hub_clients_source_quote_lead_idx on hub_clients (source_quote_lead_id) where source_quote_lead_id is not null;
create index hub_projects_client_idx on hub_projects (client_id);
create index hub_projects_status_idx on hub_projects (status);
create index hub_contracts_client_idx on hub_contracts (client_id);

-- ── Triggers ─────────────────────────────────────────────────────────────

create trigger hub_clients_updated_at before update on hub_clients
  for each row execute function hub_set_updated_at();
create trigger hub_projects_updated_at before update on hub_projects
  for each row execute function hub_set_updated_at();
create trigger hub_contracts_updated_at before update on hub_contracts
  for each row execute function hub_set_updated_at();
