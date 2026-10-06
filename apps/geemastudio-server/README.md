# geemastudio-server — hub ops / DB

**No es una API HTTP.** Mobile y web hablan directo con Supabase (`udelxwwnyivknslueerr`).

## Qué vive aquí

| Área                | Uso                                                                                |
| ------------------- | ---------------------------------------------------------------------------------- |
| `drizzle.config.ts` | `pnpm db:push` / `db:generate` / `db:studio` (schema `@geemastudio/shared-schema`) |
| `migrations/`       | Salida de Drizzle generate                                                         |
| `scripts/`          | Seeds Auth y SQL de ejemplo                                                        |
| `supabase/migrations/` | Historial alineado con `schema_migrations` de `udelx…`                          |
| `supabase/functions/` | Edge Functions (WABA, push, crons, reset demo). Único deployer: `.github/workflows/edge-functions.yml` |

## Proyecto Supabase

`udelxwwnyivknslueerr` — mapa: [docs/SUPABASE.md](../../docs/SUPABASE.md).

## Comandos (raíz del monorepo)

```bash
pnpm db:push
pnpm db:generate
pnpm db:studio
pnpm --filter geemastudio-server exec tsx scripts/seed-auth-users.mjs
```

No hay `dev:server` ni Express.

## WABA (Edge Functions) — dueño desde plan 10 F5 (6-oct-2026)

`supabase/functions/**` es el código vigente del bot. El repo ZM Lash ya no tiene `supabase/`. **Único deployer:** `.github/workflows/edge-functions.yml` (push a `main` bajo esa ruta, o `workflow_dispatch`). No desplegar desde ZM Lash.

- QA: `scripts/waba-validate-*`. Teléfonos `51999000978`–`999`.
- Políticas: `policies-text/data.json` → `node scripts/copy-policies-to-edge.js` regenera `whatsapp-webhook/lib/policies.ts`.
- Docs: `docs/waba/`, `docs/ops/` (fuente de verdad aquí). Análisis de chats: rama `claude/waba-analysis`, no `main`.
- Plan: `docs/geemastudio/docs/plans/04-geema-migration/10-PLAN-traslado-waba-a-geema.md`.
