-- Hub ZM Tech — tasas de cambio BCV/USDT (compartidas entre productos)
-- Proyecto: ZMTech (llacowjutjfefboqgfnj)
-- APLICADA en producción 2026-08-18.
--
-- Independiente del resto del schema hub_* (hub_members, hub_clients, etc.,
-- aún no aplicado) — estas tablas no tienen FK ni dependen de esos helpers.
-- Escritura solo vía service_role (crons en apps/repmax-web/src/app/api/cron/*),
-- por eso no hay política de INSERT/UPDATE para authenticated/anon.

-- ── Tablas ───────────────────────────────────────────────────────────────

create table hub_tasas_bcv (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  usd numeric(10, 4) not null check (usd > 0),
  fuente text not null check (
    fuente in ('bcv-oficial', 'bcv-today', 'manual', 'emergencia', 'fin-de-semana')
  ),
  es_manual boolean not null default false,
  es_fin_de_semana boolean not null default false,
  notas text,
  created_at timestamptz not null default now()
);

create table hub_tasas_usdt (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  mercado text not null default 'binance',
  usd numeric(10, 4) not null check (usd > 0),
  buy_rate numeric(10, 4),
  sell_rate numeric(10, 4),
  fuente text not null default 'usdt.com.ve',
  notas text,
  created_at timestamptz not null default now(),
  unique (fecha, mercado)
);

comment on table hub_tasas_bcv is
  'Tasa BCV oficial diaria, compartida entre productos VE (RepMAX, OdentalPro, ...). Escritura solo service_role.';
comment on table hub_tasas_usdt is
  'Tasa USDT/paralelo (Binance) diaria, compartida entre productos VE. Escritura solo service_role.';

-- ── RLS: lectura pública, escritura solo service_role ───────────────────

alter table hub_tasas_bcv enable row level security;
alter table hub_tasas_usdt enable row level security;

create policy hub_tasas_bcv_select_public on hub_tasas_bcv
  for select to anon, authenticated using (true);

create policy hub_tasas_usdt_select_public on hub_tasas_usdt
  for select to anon, authenticated using (true);

-- Sin políticas de insert/update/delete para anon/authenticated:
-- service_role bypasea RLS por defecto y es el único escritor (crons).
