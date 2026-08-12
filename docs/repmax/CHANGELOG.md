# Changelog — RepMAX

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

Roadmap: [ROADMAP.md](./ROADMAP.md). Plan en curso: [plans/04-PLAN-catalogo-mercadolibre.md](./plans/04-PLAN-catalogo-mercadolibre.md).

---

## [Unreleased]

### Añadido
- **Catálogo fotos ML-ready (fase A)** — captura 1:1, revisión pass/fail, resize 1200² JPEG, máx. 6 slots, upload a `repmax-products/{store_id}/drafts/`. Switch publicar lista huecos (portada, n. parte, título); **sin OAuth**.
  - Código: `mlPhotoRules.ts`, `productPhotoService`, `PhotoSlotGrid`, `PhotoCaptureScreen`, `PhotoReviewScreen`.
  - Canvas: [`design/catalog.pen`](./design/catalog.pen) · spec [`design/catalog-ux-spec.md`](./design/catalog-ux-spec.md) · guía [`design/ml-fotos.md`](./design/ml-fotos.md).
- Logo oficial MercadoLibre (mismo SVG que landing ZM Tech) en `repmax-web` (`MercadoLibreLogo`) y raster PNG para Pencil.
- EAS Build + OTA en `@aeom0/repmax` (`109768f2-…`): channels `development` / `preview` / `production`, `runtimeVersion` SDK 56, stack nativo APK-ready (`expo-camera`, picker, manipulator, haptics, updates).
- UI mobile responsive phone/tablet (`orientation: default`, safe areas, splits, sidebar) — PR #15.
- Kit de marca REPMAX (wordmark, RM, favicons, íconos) cableado en web y mobile.

### Cambiado
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
