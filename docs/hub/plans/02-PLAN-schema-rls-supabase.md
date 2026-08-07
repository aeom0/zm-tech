# Plan 02 — Schema `hub_*` + RLS en Supabase (Fase 1)

Objetivo: crear las tablas del Hub en el proyecto **ZMTech** (`llacowjutjfefboqgfnj`) con RLS cerrado a miembros. SQL borrador listo en [../supabase/migrations/](../supabase/migrations/) — **aplicar solo con instrucción explícita de Alberto**.

## Principios

1. Prefijo `hub_` en tablas, enums, funciones y políticas — mismo aislamiento que `odental_*` / `repmax_*`.
2. RLS **deny-by-default**: solo usuarios presentes en `hub_members` ven/escriben datos del Hub. Nada para `anon`.
3. Referencias a la landing (`contacts`, `quote_leads`) como **uuid sin FK** — no acoplar productos con constraints cross-producto.
4. `updated_at` por trigger compartido `hub_set_updated_at()`.

## Enums

| Enum | Valores |
|------|---------|
| `hub_member_role` | `founder`, `admin`, `viewer` |
| `hub_client_status` | `lead`, `activo`, `pausado`, `cerrado` |
| `hub_client_source` | `landing`, `cotizador`, `referido`, `directo` |
| `hub_vertical` | `beauty`, `inmobiliaria`, `wellness`, `automotriz`, `sports`, `enterprise`, `salud`, `otro` |
| `hub_project_type` | `web`, `mobile`, `fullstack`, `bot`, `otro` |
| `hub_project_status` | `propuesta`, `desarrollo`, `produccion`, `pausado`, `archivado` |
| `hub_ticket_status` | `abierto`, `en_progreso`, `esperando_cliente`, `resuelto`, `cerrado` |
| `hub_ticket_priority` | `baja`, `media`, `alta`, `urgente` |
| `hub_ticket_channel` | `whatsapp`, `email`, `directo`, `hub` |
| `hub_reminder_kind` | `dominio`, `token`, `soporte`, `certificado`, `pago`, `otro` |
| `hub_reminder_recurrence` | `ninguna`, `mensual`, `anual` |
| `hub_reminder_status` | `pendiente`, `hecho`, `descartado` |

## Tablas — Fase 1

### `hub_members`
| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid PK | FK `auth.users(id)` on delete cascade |
| `role` | `hub_member_role` | default `viewer`; Alberto se inserta como `founder` |
| `display_name` | text | |
| `created_at` | timestamptz | default `now()` |

### `hub_clients`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text not null | nombre comercial (p. ej. "ZM Lash and Nails Beauty") |
| `contact_name` | text | persona (p. ej. "Vanessa") |
| `email` / `phone` / `whatsapp` | text | |
| `country` / `city` | text | |
| `vertical` | `hub_vertical` not null | |
| `status` | `hub_client_status` not null default `lead` | |
| `source` | `hub_client_source` not null default `directo` | |
| `source_contact_id` | uuid | ref suave a `contacts.id` (sin FK) |
| `source_quote_lead_id` | uuid | ref suave a `quote_leads.id` (sin FK) |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | trigger |

### `hub_projects`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid | FK `hub_clients` on delete set null — **nullable**: productos propios (GeemaStudio, RepMAX…) no tienen cliente |
| `name` | text not null | |
| `slug` | text unique not null | |
| `type` | `hub_project_type` not null | |
| `status` | `hub_project_status` not null default `desarrollo` | |
| `repo_url` | text | `aeom0/…` |
| `stack` | text[] | libre: "Next.js 16", "Expo SDK 54", … |
| `production_url` | text | dominio en producción |
| `vercel_project` / `eas_project` | text | |
| `supabase_ref` | text | ref del proyecto Supabase que usa |
| `version` | text | |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | trigger |

### `hub_contracts`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid not null | FK `hub_clients` on delete cascade |
| `project_id` | uuid | FK `hub_projects` on delete set null |
| `amount_usd` | numeric(10,2) | monto del proyecto |
| `payment_model` | text | default `'50/50'` |
| `monthly_support_usd` | numeric(10,2) | p. ej. 30.00 |
| `support_active` | boolean not null default false | |
| `start_date` / `delivered_at` | date | |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | trigger |

## Tablas — Fase 2 (mismo borrador, aplicar cuando toque)

### `hub_tickets`
`id`, `client_id` FK not null, `project_id` FK nullable, `title` not null, `description`, `priority` (default `media`), `status` (default `abierto`), `channel` (default `directo`), `opened_at` default now, `resolved_at`, `created_at`/`updated_at`.

### `hub_reminders`
`id`, `title` not null, `kind` not null, `client_id`/`project_id` FK nullables, `due_date` date not null, `recurrence` default `ninguna`, `status` default `pendiente`, `notes`, `created_at`/`updated_at`.

> Al completar un recordatorio recurrente, la app crea la siguiente ocurrencia (no hay cron en el MVP).

## RLS

- Helper:
  ```sql
  create function hub_is_member() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from hub_members where user_id = auth.uid()) $$;
  ```
- Todas las tablas `hub_*`: `enable row level security` + política única `for all to authenticated using (hub_is_member()) with check (hub_is_member())`.
- `hub_members`: los miembros pueden `SELECT`; escritura solo rol `founder` (o vía SQL manual en el MVP).
- **Nada** para `anon`.
- Lectura de `contacts`/`quote_leads` para el inbox: esas tablas son de la landing — si sus políticas actuales no permiten `SELECT` a `authenticated`, se agrega una política **aditiva** `…to authenticated using (hub_is_member())` sobre ellas (única excepción cross-producto permitida, solo lectura, documentada en [../../SUPABASE.md](../../SUPABASE.md)).

## Orden de migraciones (borradores)

| Archivo | Contenido |
|---|---|
| `01_hub_initial_schema.sql` | enums + tablas Fase 1 + trigger `updated_at` |
| `02_hub_rls.sql` | helper `hub_is_member()` + políticas + política lectura leads |
| `03_hub_operacion.sql` | tablas Fase 2 (tickets, reminders) + sus políticas |

Al aplicarlas se renombran con timestamp real (`YYYYMMDDHHMMSS_…`, convención RepMAX).

## Criterios de aceptación

- [x] Migraciones 01–02 aplicadas sin tocar tablas de otros productos.
- [x] Usuario sin fila en `hub_members` no ve ninguna fila `hub_*` (probado con anon key).
- [x] `@zmtech/hub-schema` refleja el SQL 1:1 y compila estricto.
- [x] Fila `founder` creada para Alberto (`a.orta@zmtechdev.com`).
