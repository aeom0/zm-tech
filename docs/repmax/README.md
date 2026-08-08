# RepMAX — documentación de producto

SaaS B2B multi-tenant para **tiendas de autopartes** en Venezuela. Vive en el monorepo **zm-tech** (pnpm + Turborepo), compartiendo el proyecto Supabase **ZMTech** con landing y OdentalPro.

## Apps y packages

| Path | Rol |
|------|-----|
| `apps/repmax-web` | Next.js 16 — panel `/dashboard/*` + vitrina pública `/[slug]` (puerto **3003**) |
| `apps/repmax-mobile` | Expo SDK 56 — inventario, POS, clientes, caja, onboarding |
| `packages/repmax-schema` | Drizzle schema `repmax_*` + constantes (`@repmax/repmax-schema`) |
| `packages/tenant-config/src/repmax/` | Auth/tenant (`@zmtech/tenant-config/repmax`) |

## Arquitectura

```
UI (web / mobile) → Auth Provider → cliente Supabase → tablas/RPC repmax_* (RLS)
```

- **Auth**: Supabase Auth (sin Express, sin JWT propio).
- **Datos**: tablas con prefijo `repmax_` en `llacowjutjfefboqgfnj`.
- **Storage**: bucket `repmax-products`.
- **RPC**: `repmax_create_sale_with_items` (venta atómica + stock).

## Comandos (raíz del monorepo)

```bash
pnpm install
pnpm dev:repmax:web      # http://localhost:3003
pnpm dev:repmax:mobile
pnpm build:repmax
```

## Variables de entorno

| App | Archivo | Variables |
|-----|---------|-----------|
| Web | `apps/repmax-web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Mobile | `apps/repmax-mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

Proyecto: `https://llacowjutjfefboqgfnj.supabase.co`

## Migraciones SQL aplicadas

Ver `supabase/migrations/` (schema, RLS/storage, RPC venta, fix políticas públicas `anon`).

## Diseño

- **Design system:** [`design-system/`](./design-system/) (tokens, componentes, voice, motion)
- Spec UX onboarding: `design/onboarding-ux-spec.md`
- Canvas Pencil: `design/onboarding.pen`
- Prototipo tap-through: `design/prototype/index.html`

## Planes de integración (cerrados)

Histórico de las fases 01–03 en `plans/`. El producto ya está cableado a Supabase compartido.

## Reglas críticas

- Prefijo `repmax_` en tablas, enums, RPC, storage y políticas.
- No tocar `contacts`, `quote_leads`, `odental_*` ni schema Geema sin instrucción explícita.
- El repo standalone `aeom0/RepMAX` y el proyecto Supabase huérfano `ckaubaosvpmcxffyioio` quedaron fuera de uso.
- Mapa multi-BD del monorepo: [../SUPABASE.md](../SUPABASE.md).
