# geemastudio-server — hub ops / DB

**No es la API de negocio de GeemaStudio.** Mobile y web hablan directo con Supabase (`udelxwwnyivknslueerr`).

## Qué vive aquí

| Área | Uso |
|------|-----|
| `drizzle.config.ts` + scripts `db:*` | `pnpm db:push` / `db:generate` / `db:studio` (schema `@geemastudio/shared-schema`) |
| `scripts/` | Seeds Auth y SQL de ejemplo |
| `supabase/` | Migraciones de referencia + Edge Functions (p. ej. WABA, reset demo) |
| `index.ts` / `routes.ts` | **Express residual** — no lo consumen las apps; deuda por retirar |

## Proyecto Supabase

`udelxwwnyivknslueerr` — ver mapa completo en [docs/SUPABASE.md](../../docs/SUPABASE.md).

## Comandos (desde la raíz del monorepo)

```bash
pnpm db:push
pnpm db:generate
pnpm db:studio
pnpm --filter geemastudio-server exec tsx scripts/seed-auth-users.mjs   # si aplica
```

No levantar Express para desarrollo normal de mobile/web.
