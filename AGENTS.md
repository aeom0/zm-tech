# AGENTS.md — zm-tech

Monorepo multi-producto. Mapa de BDs: [`docs/SUPABASE.md`](docs/SUPABASE.md). Raíz: [`CLAUDE.md`](CLAUDE.md).

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
| `DATABASE_URL` | Dashboard Supabase hub → Database → URI (pooler) | **No** está en los `.env` del monorepo hoy; no uses el `DATABASE_URL` de Lash (`udelx…`) |
| `SUPABASE_ACCESS_TOKEN` | PAT cuenta **zmtechdev** (`alberto@zmtechdev.com`) | El token de Lash/orta.1 da **403** en `llaco…` |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/repmax-web/.env.local` (o `apps/landing/.env.local`) | Service role del hub |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | mismo `.env.local` hub/repmax | Opcional; materializa apps en Cloud |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://llacowjutjfefboqgfnj.supabase.co` | Opcional |

Opcionales Geema (solo si el agente debe tocar `udelx…` desde este repo):

| Secret | Notas |
|--------|--------|
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
