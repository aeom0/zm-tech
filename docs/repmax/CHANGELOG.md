# Changelog — RepMAX

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

Roadmap: [ROADMAP.md](./ROADMAP.md). Plan API ML (descartado ops MLV): [plans/04-PLAN-catalogo-mercadolibre.md](./plans/04-PLAN-catalogo-mercadolibre.md). Plan multicanal (vigente): [plans/05-PLAN-catalogo-multicanal-sin-oauth.md](./plans/05-PLAN-catalogo-multicanal-sin-oauth.md).

---

## [Unreleased]

### Añadido
- **Tasas BCV/USDT en vivo (plan 08)** — paquete compartido `@zmtech/tasas` (`packages/tasas`, `main`/`exports` a `.ts` directo, sin build): tipos, `calcularSpreadInfo`, calculadoras de margen (sin caller aún), `logicaBCV.ts`, providers `bcv.today`/`usdt.com.ve`, resolver con fallback, hook web `useTasasDuales` (`localStorage`). Tablas `hub_tasas_bcv`/`hub_tasas_usdt` aplicadas en el hub (`docs/hub/supabase/migrations/20260818120000_hub_tasas_cambio.sql`, RLS `SELECT` público / escritura solo `service_role`). `repmax-web`: primer `app/api/` del proyecto — `GET /api/bcv/tasa` (público) y crons `guardar-tasa-{bcv,usdt}-diario` (`CRON_SECRET`, `vercel.json`, 4:30/4:35 UTC). `AuthContext.tsx` web resuelve tasa BCV en vivo o manual (`repmax_stores.usar_tasa_manual`, migración `20260818130000_repmax_stores_tasa_manual`), con fallback si falla el fetch. Mobile: hook `useTasaCambio` (lee las tablas del hub directo por Supabase, cache `AsyncStorage`), `saleService.ts` sin el `?? 36.50` hardcodeado, `PaymentScreen.tsx` usa la tasa efectiva, `ExchangeRateScreen.tsx` con switch manual/vivo + card de spread en vivo. Plan: [plans/08-PLAN-tasas-bcv-usdt.md](./plans/08-PLAN-tasas-bcv-usdt.md).
- **OTA CI (GitHub Actions)** — `.github/workflows/repmax-ota.yml`: push a `main` con cambios en `repmax-mobile` / `repmax-schema` publica `eas update` al canal `preview`. Production vía `workflow_dispatch`. Requiere secretos `EXPO_TOKEN` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **POS de escritorio (repmax-web, plan 07 fase 1)** — `/dashboard/pos`: búsqueda/grid de productos, carrito, cobro vía RPC `repmax_create_sale_with_items` (`p_cashier_id` = `repmax_store_users.id`), banner no bloqueante si no hay caja abierta, gating por rol (`owner`/`cashier`; `inventory` sin acceso). Escaneo por lector HID: `useBarcodeScan()` en `lib/hardware/services/barcodeService.ts`, agrega al carrito por match de `barcode`/`part_number`. Entrada "Venta" en sidebar del dashboard.
- **Historial de ventas enriquecido (repmax-web)** — `/dashboard/sales` muestra título del ítem, modelo de vehículo, número de parte y foto de producto por línea de venta (antes solo cantidad/monto).
- **Onboarding mobile — pantalla inicial de auth** — `ONB-00-Auth` (dark + light) en `design/onboarding.pen`, cableado como `OnboardingAuthChoice.tsx`: "Crear cuenta" entra al wizard (país→vehículo→negocio→tema→preview); "Iniciar sesión" va directo a `LoginScreen`; "Explorar con demo" preserva el login demo. `OnboardingDecision` se retira del código. El artboard `ONB-01-Splash` sale del `.pen` (el cold start queda nativo). El paso Splash del prototipo HTML se **reserva** para un splash de sesión con el logo que suba el tenant (post-login), no para el onboarding de primera vez.
- **Catálogo starter al registrar** — RPC `repmax_seed_starter_catalog` (hub `20260817222347`, filename local alineado). 6 productos según `vehicle_focus`, sin fotos, idempotente. Mobile: `catalogSeedService` (1 reintento, no bloquea el registro) desde `AuthContext.register()`.
- **Plan 06 (ops)** — proyecto Vercel `repmax-web` en producción (`https://repmax-web-taupe.vercel.app`). CNAME `*` + cert wildcard `*.zmtechdev.com` (Let's Encrypt). Apex `zmtech` no se tocó.
- **Plan 06 (código)** — vitrina por hostname: `{slug}.zmtechdev.com` / `{slug}.localhost` reescribe a `/{slug}` (el path `/{slug}` sigue). QR y WhatsApp a subdominio solo con `NEXT_PUBLIC_VITRINA_SUBDOMAINS=1`. Slugs reservados al registrar.
- **Escaner de barras / QR** — POS (agregar al carrito), inventario (crear o +1 stock) y ficha (asignar código). Columna `repmax_products.barcode` única por tienda. Migración `20260816220000`.
- **E2 plan 05** — ficha mobile: título sugerido ML, selector categoría manual, campo color; migración `repmax_products.color`; export CSV con color.
- **Landing ML honesta** — copy repmax-web + zm-tech landing sin prometer sync en vivo (`ML_API_ENABLED = false`).
- **E6 plan 05** — POS mobile: tras venta, banner en recibo si producto está en ML (`published_manual` / `published`); listing → `needs_update`; badge “Actualizar ML” en inventario.
- **E5 plan 05** — panel web: link vitrina copiable + QR, filtros ML/vitrina en inventario, fotos y badges.
- **E4 plan 05** — vitrina web: página `/[slug]/p/[id]`, cards enlazadas, galería fotos, CTA WhatsApp con n. parte + link.
- **Migración E1 aplicada** — `ml_publish_intent` + estados manual en `repmax_ml_listings` (hub).
- **E1 plan 05** — `ml_publish_intent`, checklist ML, badges y filtros inventario, card ML honesta en Mi tienda.
- **Plan 05 — catálogo multicanal sin OAuth** — vitrina + POS + export ML manual; track API del plan 04 congelado (MLV sin DevCenter/API, #475453897).
- **MercadoLibre impl. 1 — category mapping** — tabla `repmax_ml_listings` (1:1 opcional, aplicada en hub `20260811222700`), contrato `@repmax/repmax-schema/mlListing`, `mlCategoryService` + `useMlCategoryPrediction`. Mapper PART_NUMBER/MPN → `missing` required.
- **MercadoLibre impl. 2 — OAuth (código)** — tabla `repmax_ml_connections` (SQL **no aplicada**), Edge `ml-oauth-start` / `ml-oauth-callback` / `ml-token-refresh` / `ml-predict-category`, `mlAuthService` + `useMercadoLibreConnection`. Card conectar en Mi tienda; switch de ficha gated a cuenta conectada y plan ≠ basic. Tokens solo `service_role`.
- **Catálogo fotos ML-ready (fase A)** — captura 1:1, revisión pass/fail, resize 1200² JPEG, máx. 6 slots, upload a `repmax-products/{store_id}/drafts/`. Switch publicar lista huecos (portada, n. parte, título).
  - Código: `mlPhotoRules.ts`, `productPhotoService`, `PhotoSlotGrid`, `PhotoCaptureScreen`, `PhotoReviewScreen`.
  - Canvas: [`design/catalog.pen`](./design/catalog.pen) · spec [`design/catalog-ux-spec.md`](./design/catalog-ux-spec.md) · guía [`design/ml-fotos.md`](./design/ml-fotos.md).
- Logo oficial MercadoLibre (mismo SVG que landing ZM Tech) en `repmax-web` (`MercadoLibreLogo`) y raster PNG para Pencil.
- EAS Build + OTA en `@aeom0/repmax` (`109768f2-…`): channels `development` / `preview` / `production`, `runtimeVersion` SDK 56, stack nativo APK-ready (`expo-camera`, picker, manipulator, haptics, updates).
- UI mobile responsive phone/tablet (`orientation: default`, safe areas, splits, sidebar) — PR #15.
- Kit de marca REPMAX (wordmark, RM, favicons, íconos) cableado en web y mobile.

### Cambiado
- **MLV sin API confirmado** — Mercado Libre (consulta #475453897): DevCenter/API no operativo en Venezuela. Track OAuth descartado; plan 05 es camino principal. Copy actualizado en mobile, repmax-web, landing ZM Tech y docs.
- Bifurcación ML: plan 05 (multicanal sin OAuth) como producto vigente; plan 04 track API congelado en código (`ML_API_ENABLED = false`).
- Copy de negocio: “Repuestería” → “Repuestos” en onboarding y landing. Enum DB `store_type='repuesteria'` **sin tocar**.
- `productService.create` envía `storeId` (el insert salía sin tienda).
- **Miniaturas en catálogo mobile** — inventario, POS y carrito muestran `photos[0]` (seed o Storage) con `expo-image`; placeholder si no hay portada. Independiente de publicar en ML.

### OTA
- Canal **preview** — 2026-08-12 — grupo [`5fb53a58`](https://expo.dev/accounts/aeom0/projects/repmax/updates/5fb53a58-1dc7-419d-81d3-c62279042752) · runtime `exposdk:56.0.0` · “Catálogo: fotos ML-ready”. Requiere el APK preview ya instalado; reabrir la app.

### Builds nativos
- Android preview APK: [build `707938b9`](https://expo.dev/accounts/aeom0/projects/repmax/builds/707938b9-6da2-46c4-aae8-69a95342b5a3).

---

## Histórico (integración en zm-tech)

Fases 01–03 cerradas. Sin semver de producto todavía; esto es el baseline absorbido.

### Añadido
- Scaffold `repmax-web`, `repmax-mobile`, `@repmax/repmax-schema` (Expo 56 / RN 0.85 / React 19 / TS 6).
- Schema `repmax_*` + RLS + storage + RPC `repmax_create_sale_with_items` en hub `llacowjutjfefboqgfnj`.
- Auth Supabase (web SSR + mobile AuthProvider); onboarding mobile end-to-end (#12).
- Design system onboarding V2 (Pencil, spec, prototipo tap-through).
- Seeds demo versionados + checklist SQL ↔ schema TS (#10).

### Cambiado
- Apps hablan directo con Supabase; Express/JWT y `repmax-server` fuera del workspace (fase 03).
- Repo standalone `aeom0/RepMAX` archivado; docs legacy y proyecto Supabase huérfano eliminados.

### Arreglado
- Registro: `RETURNING` RLS y recursión bootstrap (#13).
- Hardening advisors seguridad/performance (#11).
- AsyncStorage en web + credenciales demo reales (#14).
- Bundle EAS: `index.js`, Metro monorepo, `babel-preset-expo`.
