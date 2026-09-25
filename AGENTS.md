# AGENTS.md — zm-tech

Fuente de verdad compartida para agentes (Cursor, Claude Code, Codex, Cloud Agents).  
Claude Code: ver [`CLAUDE.md`](CLAUDE.md) (importa este archivo + notas específicas).

Monorepo multi-producto (pnpm + Turborepo). Mapa de BDs: [`docs/SUPABASE.md`](docs/SUPABASE.md).

## Prioridad de lectura

1. Este archivo + [`.cursorrules`](.cursorrules) — reglas globales (paths, comandos, comportamiento)
2. [`docs/SUPABASE.md`](docs/SUPABASE.md) — mapa de proyectos Supabase y rol de `*-server`
3. `.cursor/skills/SKILLS.md` + skill del producto (`geemastudio-dev`, `odentalpro-dev`, `zmtech-dev`)
4. Rules en `.cursor/rules/*.mdc` según globs
5. `docs/<producto>/AGENTS.md` si existe (landing, hub, geemastudio, repmax)
6. Código del producto antes de inventar patrones

## Documentación ZM → Geema

- La serie canónica de planes Geema es `docs/geemastudio/docs/plans/01–15`.
- El detalle de migración consolidado está en
  `docs/geemastudio/docs/plans/04-geema-migration/`.
- `docs/geemastudio/docs/plans/geema-migration/` es únicamente el espejo
  temporal del sync con ZM; no crear planes nuevos allí.
- Los audits de paridad centralizados están en `docs/audit/`; consultar Plan
  04 y Plan 13 para el estado vigente, no las tablas históricas del baseline.

## Productos

| Producto | Apps | Packages |
|----------|------|----------|
| Landing | `apps/landing` → [zmtechdev.com](https://zmtechdev.com) (`/es`, `/en`) | `@zmtech/quote-engine` |
| GeemaStudio | `geemastudio-mobile`, `geemastudio-web`, `geemastudio-server` | `@geemastudio/shared-schema`, `@zmtech/tenant-config` |
| ODentalPro | `odentalpro-mobile`, `odentalpro-web`, `odentalpro-server` | `@odentalpro/dental-schema` |
| RepMAX | `repmax-web`, `repmax-mobile` | `@repmax/repmax-schema` |
| Hub | `apps/hub` | `@zmtech/hub-schema` |

Ver [README.md](README.md) y [ROADMAP.md](ROADMAP.md).

## Reglas rápidas

- No crear `.md` sin que se pida explícitamente.
- No mezclar schema de un producto con otro (`@geemastudio/*` vs `@odentalpro/*` vs `@repmax/*`).
- No mezclar proyectos Supabase ni tablas del hub sin prefijo correcto — [docs/SUPABASE.md](docs/SUPABASE.md).
- No modificar Supabase de producción sin instrucción explícita.
- UI y nombres de negocio en español LATAM neutro (**sin voseo**) — TypeScript estricto.
- **Sin emojis Unicode en UI** (web/mobile/panel): Lucide o íconos vectoriales. **Excepción:** copy/plantillas **WABA**.
- Capas: `UI → Hooks → Services/lib (Supabase) → Types`. Sin lógica de negocio en presentación.
- `*-server` = ops/DB/Edge, no API JWT. RepMAX no tiene `repmax-server`.

## Comandos

```bash
pnpm dev:landing
pnpm dev:web              # geemastudio-web
pnpm dev:mobile           # geemastudio-mobile
pnpm dev:odental:web
pnpm dev:repmax:web
pnpm dev:repmax:mobile
pnpm dev:hub
pnpm db:push              # solo GeemaStudio (udelx…)
pnpm lint
pnpm check:types
```

Detalle de paths y arquitectura: [`.cursorrules`](.cursorrules).

---

## Cursor Cloud specific instructions

Objetivo: tareas de **BD / Supabase** desde el teléfono vía [Cloud Agents](https://cursor.com/agents).

### Dos proyectos — no mezclar

| Nombre | Ref | Productos |
|--------|-----|-----------|
| **ZMTech (hub)** — default Cloud | `llacowjutjfefboqgfnj` | Landing, OdentalPro, RepMAX, Hub |
| **GeemaStudio** | `udelxwwnyivknslueerr` | Geema (+ tenant ZM Lash; misma BD que el repo Lash) |

En `llaco…` respetar prefijos (`odental_*`, `repmax_*`, `hub_*`, tablas landing). No `DROP` cruzado.

### Secrets (dashboard de **este** repo / environment)

[Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents) — Runtime Secret.

| Secret | De dónde (local) | Notas |
|--------|------------------|-------|
| `DATABASE_URL` | Dashboard Supabase hub → Database → URI (pooler) | **No** uses el `DATABASE_URL` de Lash (`udelx…`) |
| `SUPABASE_ACCESS_TOKEN` | PAT cuenta **zmtechdev** (`alberto@zmtechdev.com`) | El token de Lash/orta.1 da **403** en `llaco…` |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/repmax-web/.env.local` (o `apps/landing/.env.local`) | Service role del hub |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | mismo `.env.local` hub/repmax | Opcional |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://llacowjutjfefboqgfnj.supabase.co` | Opcional |

Opcionales Geema (solo si el agente debe tocar `udelx…` desde este repo):

| Secret | Notas |
|--------|-------|
| `DATABASE_URL_GEEMA` | Mismo string que Lash `.env` `DATABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY_GEEMA` | Service role Geema/Lash |
| `SUPABASE_ACCESS_TOKEN_GEEMA` | PAT orta.1 |

`start` corre `.cursor/cloud-bootstrap-env.sh` → `.env` + `~/.supabase/access-token`.

### Comandos útiles

```bash
# Hub (default)
psql "$DATABASE_URL" -c 'select now();'

# Management API si el pooler no responde (doc SUPABASE.md)
TOKEN=$(cat ~/.supabase/access-token)
curl -sS "https://api.supabase.com/v1/projects/llacowjutjfefboqgfnj/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select now();"}'
```

DDL en prod: confirmación explícita del usuario. Geema `db:push` vive en `apps/geemastudio-server` y apunta a `udelx…`.
