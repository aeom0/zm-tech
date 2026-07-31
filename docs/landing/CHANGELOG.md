# Changelog — ZM Tech Landing

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Añadido
- Landing bilingüe ES/EN: rutas `/es` y `/en`, diccionarios en `src/content/`, switcher en Navbar.
- Cotizador público localizado (`/[locale]/cotizador`) + copy EN en `@zmtech/quote-engine`.
- Dominio de marca **zmtechdev.com** (apex + www) en Vercel project `zmtech`.
- Hero con mockups reales (laptop + teléfono) y gancho tipográfico; backlog UI/UX 4–13 en [UX-BACKLOG.md](./UX-BACKLOG.md).

### Cambiado
- `/` redirige 308 → `/es`; metadata/canonical con `metadataBase` → zmtechdev.com.
- Enlaces de propuestas/cotizador dejan de apuntar a `zmtech-landing.vercel.app`.
- `zod` fijado a v3 por hoist del monorepo (`fe48969`).
- `vercel.json` con `turbo-ignore` para previews de monorepo (`b12e684`, `04473a4`).
- Nav más corta (4 links); Verticales con CTA a `#cotizador`; fold mobile del hero.