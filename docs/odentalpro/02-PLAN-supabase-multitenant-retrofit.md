# Plan 02 — Retrofit multi-tenant sobre el Supabase de producción (ZM Lash & Nails → GeemaStudio)

> ℹ️ **Nota de alineación (23-jul-2026)**: este plan es sobre el retrofit multi-tenant de **GeemaStudio** (proyecto Supabase de ZM Lash & Nails), no de OdentalPro — se conserva aquí solo como antecedente referenciado por [`03-PLAN-odentalpro-apps-dedicadas.md`](03-PLAN-odentalpro-apps-dedicadas.md). **No fue implementado literal**: el schema actual de `packages/shared-schema` usa una tabla `tenant_settings` (no la tabla `tenants` + columnas `tenant_id` en 24 tablas que propone este documento) — ver `docs/geemastudio/ROADMAP.md` para el estado real del multi-tenant de GeemaStudio. **OdentalPro no hereda este plan**: corre en Supabase propio, multi-tenant nativo desde la migración 001 (sin retrofit que arrastrar), según sección 2 de `03-PLAN`.

## ⚠️ Esto toca producción real. Leer antes de escribir código.

Auditado en vivo vía MCP (22 julio 2026): 249 `clients`, 144 `appointments`, 137 `payments`, 2,134 `wa_messages`, bot de WhatsApp con IA activo, facturación de Anthropic trackeada en tiempo real. **Ninguna migración de este plan se ejecuta contra `main` sin pasar primero por una rama de desarrollo de Supabase (Pro plan, feature de branching).**

## Clasificación de las 27 tablas del schema `public`

Esto es lo primero que Cursor necesita entender bien — no todas las tablas se tratan igual.

### Grupo A — Tenant-scoped (requieren `tenant_id`, 22 tablas)

Datos del negocio del salón. Cada fila pertenece a un salón específico.

```
clients, employees, appointments, appointment_services, appointment_verifications,
services, service_categories, service_portfolio_images, inventory_items, payments,
whatsapp_sessions, wa_messages, wa_error_log, ai_usage_log,
promotions, promotion_items, packs, promo_broadcasts, promo_broadcast_items,
waba_config, waba_pricing_daily, waba_pricing_sync_log,
salon_holidays, profiles, push_tokens
```

### Grupo B — Global (NO llevan `tenant_id`, 2 tablas)

```
anthropic_billing_snapshots   -- costo agregado de TU cuenta Anthropic completa, cruza todos los tenants
app_config                    -- revisar contenido antes de decidir (solo 2 filas) — probablemente config de la app, no del salón
```

**Acción para Cursor sobre `app_config`**: antes de clasificarla, hacer `SELECT * FROM app_config` y confirmar si las 2 filas son configuración a nivel de plataforma (global) o configuración específica de ZM Lash (tenant-scoped). No asumir.

## Fase A — Preparación (cero downtime, reversible)

```sql
-- 1. Tabla de tenants
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  business_type text not null default 'beauty_salon',
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

insert into public.tenants (slug, name, business_type)
values ('zm-lash-nails', 'ZM Lash & Nails', 'beauty_salon');

-- 2. Agregar tenant_id NULLABLE a las 22 tablas del Grupo A (ejemplo con las de mayor volumen,
--    repetir patrón para las 22)
alter table public.clients add column tenant_id uuid references public.tenants(id);
alter table public.appointments add column tenant_id uuid references public.tenants(id);
alter table public.employees add column tenant_id uuid references public.tenants(id);
alter table public.payments add column tenant_id uuid references public.tenants(id);
alter table public.services add column tenant_id uuid references public.tenants(id);
alter table public.service_categories add column tenant_id uuid references public.tenants(id);
alter table public.inventory_items add column tenant_id uuid references public.tenants(id);
alter table public.whatsapp_sessions add column tenant_id uuid references public.tenants(id);
alter table public.appointment_services add column tenant_id uuid references public.tenants(id);
alter table public.appointment_verifications add column tenant_id uuid references public.tenants(id);
alter table public.promotions add column tenant_id uuid references public.tenants(id);
alter table public.packs add column tenant_id uuid references public.tenants(id);
alter table public.promotion_items add column tenant_id uuid references public.tenants(id);
alter table public.promo_broadcasts add column tenant_id uuid references public.tenants(id);
alter table public.promo_broadcast_items add column tenant_id uuid references public.tenants(id);
alter table public.wa_messages add column tenant_id uuid references public.tenants(id);
alter table public.wa_error_log add column tenant_id uuid references public.tenants(id);
alter table public.ai_usage_log add column tenant_id uuid references public.tenants(id);
alter table public.waba_config add column tenant_id uuid references public.tenants(id);
alter table public.waba_pricing_daily add column tenant_id uuid references public.tenants(id);
alter table public.waba_pricing_sync_log add column tenant_id uuid references public.tenants(id);
alter table public.salon_holidays add column tenant_id uuid references public.tenants(id);
alter table public.profiles add column tenant_id uuid references public.tenants(id);
alter table public.push_tokens add column tenant_id uuid references public.tenants(id);
alter table public.service_portfolio_images add column tenant_id uuid references public.tenants(id);

-- 3. Backfill: en este momento el 100% de las filas pertenece a ZM Lash & Nails
do $$
declare v_tenant_id uuid;
begin
  select id into v_tenant_id from public.tenants where slug = 'zm-lash-nails';

  update public.clients set tenant_id = v_tenant_id;
  update public.appointments set tenant_id = v_tenant_id;
  update public.employees set tenant_id = v_tenant_id;
  update public.payments set tenant_id = v_tenant_id;
  update public.services set tenant_id = v_tenant_id;
  update public.service_categories set tenant_id = v_tenant_id;
  update public.inventory_items set tenant_id = v_tenant_id;
  update public.whatsapp_sessions set tenant_id = v_tenant_id;
  update public.appointment_services set tenant_id = v_tenant_id;
  update public.appointment_verifications set tenant_id = v_tenant_id;
  update public.promotions set tenant_id = v_tenant_id;
  update public.packs set tenant_id = v_tenant_id;
  update public.promotion_items set tenant_id = v_tenant_id;
  update public.promo_broadcasts set tenant_id = v_tenant_id;
  update public.promo_broadcast_items set tenant_id = v_tenant_id;
  update public.wa_messages set tenant_id = v_tenant_id;
  update public.wa_error_log set tenant_id = v_tenant_id;
  update public.ai_usage_log set tenant_id = v_tenant_id;
  update public.waba_config set tenant_id = v_tenant_id;
  update public.waba_pricing_daily set tenant_id = v_tenant_id;
  update public.waba_pricing_sync_log set tenant_id = v_tenant_id;
  update public.salon_holidays set tenant_id = v_tenant_id;
  update public.profiles set tenant_id = v_tenant_id;
  update public.push_tokens set tenant_id = v_tenant_id;
  update public.service_portfolio_images set tenant_id = v_tenant_id;
end $$;

-- 4. Solo después de confirmar 0 filas NULL en cada tabla: endurecer
-- (correr por tabla, uno por uno, verificando entre cada uno)
-- select count(*) from public.clients where tenant_id is null;  -- debe dar 0
alter table public.clients alter column tenant_id set not null;
create index idx_clients_tenant_id on public.clients(tenant_id);
-- repetir alter + index para las 24 tablas restantes del Grupo A
```

**Nota sobre `whatsapp_sessions`**: su PK es `phone`, no `id`. Con multi-tenant, dos salones distintos podrían eventualmente tener clientas con el mismo número si comparten zona — a futuro el PK real debería ser compuesto `(tenant_id, phone)`. Con un solo tenant hoy no es urgente, pero dejarlo anotado para cuando exista el segundo salón.

## Fase B — RLS

Las 27 tablas ya tienen RLS activo — es una ventaja, no hay que activarlo desde cero. El patrón es extender cada policy existente, no reemplazarla de golpe:

```sql
-- Patrón por tabla (ejemplo con clients — repetir razonamiento, no el SQL literal,
-- porque cada tabla puede tener policies distintas hoy)
create policy "tenant_isolation_clients" on public.clients
  for all
  using (tenant_id = (current_setting('app.tenant_id', true))::uuid)
  with check (tenant_id = (current_setting('app.tenant_id', true))::uuid);
```

**Antes de escribir las policies nuevas**: Cursor debe hacer `select * from pg_policies where schemaname = 'public'` para ver las policies actuales de cada una de las 22 tablas del Grupo A y decidir si la nueva policy de tenant se agrega como condición adicional (AND) a la existente o como policy separada. No hay una sola respuesta — depende de qué esté haciendo cada policy hoy (ej. `profiles` probablemente ya filtra por `auth.uid()`, esa lógica no se toca, solo se le suma el filtro de tenant).

## Fase C — Capa de aplicación

- `packages/shared-schema/src/schema.ts` (Drizzle): agregar `tenantId` a cada tabla del Grupo A, tipado como FK a una nueva tabla `tenants` en el schema de Drizzle.
- `packages/tenant-config`: construir el primer preset real (`zm-lash-nails`) a partir de la configuración viva en `waba_config`, `service_categories` y `services` — no inventar un preset genérico "salón tipo" sin datos reales de respaldo.
- Toda query del server (`apps/geemastudio-server`) y del cliente (`apps/geemastudio-mobile`, `apps/geemastudio-web`) necesita setear `app.tenant_id` en la sesión de Postgres al conectar, o pasar `tenant_id` explícito en cada query si no se usa `current_setting`.

## Fase D — Validación con Supabase Branching antes de tocar `main`

Ya que el plan es pagar Pro: usar la feature de **branching** para crear una rama de desarrollo del proyecto real, correr ahí las Fases A y B completas, y confirmar que:

1. El bot de WhatsApp sigue respondiendo correctamente (probar un flujo completo de reserva).
2. El dashboard de `geemastudio-web` sigue mostrando las 249 clientas y 144 citas sin pérdida de datos.
3. Las Edge Functions (`ai_usage_log`, `anthropic_billing_snapshots`, `waba_pricing_daily`) siguen insertando correctamente con service role.

Solo después de una validación limpia en la rama, aplicar a `main` con una ventana de mantenimiento corta (avisar a Vanessa/staff con anticipación, dado que el bot está en uso activo).
