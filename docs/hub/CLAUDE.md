# CLAUDE.md — Hub ZM Tech (en zm-tech)

Contexto para agentes que toquen el Hub dentro del monorepo.

## Prioridad de lectura

1. [README.md](./README.md) — qué es, paths, arquitectura, reglas
2. [design-system/README.md](./design-system/README.md) — ZM Control (tokens, visual, componentes)
3. [../SUPABASE.md](../SUPABASE.md) — mapa multi-proyecto del monorepo
4. [.cursorrules](../../.cursorrules) — reglas globales del monorepo
5. Skill monorepo: `.cursor/skills/zmtech-dev/SKILL.md`
6. [ROADMAP.md](./ROADMAP.md) + plan de la fase en curso en `plans/`
7. Código en `apps/hub` y `packages/hub-schema` antes de inventar patrones

## Stack vigente

| Capa   | Tecnología                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------- |
| Web    | Next.js 16 App Router, React 19, Tailwind v4, puerto 3004                                               |
| Datos  | Supabase Auth + PostgREST + RLS (`llacowjutjfefboqgfnj`)                                                |
| Schema | Drizzle en `@zmtech/hub-schema` (fuente de verdad TS)                                                   |
| Iconos | Lucide React                                                                                            |
| Design | ZM Control — [design-system/](./design-system/) · canvas [design/hub-shell.pen](./design/hub-shell.pen) |
| Tokens | `docs/hub/design/tokens.ts` → `apps/hub/src/lib/theme.ts` + `globals.css`                               |

**No hay servidor Express.** No hay JWT propio. No hay `apps/hub-server` ni app mobile en el MVP.

UI: familia landing (violeta `#8B5CF6`, fondo `#050505`). Space Grotesk + Inter. Sin emojis.

## Capas

```
UI → Server Components / hooks → lib/* (Supabase) → tipos (@zmtech/hub-schema)
```

## Tablas y helpers clave

- `hub_members`, `hub_clients`, `hub_projects`, `hub_contracts` (Fase 1)
- `hub_tickets`, `hub_reminders` (Fase 2)
- Helper SQL: `hub_is_member()` — toda política RLS de `hub_*` pasa por ahí
- Lectura cross-producto permitida **solo** de `contacts` y `quote_leads` (inbox de leads, `SELECT`)

## Convenciones

- UI y nombres de negocio en español LATAM
- TypeScript estricto — sin `any` implícito
- Sin emojis Unicode en UI (Lucide / vectoriales)
- Strings en `content.ts`, nunca hardcodeados en JSX
- Tokens vía `theme.ts` / CSS vars — no hex sueltos de otro producto (RepMAX naranja, teal scaffold)
- No mezclar `@zmtech/hub-schema` con `@geemastudio/*`, `@odentalpro/*` ni `@repmax/*`
- El Hub es interno: nada de páginas públicas; todo detrás de auth

## Comandos útiles

```bash
pnpm dev:hub
pnpm build:hub
pnpm --filter @zmtech/hub-schema check:types   # si existe script
```

## Docs relacionadas

- Roadmap: [ROADMAP.md](./ROADMAP.md)
- Planes por fase: [plans/](./plans/)
- Design system: [design-system/](./design-system/)
- Canvas: [design/](./design/)
- Migraciones: [supabase/migrations/](./supabase/migrations/)
