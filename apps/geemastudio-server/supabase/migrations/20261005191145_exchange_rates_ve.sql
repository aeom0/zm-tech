-- Tasas de cambio Venezuela (BCV oficial + USDT/Binance) para tenants VE.
-- Globales (no por tenant): una fila por día, escritas por los crons de
-- geemastudio-web (service_role) con la lógica de @zmtech/tasas.
-- Lectura solo para authenticated (anon no tiene privilegios en public).

create table public.exchange_rates_bcv (
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

create table public.exchange_rates_usdt (
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

comment on table public.exchange_rates_bcv is
  'Tasa BCV oficial diaria (Bs por USD). Escribe solo service_role (cron geemastudio-web).';
comment on table public.exchange_rates_usdt is
  'Tasa USDT/paralelo diaria (Bs por USDT). Escribe solo service_role (cron geemastudio-web).';

alter table public.exchange_rates_bcv enable row level security;
alter table public.exchange_rates_usdt enable row level security;

create policy exchange_rates_bcv_select on public.exchange_rates_bcv
  for select to authenticated using (true);
create policy exchange_rates_usdt_select on public.exchange_rates_usdt
  for select to authenticated using (true);

-- Supabase concede ALL por defecto: dejar solo SELECT a authenticated y nada a anon.
revoke all on public.exchange_rates_bcv, public.exchange_rates_usdt from anon, authenticated;
grant select on public.exchange_rates_bcv, public.exchange_rates_usdt to authenticated;

-- Override por tenant: BCV en vivo salvo que el negocio fije una tasa manual.
alter table public.tenant_settings
  add column usar_tasa_manual boolean not null default false,
  add column tasa_manual_usd_ves numeric(10, 4) check (tasa_manual_usd_ves is null or tasa_manual_usd_ves > 0);

comment on column public.tenant_settings.usar_tasa_manual is
  'true = usar tasa_manual_usd_ves en vez de la BCV en vivo (tenants VE).';
