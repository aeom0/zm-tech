# Plan 17 — Planes de suscripción conectados (landing, panel web, mobile) + descarga del APK

**Fecha:** 2026-10-02
**Estado:** Fases 1–4 ✅ (2/3-oct-2026); Fase 5 pendiente
**Repos:** `zm-tech` (schema, web, mobile, server). BD: `udelxwwnyivknslueerr`.

## Contexto

Los planes Basic/Pro/Elite solo existen como constante `PLANS` en `apps/geemastudio-web/src/lib/constants.ts` y los consume únicamente `PricingSection` (landing). La tabla `tenants` no tiene plan, trial ni límites, así que panel web y mobile no saben qué plan tiene un negocio. Además, la app solo se distribuye como APK (EAS `preview`/`production` con `buildType: apk`), sin tienda, y no hay un camino claro para que un tenant la descargue.

Objetivo: una sola fuente de verdad en BD para los planes, visible en landing, panel web y mobile, con **avisos** al acercarse o superar límites (sin bloqueo duro), y una página de descarga del APK.

## Decisiones tomadas

- Sin cobro por ahora (fase de prueba). `subscription_status` y `plan_code` se asignan a mano; el checkout queda fuera de alcance.
- Gating **solo con avisos**, nunca bloqueo duro.
- ZM Lash (`zm-lash-nails`) entra con plan **Pro**.
- Límite de sedes: se modela en `plans.max_branches` pero no se aplica hasta que exista `branches` (Plan 16).
- APK: hospedado propio (Supabase Storage + `latest.json`), no GitHub Releases ni link `internal` de EAS.

## Fase 1 — BD (migración, regla 1:1 local=remote)

Aplicar con MCP `apply_migration` y renombrar el archivo local a `<version>_<name>.sql` en el mismo commit; verificar con `list_migrations`.

- Tabla `plans`: `code` (PK: `basic|pro|elite`), `name`, `monthly_price`, `annual_price`, `max_branches`, `max_staff` (null = ilimitado), `waba_conversations` (null = ilimitado), `features jsonb`, `sort_order`, `is_public`. Seed con los valores actuales de `PLANS`.
- RLS de `plans`: lectura pública (anon + authenticated); escritura solo `service_role`.
- `tenants`: agregar `plan_code` (FK → `plans.code`, default `basic`), `billing_cycle` (`monthly|annual`), `trial_ends_at`, `subscription_status` (`trial|active|past_due|canceled`). Backfill: `zm-lash-nails` → `pro`, `active`.
- Vista `tenant_subscription` (o RPC `get_my_subscription()`) que una `tenants` + `plans` filtrando por `current_tenant_id()`, más conteos de uso (empleados activos). Lee solo el tenant del JWT.
- Regenerar tipos con `generate_typescript_types`.

## Fase 2 — Schema compartido (`packages/shared-schema`)

- En `src/schema.ts`/`types.ts`: tablas/tipos `plans` y campos nuevos de `tenants`; tipos `Plan`, `TenantSubscription`.
- En `src/utils/`: `planLimits.ts` con `getPlanLimits(plan)`, `getUsageStatus(usage, limit)` → `ok | near | over` (umbral de aviso 80%) y `hasFeature(plan, key)`. Funciones puras, testeables, usadas por web y mobile.

## Fase 3 — Landing

- `PricingSection.tsx` y `PricingCard.tsx` leen `plans` desde Supabase en un server component (ISR, `revalidate` ~1 h).
- `PLANS` en `constants.ts` queda como fallback si la consulta falla; los precios dejan de editarse en dos lados.
- Ajustar el tipo `Plan` local para mapear desde la fila de BD (conservar `wabaFeatures` en `features`).

## Fase 4 — Panel web y mobile

- Hook `usePlan()` en web (`apps/geemastudio-web/src/hooks/`) y mobile (`apps/geemastudio-mobile/hooks/`), ambos sobre la vista/RPC de Fase 1 y `getUsageStatus`.
- Pantalla "Mi plan": plan actual, estado, fin de trial, barras de uso (empleados, mensajes de servicio WABA) contra límite, comparativo de planes y CTA "Contactar" (sin checkout). Web: `panel/configuracion`. Mobile: `screens/settings/` (junto a `LogoNegocioScreen`).
- Avisos (banner no bloqueante) al llegar a 80% y al superar el límite: en alta de empleados (`panel/personal` / `screens/personal`) y en el panel de WABA. Funciones por plan (Inventario, Finanzas, Comisiones desde Pro): aviso de "disponible en Pro" sin ocultar el acceso.
- Backstop: mostrar el aviso también si el servidor detecta exceso; no se añade bloqueo en RLS en esta fase.
- Reglas: textos en español LATAM neutro, íconos Lucide/vectoriales (sin emojis), capas UI → hooks → services → types.

## Fase 5 — Descarga del APK

- Bucket público `app-releases` en Supabase Storage con `geemastudio-<version>.apk` y `latest.json` (`version`, `url`, `size`, `notes`, `min_supported`).
- Página `/descargar` en geemastudio-web: lee `latest.json`, botón de descarga, QR y guía corta de "instalar apps desconocidas" y Play Protect.
- Mobile: al abrir (junto a `useExpoOTAOnLaunch`) compara su versión con `latest.json` y muestra aviso "Hay una versión nueva" con el link. Los cambios de solo JS siguen por EAS Update.
- Proceso de release documentado: `eas build -p android --profile production` con el mismo keystore de EAS (cambiarlo impide actualizar encima), subir APK, actualizar `latest.json`.
- Seguimiento aparte: mover la anon key de `eas.json` a EAS env vars; evaluar AAB + Play Store (US$25) y Apple Developer cuando haya presupuesto.

## Archivos críticos

- `apps/geemastudio-web/src/lib/constants.ts`, `components/sections/PricingSection.tsx`, `components/ui/PricingCard.tsx`
- `apps/geemastudio-server/supabase/migrations/` (migración nueva)
- `packages/shared-schema/src/{schema.ts,types.ts,utils/}`
- `apps/geemastudio-web/src/app/(shell)/panel/configuracion/`, `apps/geemastudio-mobile/screens/settings/`
- `apps/geemastudio-mobile/hooks/useExpoOTAOnLaunch.ts`, `eas.json`

## Verificación

1. `list_migrations` coincide 1:1 con archivos locales; `execute_sql` confirma seed de `plans` y que `zm-lash-nails` tiene `plan_code = 'pro'`.
2. Test unitario de `getUsageStatus`/`getPlanLimits` (ok/near/over, ilimitado).
3. `pnpm check:types` y `pnpm lint` en shared-schema, web y mobile.
4. `pnpm dev:landing`/`pnpm dev:web`: cambiar precio en `plans` y ver que la landing lo refleja tras revalidar; "Mi plan" muestra Pro para ZM Lash; crear empleados hasta pasar 80% y 100% del límite de un tenant de prueba en Basic y verificar aviso sin bloqueo.
5. `pnpm dev:mobile`: mismo flujo en "Mi plan" y aviso de versión nueva con `latest.json` de prueba.
6. `/descargar` descarga e instala el APK en un Android real; verificar actualización sobre una versión previa (misma firma).
7. `get_advisors` (seguridad) tras la migración: RLS de `plans` y vista sin exposición de otros tenants.

## Fuera de alcance

Cobro/checkout, bloqueo duro por límites, límite de sedes efectivo (depende del Plan 16), iOS/TestFlight, Play Store.

## Decisión WABA (3-oct-2026)

- Unidad del límite: **mensajes de servicio reales del mes** (`SERVICE/FREE_CUSTOMER_SERVICE` en `waba_pricing_daily`; excluye `FREE_ENTRY_POINT`), según el pricing de Meta del 1-oct-2026 (ver `docs/WABA_PRICING_OCT2026_ZM.md`).
- Límites: Basic 300, Pro 1.000, Elite ilimitado (`plans.waba_conversations` conserva el nombre de columna).
- Uso: vista `tenant_waba_usage` (security_invoker; solo owner/dev del tenant ven datos). Se sincroniza con días de retraso: la UI muestra "Datos al <fecha>".
- Pendiente: recalcular precios del add-on (`WABA_ADDON_TIERS`, hoy 50/$4, 200/$12, 500/$24) y `COMPARISON_FEATURES` aún hardcodeado en la landing.
