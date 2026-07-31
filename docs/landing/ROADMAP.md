# ROADMAP — Landing ZM Tech

Sitio corporativo y funnel comercial de **ZM Tech**.  
**Producción:** [zmtechdev.com](https://zmtechdev.com) · App: `apps/landing` · Package: `@zmtech/quote-engine`

El detalle de cambios ya hechos vive en [CHANGELOG.md](./CHANGELOG.md). Este archivo solo marca hacia dónde va el producto.

---

## Objetivo

Mantener una landing bilingüe (`/es` · `/en`) que convierta: proof real en el hero, cotización clara y contacto/WhatsApp sin fricción.

---

## Estado (jul 2026)

- Landing bilingüe, cotizador público localizado, propuestas por slug, dominio canónico zmtechdev.com.
- Hero con mockups reales (laptop ZetaEme Hub + teléfono con agenda / ventas / cotizador).
- Gancho tipográfico (“WhatsApp y Excel”), fold mobile (mockup en primer viewport), nav más corta (4 links), CTAs en Verticales.
- Logos reales en Integraciones; páginas de Privacidad y Términos.

---

## Próximo

UI/UX **4–13** implementados (ago 2026). Ver [UX-BACKLOG.md](./UX-BACKLOG.md) (archivo histórico + checklist).

### Mantener (no bloqueante)

- i18n: strings solo en `src/content/{es,en}.ts`.
- Quote-engine y leads (Supabase `llacowjutjfefboqgfnj`) — sin cambios de arquitectura previstos.
- Inventario de repos/clientes: [PROYECTOS.md](./PROYECTOS.md).
- Iterar copy/proof con más casos reales cuando haya capturas anonimizadas adicionales.

---

## Enlaces

| Doc                              | Uso                              |
| -------------------------------- | -------------------------------- |
| [README.md](./README.md)         | Stack, env, estructura           |
| [CHANGELOG.md](./CHANGELOG.md)   | Historial de cambios             |
| [UX-BACKLOG.md](./UX-BACKLOG.md) | Detalle del próximo bloque UI/UX |
| [CLAUDE.md](./CLAUDE.md)         | Contexto para agentes            |
