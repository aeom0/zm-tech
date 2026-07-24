# OdentalPro Server

Edge Functions para OdentalPro (proyecto Supabase temporal `llacowjutjfefboqgfnj`).

## Functions

| Function | Descripción |
|---|---|
| `healthcheck` | Ping JSON `{ ok: true }` |
| `auth-webhook` | Stub para eventos Auth (Fase 1) |

## Deploy

```bash
supabase functions deploy healthcheck --project-ref llacowjutjfefboqgfnj
supabase functions deploy auth-webhook --project-ref llacowjutjfefboqgfnj
```

No tocar la tabla `contacts` ni policies de la landing.
