# CLAUDE.md — RepMAX (en zm-tech)

Contexto para agentes que toquen RepMAX dentro del monorepo.

## Prioridad de lectura

1. [README.md](./README.md) — paths, comandos, env, migraciones
2. [.cursorrules](../../.cursorrules) — reglas globales del monorepo
3. Skill monorepo: `.cursor/skills/zmtech-dev/SKILL.md` (sección RepMAX)
4. Código en `apps/repmax-*` y `packages/repmax-schema` antes de inventar patrones

## Stack vigente

| Capa | Tecnología |
|------|------------|
| Web | Next.js 16 App Router, React 19, Tailwind, puerto 3003 |
| Mobile | Expo ~56, React Native 0.85, React 19 |
| Datos | Supabase Auth + PostgREST + RLS (`llacowjutjfefboqgfnj`) |
| Schema | Drizzle en `@repmax/repmax-schema` (fuente de verdad TS) |
| Tenant/Auth UI | `@geemastudio/tenant-config/repmax` |

**No hay servidor Express.** No hay JWT propio. No hay `apps/repmax-server`.

## Capas

```
UI → Hooks / Server Components → lib/* (Supabase) → tipos (@repmax/repmax-schema)
```

## Tablas y helpers clave

- `repmax_stores`, `repmax_store_members`, `repmax_products`, `repmax_customers`, `repmax_sales`, `repmax_sale_items`, `repmax_cash_sessions`
- Helpers SQL: `repmax_user_store_ids()`, `repmax_user_role_in_store(store_id)`
- Políticas de catálogo público: solo rol `anon` (productos activos); autenticados no ven otras tiendas por esa vía

## Convenciones

- UI y nombres de negocio en español LATAM
- TypeScript estricto
- Sin emojis Unicode en UI (Lucide / vectoriales)
- No mezclar `@repmax/*` con `@geemastudio/*` ni `@odentalpro/*` en schema compartido

## Comandos útiles

```bash
pnpm dev:repmax:web
pnpm dev:repmax:mobile
pnpm build:repmax
pnpm --filter @repmax/repmax-schema check:types   # si existe script
```

## Docs relacionadas

- Roadmap: [ROADMAP.md](./ROADMAP.md)
- Planes cerrados: [plans/](./plans/)
- Diseño onboarding: [design/](./design/)
