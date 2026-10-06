# geemastudio-server — hub ops / DB

**No es una API HTTP.** Mobile y web hablan directo con Supabase (`udelxwwnyivknslueerr`).

## Qué vive aquí

| Área                | Uso                                                                                |
| ------------------- | ---------------------------------------------------------------------------------- |
| `drizzle.config.ts` | `pnpm db:push` / `db:generate` / `db:studio` (schema `@geemastudio/shared-schema`) |
| `migrations/`       | Salida de Drizzle generate                                                         |
| `scripts/`          | Seeds Auth y SQL de ejemplo                                                        |
| `supabase/`         | Migraciones de referencia + Edge Functions (WABA, reset demo, …)                   |

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

## WABA (Edge Functions) — traslado desde ZM (oct-2026, fase F1)

`supabase/functions/**` es una copia 1:1 del código WABA de `aeom0/ZM-Lash-and-Nails-Beauty`
(29 carpetas, incluida `_shared`; `reset-demo-tenant` es propia de Geema). **Aún no se despliega desde aquí**:
el deploy sigue en ZM hasta el cutover (plan 10, F3) — nunca dos deployers a la vez.

- QA: `scripts/waba-validate-*` (p. ej. `deno run --allow-read --allow-env --config supabase/functions/deno.json scripts/waba-validate-quick-wins.ts`).
- Políticas: `policies-text/data.json` → `node scripts/copy-policies-to-edge.js` regenera `whatsapp-webhook/lib/policies.ts`.
- Docs operativas: `docs/waba/`, `docs/ops/` (copia; la fuente de verdad sigue en ZM hasta F5).
- El fork anterior de `whatsapp-webhook` (25 archivos) se reemplazó; queda en el historial de git.
- Plan: `docs/geemastudio/docs/plans/04-geema-migration/10-PLAN-traslado-waba-a-geema.md`.
