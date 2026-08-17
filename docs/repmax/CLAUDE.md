# CLAUDE.md — RepMAX (en zm-tech)

Contexto para agentes que toquen RepMAX dentro del monorepo.

## Prioridad de lectura

1. [README.md](./README.md) — paths, comandos, env, checklist migraciones
2. [../SUPABASE.md](../SUPABASE.md) — mapa multi-proyecto del monorepo
3. `.cursor/rules/repmax.mdc` — sync SQL ↔ schema TS
4. [.cursorrules](../../.cursorrules) — reglas globales del monorepo
5. Skill monorepo: `.cursor/skills/zmtech-dev/SKILL.md` (sección RepMAX)
6. Código en `apps/repmax-*` y `packages/repmax-schema` antes de inventar patrones

## Stack vigente

| Capa | Tecnología |
|------|------------|
| Web | Next.js 15 App Router, React 19, Tailwind, puerto 3003 |
| Mobile | Expo ~56, React Native 0.85, React 19 |
| Datos | Supabase Auth + PostgREST + RLS (`llacowjutjfefboqgfnj`) |
| Schema TS | Drizzle en `@repmax/repmax-schema` (contrato TS; **no** drizzle-kit) |
| DDL | SQL en `docs/repmax/supabase/migrations/` (verdad de BD) |
| Tenant/Auth UI | En apps: `AuthContext` → Supabase (`repmax_store_users` / `repmax_stores`). `@zmtech/tenant-config/repmax` existe como export pero **no está cableado** aún |

**No hay servidor Express.** No hay JWT propio. No hay `apps/repmax-server`.

## Capas

```
UI → Hooks / Server Components → lib/* (Supabase) → tipos (@repmax/repmax-schema)
```

## Datos / migraciones

- Checklist y sync SQL ↔ schema: [README.md](./README.md#datos-sql--schema-ts-sin-drizzle-kit)
- Rule Cursor: `.cursor/rules/repmax.mdc`
- Seeds: `supabase/seed/demo_users.md`, `supabase/seed/demo_catalog.sql`
- **No** `pnpm db:push` para RepMAX

## Tablas y helpers clave

- `repmax_stores`, `repmax_store_users`, `repmax_products`, `repmax_customers`, `repmax_sales`, `repmax_sale_items`, `repmax_cash_sessions`, `repmax_ml_listings` (aplicada), `repmax_ml_connections` (SQL lista, no aplicada)
- Helpers SQL: `repmax_user_store_ids()`, `repmax_user_role_in_store(store_id)`
- Políticas de catálogo público: solo rol `anon` (productos activos); autenticados no ven otras tiendas por esa vía

## Convenciones

- UI y nombres de negocio en español LATAM
- TypeScript estricto
- Sin emojis Unicode en UI (Lucide / vectoriales)
- No mezclar `@repmax/*` con `@geemastudio/*` ni `@odentalpro/*` en schema compartido
- Prefijo `repmax_*`; no tocar tablas de otros productos en el hub

## Comandos útiles

```bash
pnpm dev:repmax:web
pnpm dev:repmax:mobile
pnpm build:repmax
pnpm --filter @repmax/repmax-schema check:types   # si existe script
```

## Docs relacionadas

- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- Roadmap: [ROADMAP.md](./ROADMAP.md)
- Planes: [plans/](./plans/) (01–03 cerrados; 04 catálogo ML en curso; 05 multicanal; 06 dominio/vitrina — wildcard HTTPS live; 07 hardware = propuesta)
- Diseño onboarding: [design/](./design/) · catálogo ML: [design/catalog-ux-spec.md](./design/catalog-ux-spec.md), fotos [design/ml-fotos.md](./design/ml-fotos.md)
- Design system: [design-system/](./design-system/)
