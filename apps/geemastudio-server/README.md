# geemastudio-server — hub ops / DB

**No es una API HTTP.** Mobile y web hablan directo con Supabase (`udelxwwnyivknslueerr`).

## Qué vive aquí

| Área | Uso |
|------|-----|
| `drizzle.config.ts` | `pnpm db:push` / `db:generate` / `db:studio` (schema `@geemastudio/shared-schema`) |
| `migrations/` | Salida de Drizzle generate |
| `scripts/` | Seeds Auth y SQL de ejemplo |
| `supabase/` | Migraciones de referencia + Edge Functions (WABA, reset demo, …) |

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
