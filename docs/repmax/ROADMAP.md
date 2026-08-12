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
- [x] **Diseño onboarding V2 (Pencil)** — tokens Industrial Dark/Light, componentes reutilizables, 7 pantallas dark + light, flow map + prototipo HTML tap-through
  - Canvas: `design/onboarding.pen`
  - Spec: `design/onboarding-ux-spec.md`
  - Prototype: `design/prototype/index.html`
  - Design system: `design-system/`
- [x] **Catálogo fotos ML-ready (fase A)** — captura 1:1, validación 500 px / 1200², Storage `repmax-products`
  - Canvas: `design/catalog.pen`
  - Spec: `design/catalog-ux-spec.md`
  - Guía: `design/ml-fotos.md`
  - Plan: `plans/04-PLAN-catalogo-mercadolibre.md`

## Próximo

- [ ] Cablear onboarding mobile end-to-end al high-fi (`apps/repmax-mobile` ↔ design system)
- [ ] Extraer / alinear tokens RN (`utils/theme.ts`) con `design-system/tokens.md`
- [ ] Seed / fixtures de catálogo realistas por tenant de prueba
- [x] Deploy Vercel (`repmax-web`) + EAS / preview mobile (proyecto `@aeom0/repmax`, OTA channels)
- [ ] Hardening RLS (auditoría advisors) y tests de aislamiento multi-tenant
- [ ] Dominio / branding storefront público
- [ ] MercadoLibre fase B–D: ficha/color, OAuth + publicar, sync stock/órdenes

## Fuera de alcance inmediato

- Reintroducir API Express
- Reusar proyecto Supabase standalone (eliminado)
- Mezclar tablas sin prefijo `repmax_`

## Referencia

Planes cerrados: `plans/01` → `plans/03`.  
Diseño: [`design/`](./design/) · sistema: [`design-system/`](./design-system/).  
Cambios hechos: [`CHANGELOG.md`](./CHANGELOG.md).
