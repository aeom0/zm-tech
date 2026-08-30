# Supabase en zm-tech — mapa multi-proyecto

Fuente de verdad para agentes y humanos. En este monorepo convivén **varios proyectos Supabase**; mezclar tablas o aplicar migraciones al proyecto equivocado es el riesgo #1.

## Proyectos activos

| Proyecto                 | Ref                    | Productos                      | Aislamiento                                          |
| ------------------------ | ---------------------- | ------------------------------ | ---------------------------------------------------- |
| **ZMTech** (hub)         | `llacowjutjfefboqgfnj` | Landing, OdentalPro, RepMAX    | Prefijos / tablas por producto                       |
| **GeemaStudio** (beauty) | `udelxwwnyivknslueerr` | GeemaStudio (+ tenant ZM Lash) | Proyecto dedicado (sin prefijo `odental_`/`repmax_`) |

URL hub: `https://llacowjutjfefboqgfnj.supabase.co`  
URL Geema: `https://udelxwwnyivknslueerr.supabase.co`

### Qué vive en cada uno

**`llacowjutjfefboqgfnj` (ZMTech)**

| Prefijo / tablas                                  | Producto                                                                  | Schema TS / SQL                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `contacts`, `quote_leads`, …                      | Landing / cotizador                                                       | `apps/landing`, `@zmtech/quote-engine`                                                           |
| `odental_*`                                       | OdentalPro                                                                | `@odentalpro/dental-schema`, `apps/odentalpro-server/supabase/migrations/`                       |
| `repmax_*`                                        | RepMAX                                                                    | `@repmax/repmax-schema` (TS) + `docs/repmax/supabase/migrations/` (DDL; sin drizzle-kit)         |
| `hub_*` _(planificado, salvo excepción)_          | Hub interno ZM Tech                                                       | `@zmtech/hub-schema` _(planificado)_, `docs/hub/supabase/migrations/` (borradores, no aplicados) |
| `hub_tasas_bcv`, `hub_tasas_usdt` — **aplicadas** | Tasas BCV/USDT compartidas (paquete `@zmtech/tasas`, hoy solo RepMAX POS) | `packages/tasas`, `docs/hub/supabase/migrations/20260818120000_hub_tasas_cambio.sql`             |

**`udelxwwnyivknslueerr` (GeemaStudio)**

| Tablas                                                        | Producto    | Schema TS / ops                                                                           |
| ------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `profiles`, `employees`, `appointments`, `tenant_settings`, … | GeemaStudio | `@geemastudio/shared-schema`, `apps/geemastudio-server/` (Drizzle, seeds, Edge Functions) |

### Fuera de uso

- Proyecto Supabase huérfano RepMAX (`ckaubaosvpmcxffyioio`) — eliminado.
- Ref antiguo Geema `xidjomlxpuosupymcsaj` — no usar (docs legacy).

---

## Rol de las carpetas `*-server`

**No son APIs JWT de negocio.** Las apps web/mobile hablan con Supabase (Auth + PostgREST + RLS). Las carpetas `*-server` son el **hub de ops/DB** del producto:

| Carpeta                   | Proyecto Supabase      | Qué contiene                                                                                  | Qué NO es                                                     |
| ------------------------- | ---------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `apps/geemastudio-server` | `udelxwwnyivknslueerr` | Drizzle (`db:push` / generate / studio), seeds, migraciones SQL de referencia, Edge Functions | API HTTP / Express / JWT                                      |
| `apps/odentalpro-server`  | `llacowjutjfefboqgfnj` | Migraciones `odental_*`, stubs Edge Functions                                                 | Express / JWT                                                 |
| _(RepMAX)_                | `llacowjutjfefboqgfnj` | **No hay** `apps/repmax-server`                                                               | Schema en package + SQL en `docs/repmax/supabase/migrations/` |

### Simetría esperada

```
Producto     → apps/*-web + apps/*-mobile (+ *-server solo si hay ops/DB/Edge)
Schema TS    → packages/*-schema (o shared-schema)
Migraciones  → *-server/supabase/migrations  Ó  docs/<producto>/supabase/migrations
Auth/datos   → cliente Supabase en la app (sin Express de negocio)
```

RepMAX encaja en esa simetría sin carpeta server: las migraciones viven en `docs/repmax/supabase/`. Odental y Geema mantienen `*-server` porque ahí viven Drizzle/seeds/Edge o el árbol `supabase/` del CLI.

---

## Reglas operativas

1. **Antes de SQL/MCP**: confirmar ref del proyecto y prefijo de tablas.
2. En `llacowjutjfefboqgfnj`, **nunca** tocar tablas de otro producto (p. ej. no `DROP` sobre `contacts` al trabajar Odental/RepMAX). Excepción única prevista: el Hub interno podrá **leer** (`SELECT`) `contacts` y `quote_leads` como inbox de leads — ver `docs/hub/plans/02-PLAN-schema-rls-supabase.md`.
3. **No** reintroducir Express/JWT como capa de negocio; Edge Functions solo para webhooks, jobs o privilegios service-role.
4. Variables de entorno deben apuntar al proyecto correcto del producto (ver `.env.example` de cada app).
5. **DDL/SQL contra un proyecto real desde este entorno**: `supabase db query --linked` intenta conectar directo a Postgres (pooler) y falla por timeout — el puerto Postgres suele estar bloqueado en este sandbox. Usar en su lugar el **Management API** por HTTPS con el token de `~/.supabase/access-token`: `POST https://api.supabase.com/v1/projects/{ref}/database/query` con `{"query": "..."}` (curl). Las API keys (anon/service_role) del proyecto se obtienen con `supabase projects api-keys --project-ref <ref>`. Cambios de schema en un proyecto de producción real (como `udelxwwnyivknslueerr`) requieren confirmación explícita del usuario antes de ejecutarse — ver regla del CLAUDE.md raíz.

## MCP / Cursor

- Servidor **`user-supabase-zmtech`**: ligado al hub `llacowjutjfefboqgfnj`.
- GeemaStudio (`udelxwwnyivknslueerr`): operar con el MCP/CLI configurado para ese proyecto; no asumir el mismo server que ZMTech.

Detalle de producto: `docs/landing/`, `docs/geemastudio/`, `docs/odentalpro/`, `docs/repmax/`.
