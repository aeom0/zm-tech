# RepMAX — documentación de producto

SaaS B2B multi-tenant para **tiendas de autopartes** en Venezuela. Vive en el monorepo **zm-tech** (pnpm + Turborepo), compartiendo el proyecto Supabase **ZMTech** con landing y OdentalPro.

## Apps y packages

| Path                                 | Rol                                                                                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/repmax-web`                    | Next.js 15 — panel `/dashboard/*` + vitrina `/{slug}` y `{slug}.localhost` / `{slug}.zmtechdev.com` (puerto **3003**)                                                                                                                   |
| `apps/repmax-mobile`                 | Expo SDK 56 — inventario, POS, clientes, caja, onboarding                                                                                                                                                                               |
| `packages/repmax-schema`             | Drizzle schema `repmax_*` + constantes (`@repmax/repmax-schema`)                                                                                                                                                                        |
| `packages/tasas`                     | Tasas BCV/USDT en vivo, compartido entre productos (`@zmtech/tasas`) — usado hoy solo por RepMAX POS. Ver [plans/08](./plans/08-PLAN-tasas-bcv-usdt.md)                                                                                 |
| `packages/tenant-config/src/repmax/` | Export `@zmtech/tenant-config/repmax` **preparado, no cableado** — ni `repmax-web` ni `repmax-mobile` lo importan ni lo declaran. Auth/tenant real hoy: `AuthContext` en cada app → `repmax_store_users` / `repmax_stores` vía Supabase |

## Arquitectura

```
UI (web / mobile) → Auth Provider → cliente Supabase → tablas/RPC repmax_* (RLS)
```

- **Auth**: Supabase Auth (sin Express, sin JWT propio).
- **Datos**: tablas con prefijo `repmax_` en `llacowjutjfefboqgfnj`.
- **Storage**: bucket `repmax-products`.
- **RPC**: `repmax_create_sale_with_items` (venta atómica + stock); `repmax_seed_starter_catalog` (6 productos al registrar, best-effort).
- **Tasas BCV/USDT**: `@zmtech/tasas` resuelve la tasa BCV en vivo (`repmax_stores.usar_tasa_manual` decide manual vs. vivo). Endpoints propios en `repmax-web` (ver tabla de rutas abajo) y cron Vercel que alimenta `hub_tasas_bcv`/`hub_tasas_usdt`. Detalle: [plans/08-PLAN-tasas-bcv-usdt.md](./plans/08-PLAN-tasas-bcv-usdt.md).

## Comandos (raíz del monorepo)

```bash
pnpm install
pnpm dev:repmax:web      # http://localhost:3003
pnpm dev:repmax:mobile
pnpm build:repmax
```

## Variables de entorno

| App    | Archivo                      | Variables                                                                                                                                                                                                                                     |
| ------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web    | `apps/repmax-web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Opcional: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VITRINA_SUBDOMAINS=1` (solo con wildcard DNS). Tasas BCV/USDT (server-only, secretos): `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` |
| Mobile | `apps/repmax-mobile/.env`    | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`                                                                                                                                                                                   |

Proyecto: `https://llacowjutjfefboqgfnj.supabase.co`

## Datos: SQL + schema TS (sin drizzle-kit)

- **DDL / RLS / RPC / índices**: SQL versionado en [`supabase/migrations/`](./supabase/migrations/).
- **Tipos / enums / columnas (TS)**: `@repmax/repmax-schema` → `packages/repmax-schema/src/schema.ts`.
- **No** usar `pnpm db:push` ni drizzle-kit para RepMAX (ese comando es de GeemaStudio).

### Checklist — nueva migración

1. Crear `docs/repmax/supabase/migrations/YYYYMMDDHHMMSS_<nombre>.sql` (solo objetos `repmax_*`).
2. Aplicar en el hub `llacowjutjfefboqgfnj` (MCP `apply_migration` o SQL Editor).
3. Si cambia tablas/enums/columnas → actualizar `packages/repmax-schema/src/schema.ts` **en el mismo cambio**.
4. Si solo toca RLS, grants, índices o RPC sin contrato TS → no hace falta tocar el package.
5. Si el catálogo demo cambia de forma relevante → reexportar [`supabase/seed/demo_catalog.sql`](./supabase/seed/demo_catalog.sql).
6. Tras aplicar en el hub, si `apply_migration` asignó otro timestamp, **renombrar el archivo local** para que coincida con `schema_migrations` (filename = versión remota).

### Sync schema ↔ SQL

| Cambia…                                | Actualizar también…                                        |
| -------------------------------------- | ---------------------------------------------------------- |
| Columnas / enums / tablas en SQL       | `packages/repmax-schema/src/schema.ts`                     |
| Columnas / enums en el package Drizzle | Migración SQL en `supabase/migrations/` (nunca solo el TS) |

Migraciones actuales: … `repmax_ml_listings` (aplicada). `repmax_ml_publish_intent` (**aplicada**, hub `20260817004929`). `repmax_products_color` (**aplicada**). `repmax_products_barcode` (**aplicada**). `repmax_seed_starter_catalog` (**aplicada**, hub `20260817222347` = filename local). `repmax_stores_tasa_manual` (**aplicada** 2026-08-18, agrega `usar_tasa_manual`). Pendiente ops: `repmax_ml_connections` (OAuth, descartado MLV).

Tasas BCV/USDT: además de la migración anterior, `docs/hub/supabase/migrations/20260818120000_hub_tasas_cambio.sql` (**aplicada** 2026-08-18) crea `hub_tasas_bcv`/`hub_tasas_usdt` en el hub — prefijo `hub_`, no `repmax_`, porque están pensadas para reutilizarse desde otros productos. Ver [docs/hub/README.md](../hub/README.md#migraciones-sql) y [plans/08](./plans/08-PLAN-tasas-bcv-usdt.md).

### Rutas API de tasas (`apps/repmax-web/src/app/api/`)

| Ruta                                 | Método | Auth                                 | Rol                                                   |
| ------------------------------------ | ------ | ------------------------------------ | ----------------------------------------------------- |
| `/api/bcv/tasa`                      | `GET`  | pública                              | Resuelve BCV + USDT + spread desde las tablas del hub |
| `/api/cron/guardar-tasa-bcv-diario`  | `GET`  | `Authorization: Bearer $CRON_SECRET` | Cron Vercel — guarda tasa BCV del día                 |
| `/api/cron/guardar-tasa-usdt-diario` | `GET`  | `Authorization: Bearer $CRON_SECRET` | Cron Vercel — guarda tasa USDT del día                |

Horarios en `apps/repmax-web/vercel.json` (`30 4 * * *` BCV, `35 4 * * *` USDT, hora UTC).

Edge Functions ML (código en [`supabase/functions/`](./supabase/functions/), **no desplegadas**): `ml-oauth-start`, `ml-oauth-callback`, `ml-token-refresh`, `ml-predict-category`. Secrets y redirect: ver [plans/04](./plans/04-PLAN-catalogo-mercadolibre.md).

## Seed demo

| Archivo                                                              | Contenido                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`supabase/seed/demo_users.md`](./supabase/seed/demo_users.md)       | Credenciales + `user_id` / `store_user_id` (owners, cashier, inventory) |
| [`supabase/seed/demo_catalog.sql`](./supabase/seed/demo_catalog.sql) | Catálogo de productos Alfa/Beta (idempotente)                           |

Tiendas nuevas (onboarding real): RPC `repmax_seed_starter_catalog` — 6 piezas según `vehicle_focus`, sin fotos, idempotente. Lo llama `catalogSeedService` desde `AuthContext.register()`. No toca Alfa/Beta.

## Diseño

- **Brand / logos:** [`brand/`](./brand/) (wordmark, RM, favicons, mobile icons)
- **Design system:** [`design-system/`](./design-system/) (tokens, componentes, voice, motion)
- Spec UX onboarding: `design/onboarding-ux-spec.md`
- Canvas Pencil: `design/onboarding.pen`
- Prototipo tap-through: `design/prototype/index.html`
- Catálogo + ML: `design/catalog.pen`, spec `design/catalog-ux-spec.md`, fotos `design/ml-fotos.md`

## Changelog

Historial de producto: [`CHANGELOG.md`](./CHANGELOG.md) (Keep a Changelog). Infra del monorepo: [../../CHANGELOG.md](../../CHANGELOG.md).

## Planes

- Cerrados: fases 01–03 en `plans/` (scaffold, schema/RLS, retiro Express).
- Descartado (ops MLV): [`plans/04-PLAN-catalogo-mercadolibre.md`](./plans/04-PLAN-catalogo-mercadolibre.md) — ML confirmó DevCenter/API inoperativo (#475453897). Código OAuth congelado.
- En curso (camino principal): [`plans/05-PLAN-catalogo-multicanal-sin-oauth.md`](./plans/05-PLAN-catalogo-multicanal-sin-oauth.md) — inventario, vitrina, POS, export ML manual.
- En curso (código + ops): [`plans/06-PLAN-dominio-vitrina.md`](./plans/06-PLAN-dominio-vitrina.md) — `{slug}.zmtechdev.com` (apex landing intacto).
- Propuesta: [`plans/07-PLAN-integracion-hardware.md`](./plans/07-PLAN-integracion-hardware.md) — Bridge POS (fiscal / térmica); scanner HID sin Bridge.
- Implementado: [`plans/08-PLAN-tasas-bcv-usdt.md`](./plans/08-PLAN-tasas-bcv-usdt.md) — tasa BCV/USDT en vivo en el POS (`@zmtech/tasas`), fallback a tasa manual.

## Reglas críticas

- Prefijo `repmax_` en tablas, enums, RPC, storage y políticas.
- No tocar `contacts`, `quote_leads`, `odental_*` ni schema Geema sin instrucción explícita.
- El repo standalone `aeom0/RepMAX` y el proyecto Supabase huérfano `ckaubaosvpmcxffyioio` quedaron fuera de uso.
- Mapa multi-BD del monorepo: [../SUPABASE.md](../SUPABASE.md).
