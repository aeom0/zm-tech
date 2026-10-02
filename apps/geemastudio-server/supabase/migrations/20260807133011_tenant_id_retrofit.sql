-- =====================================================================
-- Plan 02 — Retrofit tenant_id en ZM Lash & Nails (udelxwwnyivknslueerr)
-- =====================================================================
-- Aditiva y reversible: ADD COLUMN con DEFAULT (nunca NOT NULL sin default),
-- sin ningún DROP. whatsapp_sessions solo gana la columna aquí — la PK
-- compuesta va en una migración aparte, con OK explícito por separado.
--
-- Tenant inicial (backfill): 'zm-lash-nails'
-- Tipo elegido: text (sin FK a tabla `tenants` todavía — no existe aún)
-- =====================================================================

-- GRUPO 1 — Core operativo
alter table public.appointments             add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.clients                  add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.employees                add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.profiles                 add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.appointment_services     add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.appointment_verifications add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.payments                 add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.push_tokens              add column if not exists tenant_id text not null default 'zm-lash-nails';

-- GRUPO 2 — Catálogo (servicios, packs, promos, inventario)
alter table public.service_categories       add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.services                 add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.service_portfolio_images add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.inventory_items          add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.promotions               add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.promotion_items          add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.packs                    add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.promo_broadcasts         add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.promo_broadcast_items    add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.salon_holidays           add column if not exists tenant_id text not null default 'zm-lash-nails';

-- GRUPO 3 — WhatsApp / bot (excepto whatsapp_sessions, ver abajo)
alter table public.wa_messages              add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.wa_error_log             add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.wa_action_debounce       add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.waba_config              add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.waba_pricing_daily       add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.waba_pricing_sync_log    add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.waba_intent_shadow_log   add column if not exists tenant_id text not null default 'zm-lash-nails';
alter table public.ai_usage_log             add column if not exists tenant_id text not null default 'zm-lash-nails';

-- Índices
create index if not exists idx_appointments_tenant_id             on public.appointments (tenant_id);
create index if not exists idx_clients_tenant_id                  on public.clients (tenant_id);
create index if not exists idx_employees_tenant_id                on public.employees (tenant_id);
create index if not exists idx_profiles_tenant_id                 on public.profiles (tenant_id);
create index if not exists idx_appointment_services_tenant_id     on public.appointment_services (tenant_id);
create index if not exists idx_appointment_verif_tenant_id        on public.appointment_verifications (tenant_id);
create index if not exists idx_payments_tenant_id                 on public.payments (tenant_id);
create index if not exists idx_push_tokens_tenant_id              on public.push_tokens (tenant_id);
create index if not exists idx_service_categories_tenant_id       on public.service_categories (tenant_id);
create index if not exists idx_services_tenant_id                 on public.services (tenant_id);
create index if not exists idx_service_portfolio_tenant_id        on public.service_portfolio_images (tenant_id);
create index if not exists idx_inventory_items_tenant_id          on public.inventory_items (tenant_id);
create index if not exists idx_promotions_tenant_id               on public.promotions (tenant_id);
create index if not exists idx_promotion_items_tenant_id          on public.promotion_items (tenant_id);
create index if not exists idx_packs_tenant_id                    on public.packs (tenant_id);
create index if not exists idx_promo_broadcasts_tenant_id         on public.promo_broadcasts (tenant_id);
create index if not exists idx_promo_broadcast_items_tenant_id    on public.promo_broadcast_items (tenant_id);
create index if not exists idx_salon_holidays_tenant_id           on public.salon_holidays (tenant_id);
create index if not exists idx_wa_messages_tenant_id              on public.wa_messages (tenant_id);
create index if not exists idx_wa_error_log_tenant_id             on public.wa_error_log (tenant_id);
create index if not exists idx_wa_action_debounce_tenant_id       on public.wa_action_debounce (tenant_id);
create index if not exists idx_waba_config_tenant_id              on public.waba_config (tenant_id);
create index if not exists idx_waba_pricing_daily_tenant_id       on public.waba_pricing_daily (tenant_id);
create index if not exists idx_waba_pricing_sync_log_tenant_id    on public.waba_pricing_sync_log (tenant_id);
create index if not exists idx_waba_intent_shadow_log_tenant_id   on public.waba_intent_shadow_log (tenant_id);
create index if not exists idx_ai_usage_log_tenant_id             on public.ai_usage_log (tenant_id);

-- whatsapp_sessions: solo columna, PK compuesta va aparte con OK explícito
alter table public.whatsapp_sessions add column if not exists tenant_id text not null default 'zm-lash-nails';

