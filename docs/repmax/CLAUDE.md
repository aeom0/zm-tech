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

| Capa           | Tecnología                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web            | Next.js 15 App Router, React 19, Tailwind, puerto 3003                                                                                                      |
| Mobile         | Expo ~56, React Native 0.85, React 19                                                                                                                       |
| Datos          | Supabase Auth + PostgREST + RLS (`llacowjutjfefboqgfnj`)                                                                                                    |
| Schema TS      | Drizzle en `@repmax/repmax-schema` (contrato TS; **no** drizzle-kit)                                                                                        |
| DDL            | SQL en `docs/repmax/supabase/migrations/` (verdad de BD)                                                                                                    |
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

- `repmax_stores` (incluye `usar_tasa_manual` y `preferred_brands`, aplicadas 2026-08-18), `repmax_store_users`, `repmax_products`, `repmax_customers`, `repmax_sales`, `repmax_sale_items`, `repmax_cash_sessions`, `repmax_ml_listings` (aplicada), `repmax_ml_connections` (SQL lista, no aplicada), `repmax_vehicle_catalog` (marca/modelo/años agregados a mano por tienda, aplicada 2026-08-18; índice de unicidad con años nulos pendiente)
- `hub_tasas_bcv`, `hub_tasas_usdt` (prefijo `hub_`, no `repmax_` — reutilizables por otros productos; aplicadas 2026-08-18, RLS `SELECT` público / escritura solo `service_role`)
- Helpers SQL: `repmax_user_store_ids()`, `repmax_user_role_in_store(store_id)`
- RPC: `repmax_create_sale_with_items`, `repmax_seed_starter_catalog` (aplicada, hub `20260817222347`)
- Políticas de catálogo público: solo rol `anon` (productos activos); autenticados no ven otras tiendas por esa vía
- Tasas BCV/USDT en vivo: paquete `@zmtech/tasas` (`packages/tasas`) + endpoints `apps/repmax-web/src/app/api/{bcv/tasa,cron/*}` + hook mobile `useTasaCambio`. No mezclar con lógica de negocio de otros productos — el paquete es genérico. Detalle: [plans/08-PLAN-tasas-bcv-usdt.md](./plans/08-PLAN-tasas-bcv-usdt.md)

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
- Planes: [plans/](./plans/) (01–03 cerrados; 04 catálogo ML en curso; 05 multicanal; 06 dominio/vitrina — wildcard HTTPS live; 07 hardware — fase 1 POS de escritorio + scanner HID implementada, fases 2-4 pendientes de hardware real; 08 tasas BCV/USDT — implementado, mobile pendiente de prueba visual en Expo)
- Diseño onboarding: [design/](./design/) · catálogo ML: [design/catalog-ux-spec.md](./design/catalog-ux-spec.md), fotos [design/ml-fotos.md](./design/ml-fotos.md)
- Design system: [design-system/](./design-system/)
