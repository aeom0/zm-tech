# Documentación RepMAX Business Suite

Índice de la documentación técnica y de producto del monorepo.

| Documento | Contenido |
|-----------|-----------|
| [Desarrollo](./development.md) | Requisitos, scripts Yarn, variables de entorno, type-check |
| [Panel web (dashboard)](./dashboard-web.md) | `/login`, `/dashboard/*`, auth, API consumida |
| [Storefront público](./storefront.md) | Ruta `/[slug]`, API pública, componentes web |
| [README principal](../README.md) | Visión general del producto y estructura |
| [CLAUDE.md](../CLAUDE.md) | Guía rápida para asistentes de código (Cursor, Claude Code) |
| [SKILLS.md](../SKILLS.md) | Referencia profunda: stack, API, arquitectura mobile/web |
| [ROADMAP.md](../ROADMAP.md) | Fases, backlog y estado de módulos |
| [Onboarding UX (diseño)](../design/onboarding-ux-spec.md) | Especificación UX del flujo onboarding mobile |

## Paquetes del monorepo

| Workspace | Ruta | Descripción |
|-----------|------|-------------|
| `@repmax/shared` | `packages/shared` | Schema Drizzle + constantes (`POPULAR_BRANDS`, etc.) |
| `@repmax/server` | `apps/server` | API Express — storefront público + rutas JWT (panel web) |
| `@repmax/web` | `apps/web` | Next.js 15 — landing, storefront `/[slug]`, panel `/dashboard` |
| `@repmax/mobile` | `apps/mobile` | Expo — app operativa para la tienda |

## Enlaces útiles

- **Repositorio:** [github.com/aeom0/RepMAX](https://github.com/aeom0/RepMAX) (nombre del remoto puede variar; el proyecto en disco es `repmax-app` en `package.json`).
