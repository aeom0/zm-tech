-- quote_leads: leads del Quote Engine (propuestas manuales + cotizador público)
-- Proyecto: llacowjutjfefboqgfnj
-- NO tocar contacts ni tablas odental_*.

create table if not exists quote_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('manual', 'self-service')),
  slug text,                          -- solo para source='manual', referencia data/quotes/[slug].ts
  cliente_nombre text,
  cliente_contacto text,              -- teléfono o email, opcional
  service_ids jsonb not null,
  subtotal numeric,
  descuento numeric,
  total numeric,
  requiere_contacto_directo boolean not null default false,
  status text not null default 'nuevo' check (status in ('nuevo', 'contactado', 'cerrado', 'perdido'))
);

alter table quote_leads enable row level security;

-- Sin policies para anon/authenticated: solo se escribe vía service role
-- desde el route handler del servidor. Nadie desde el browser puede
-- leer ni escribir esta tabla directamente.
