# Changelog — ZM Tech Landing

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Añadido

- Landing bilingüe ES/EN: rutas `/es` y `/en`, diccionarios en `src/content/`, switcher en Navbar.
- Cotizador público localizado (`/[locale]/cotizador`) + copy EN en `@zmtech/quote-engine`.
- Dominio de marca **zmtechdev.com** (apex + www) en Vercel project `zmtech`.
- Hero con mockups reales (laptop + teléfono) y gancho tipográfico; backlog UI/UX en [UX-BACKLOG.md](./UX-BACKLOG.md).
- Sección Proof (antes/después) + teaser de cotizador en home; ROADMAPs por producto.

### Cambiado

- Hero mockups CSS 3D (`HeroDeviceMockup`): laptop con chassis/bisagra/teclado, perspectiva solo `rotateY` (~16°) para bordes verticales, tilt Framer, phone con bisel; sin Three.js (LCP).
- Hero pantallas React genéricas en `src/components/hero/mocks/` — 3 escenas sync laptop+phone (industrial / beauty / workshop); se eliminan webp raster del hero.
- `/` redirige 308 → `/es`; metadata/canonical con `metadataBase` → zmtechdev.com.
- Enlaces de propuestas/cotizador dejan de apuntar a `zmtech-landing.vercel.app`.
- `zod` fijado a v3 por hoist del monorepo (`fe48969`).
- `vercel.json` con `turbo-ignore` para previews de monorepo (`b12e684`, `04473a4`).
- Nav más corta (4 links); Verticales con CTA a `#cotizador`; fold mobile del hero.
- Home cotizador aligerado (CTA a página dedicada); Integraciones 6+chips; Features con métricas; TrustBanner con marcas.
