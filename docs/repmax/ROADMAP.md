# ROADMAP — RepMAX

Estado: **integrado en zm-tech** (fases 01–03 cerradas). Auth y datos vía Supabase compartido `llacowjutjfefboqgfnj`.

El detalle de cambios ya hechos vive en [CHANGELOG.md](./CHANGELOG.md). Este archivo marca hacia dónde va el producto.

## Hecho

- [x] Scaffold en monorepo (`repmax-web`, `repmax-mobile`, `repmax-schema`)
- [x] Alineación de versiones (Expo 56 / RN 0.85 / React 19 / TS 6)
- [x] Schema `repmax_*` + RLS + storage + RPC de venta
- [x] Auth Supabase (web SSR + mobile AuthProvider)
- [x] Retiro de Express/JWT; sin `repmax-server` en workspace
- [x] Limpieza documental (legacy Express / proyecto Supabase huérfano eliminados)
- [x] Repo standalone `aeom0/RepMAX` archivado en GitHub (absorbido en `zm-tech`)
- [x] **Diseño onboarding V2 (Pencil)** — tokens Industrial Dark/Light, componentes reutilizables, artboards dark + light (Auth + wizard; Decision como referencia), flow map + prototipo HTML tap-through (Splash del prototipo reservado para sesión con logo tenant)
  - Canvas: `design/onboarding.pen`
  - Spec: `design/onboarding-ux-spec.md`
  - Prototype: `design/prototype/index.html`
  - Design system: `design-system/`
- [x] **Catálogo fotos ML-ready (fase A)** — captura 1:1, validación 500 px / 1200², Storage `repmax-products`
  - Canvas: `design/catalog.pen`
  - Spec: `design/catalog-ux-spec.md`
  - Guía: `design/ml-fotos.md`
  - Plan: `plans/04-PLAN-catalogo-mercadolibre.md`
- [x] **ML impl. 1 (código + SQL)** — `repmax_ml_listings` + predictor/mapper en mobile
- [x] **ML impl. 2 (código)** — OAuth Edge + connect en settings; ops descartada (MLV sin DevCenter/API, consulta #475453897)
- [x] **Plan 05 E1 (código)** — checklist ML, badges inventario, `ml_publish_intent`, switch manual en ficha
- [x] **Plan 05 E3 (código)** — export CSV ML + marcar exported / published_manual
- [x] **Plan 05 E5 (código)** — dashboard vitrina link + QR + filtros inventario web
- [x] **Plan 05 E6 (código)** — alertas POS post-venta ML + `needs_update`
- [x] **Plan 05 E2 (código)** — categoría manual, título sugerido, color + migración
- [x] Migración `20260816120000_repmax_ml_publish_intent` aplicada en hub
- [x] Migración `20260816200000_repmax_products_color` aplicada en hub
- [x] **Escáner barras/QR (código)** — `repmax_products.barcode`, POS + inventario + ficha mobile; campo en panel web
- [x] EAS / preview mobile (proyecto `@aeom0/repmax`, OTA channels)
- [x] **OTA en GitHub Actions** — `.github/workflows/repmax-ota.yml` (canal `preview` en push a `main`; `production` manual)
- [x] **Plan 06 (código)** — rewrite `{slug}.zmtechdev.com` / `{slug}.localhost` → `/{slug}`; QR gated por `NEXT_PUBLIC_VITRINA_SUBDOMAINS`
- [x] Proyecto Vercel `repmax-web` — prod `https://repmax-web-taupe.vercel.app` (Git `aeom0/zm-tech`, root `apps/repmax-web`)
- [x] **Catálogo starter al registrar** — RPC `repmax_seed_starter_catalog` (hub `20260817222347`) + `catalogSeedService` en `register()`
- [x] **POS de escritorio (plan 07, fase 1)** — `/dashboard/pos` en repmax-web: catálogo/carrito/cobro vía `repmax_create_sale_with_items`, banner de caja no bloqueante, gating por rol, scanner HID (`useBarcodeScan`)
  - Plan: `plans/07-PLAN-integracion-hardware.md`
- [x] **Historial de ventas enriquecido (web)** — `/dashboard/sales` con título, vehículo, número de parte y foto por línea
- [x] **Onboarding mobile — pantalla auth inicial** — `ONB-00-Auth` (dark+light) cableada como `OnboardingAuthChoice`; `OnboardingDecision` retirada del código; splash JS de primera vez retirado del `.pen` (cold start nativo; splash de sesión con logo tenant queda como próximo)
  - Canvas: `design/onboarding.pen` · Spec: `design/onboarding-ux-spec.md`

## Próximo

- [ ] **Splash de sesión con logo del tenant** — al iniciar sesión (no en el onboarding de primera vez), mostrar el logo que la tienda suba. Placeholder hoy: paso Splash en `design/prototype/index.html`. Cold start de marca sigue nativo (`app.json`).
- [ ] Cablear el resto del onboarding mobile end-to-end al high-fi (`apps/repmax-mobile` ↔ design system) — la pantalla auth y el flujo de decisión ya están alineados
- [ ] Extraer / alinear tokens RN (`utils/theme.ts`) con `design-system/tokens.md`
- [ ] Seed / fixtures de catálogo demo más realistas (Alfa/Beta; el starter de tiendas nuevas ya está)
- [ ] Hardening RLS (auditoría advisors) y tests de aislamiento multi-tenant
- ~~MercadoLibre ops impl. 2~~ — **descartado:** ML confirmó DevCenter/API MLV inoperativo (#475453897). Código OAuth congelado en `ML_API_ENABLED = false`.
- ~~MercadoLibre resto B–D (API)~~ — fuera de alcance hasta anuncio oficial de ML Venezuela

## Fuera de alcance inmediato

- Reintroducir API Express
- Reusar proyecto Supabase standalone (eliminado)
- Mezclar tablas sin prefijo `repmax_`

## Referencia

Planes cerrados: `plans/01` → `plans/03`.  
En curso: `plans/05` (multicanal sin OAuth — camino principal) · `plans/06` (dominio/vitrina, HTTPS wildcard live) · `plans/07` (hardware POS — fase 1 scanner HID + POS de escritorio implementada; fases 2-4, impresión fiscal/térmica, pendientes de hardware real).  
Descartado (ops): `plans/04` track API MLV (#475453897). Código preservado tras `ML_API_ENABLED`.  
Diseño: [`design/`](./design/) · sistema: [`design-system/`](./design-system/).  
Cambios hechos: [`CHANGELOG.md`](./CHANGELOG.md).
