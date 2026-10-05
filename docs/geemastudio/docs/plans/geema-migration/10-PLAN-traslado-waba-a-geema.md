# 10 — Traslado de la suite WABA a Geema (`geemastudio-server`)

**Fecha:** 2026-10-05 · **Estado:** propuesto (nada ejecutado)
**Decisiones de Alberto (5-oct):** (1) renombrar la BD es **solo el nombre visible** (el ref `udelxwwnyivknslueerr` no cambia); (2) la suite WABA va al **servicio multi-tenant** (`zm-tech/apps/geemastudio-server`); (3) este documento es el plan, sin ejecución.
**Contexto:** `apps/mobile` y panel web de ZM retirados (PR #172). Este repo queda con landing + Edge/WABA + migraciones.

---

## 1. Hallazgo clave: es un traslado de **código**, no de infraestructura

Como el proyecto Supabase no cambia, **no cambia nada de lo que ve el mundo exterior**:

| Pieza | ¿Cambia? |
|-------|----------|
| URL Edge (`…/functions/v1/whatsapp-webhook`) y webhook en Meta | No |
| Secrets de Edge, Vault `cron_secret`, `pg_cron` / `pg_net` | No |
| Plantillas Meta, número WABA, tokens | No |
| BD y migraciones aplicadas | No |
| **Dónde vive el código fuente y quién despliega** | **Sí** |

Por eso el riesgo real es **deploy ownership / drift** (Track C, [09](./09-WEBHOOK-PROD-RECONCILE.md)), no el cutover de Meta. La regla actual «solo ZM despliega el bot» se invierte en un momento preciso (§4, paso 5), nunca hay dos deployers a la vez.

## 2. Estado de partida

- **ZM (este repo):** `supabase/functions/` = 27 funciones (+ `_shared`); `whatsapp-webhook` ≈ 89 `.ts`, 1,4 MB, dispatcher modular. Es el **canónico en prod** (v655 = `010b240f`). Deploy por `.github/workflows/ota-production.yml` (`deploy-edge-functions`).
- **Geema (`geemastudio-server/supabase/functions/`):** solo `whatsapp-webhook` (25 `.ts`, 264 KB, **fork antiguo** con `tenant-resolver.ts`) y `reset-demo-tenant`. **No debe desplegarse** (09 §Reglas). Hoy zm-tech **no tiene workflow de deploy Edge** (`ci.yml`, `claude.yml`, `repmax-ota.yml`, `supabase-keepalive.yml`).
- **Migraciones:** 75 de las 82 versiones locales de ZM ya existen también en `geemastudio-server/supabase/migrations/` (100). Regla vigente: ficheros alineados con `schema_migrations`.
- **Acoplamientos compartidos a resolver:** `packages/policies-text` (usado por `whatsapp-webhook/lib/policies.ts`), `packages/shared-schema` (`@zm/shared-schema` ↔ `@geemastudio/shared-schema`), `supabase/functions/_shared/*` (tenant-waba, lima-datetime, wa-recipient, vertex-gemini-image…), `deno.json`/`deno.lock`.
- **Estado multi-tenant:** S1–S5 ✅ (flag `waba_tenant_routing_enabled=false` en prod). Pendiente S6 (presets L4), smoke del flag, S7.

## 3. Inventario a trasladar (27 funciones)

| Grupo | Funciones |
|-------|-----------|
| **Núcleo bot** | `whatsapp-webhook`, `waba-staff-session`, `waba-chat-simulator`, `test-haiku-preview`, `chat-quality-review` |
| **Crons WABA/nudges** | `cart-nudge`, `ads-bounce-nudge`, `browse-reengage`, `silence-watchdog`, `abandoned-cart-reminders`, `held-slot-watch` |
| **Recordatorios / retoque** | `appointment-reminders`, `send-appointment-reminder`, `same-day-appointment-reminder`, `send-same-day-reminder`, `retouch-reminders`, `send-retouch-reengage` |
| **Envíos / push** | `send-whatsapp-notification`, `send-promo-whatsapp`, `send-notification` (FCM), `send-push-notification` |
| **Finanzas / Meta / costos** | `generate-recurring-expenses`, `sync-anthropic-billing`, `sync-meta-ads-spend`, `waba-pricing-sync` |
| **Look preview** | `look-preview` |

Cada una conserva su flag `--no-verify-jwt` actual (ver `.cursor/rules/current-development.mdc`).

## 4. Fases

### F0 — Preparación (sin tocar prod)
1. Congelar cambios de bot en ZM salvo hotfix (ventana corta; el flujo rama+PR sigue igual).
2. Decidir **gestor de paquetes**: ZM usa Yarn 4, zm-tech pnpm. Las Edge son Deno; solo importan `packages/*` por ruta relativa/`deno.json`. Verificar cómo resuelve `lib/policies.ts` → `policies-text` y copiar el paquete a `zm-tech/packages/` (o inline en `_shared`).
3. Retirar/archivar el fork viejo `geemastudio-server/.../whatsapp-webhook` (rama de respaldo + borrar en el mismo PR del paso F1).
4. Congelar un **snapshot de verificación**: SHA-256 por archivo del bundle prod (método de 09) como base de comparación.

### F1 — Copia 1:1 al monorepo Geema (código inerte)
1. PR en zm-tech: copiar `supabase/functions/**` de ZM `main` (sin modificar) a `geemastudio-server/supabase/functions/`, mismo árbol, incl. `_shared`, `deno.json`, `deno.lock` y los `*.test.ts`/suites QA (`scripts/waba-*`).
2. Copiar docs operativos WABA (`docs/waba/**`, `WABA_CAPACITY.md`, directrices Haiku) a `zm-tech/docs/…` (o dejarlos referenciados; ver §6).
3. **Criterio de salida:** `deno check` + todas las suites QA verdes en zm-tech; diff SHA-256 contra bundle prod = **0** (misma prueba de 09). Aún nadie despliega desde ahí.

### F2 — Deploy desde zm-tech (CI) en paralelo, sin activar
1. Crear en zm-tech `.github/workflows/edge-functions.yml` (puerto del job `deploy-edge-functions`: `deno check` del webhook, un step por función con sus flags, `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` como secrets del repo zm-tech).
2. Mantener **el checklist de AGENTS.md** en zm-tech (toda función tocada ⇒ step de deploy en el mismo PR). Añadir un guard CI que compare `ls functions/` con los steps del workflow (cierra el patrón de los incidentes PR #40/#44).
3. Probar con `workflow_dispatch` apuntando a una **función de bajo riesgo** (`generate-recurring-expenses` o `waba-pricing-sync`): redeploy idéntico, verificar versión nueva con mismo hash funcional y que su cron sigue disparando.

### F3 — Cutover de ownership (el paso crítico)
1. Ventana tranquila (L–S fuera de 10–18 h Lima; domingo tarde). Sin campañas CTWA activas.
2. Orden: crons primero (uno a uno, verificando `wa_error_log` y la siguiente ejecución), `waba-staff-session`/simulador, **al final `whatsapp-webhook`**.
3. Tras cada deploy: smoke con teléfonos QA `51999000978`–`999` (regla de memoria; evita push real), revisar `wa_error_log` 30 min, versión Edge en Supabase.
4. **Rollback:** redeploy del mismo commit desde ZM (el árbol sigue ahí hasta F5) con `yarn deploy:whatsapp-webhook`. No borrar nada en ZM hasta cerrar F4.
5. A partir de aquí: **zm-tech es el único deployer**. Deshabilitar el job `deploy-edge-functions` de ZM en el **mismo día** (si no, un push a ZM redeploya la versión vieja = drift).

### F4 — Migraciones y cambios de regla
1. Fuente única de `supabase/migrations/`: zm-tech (`geemastudio-server/supabase/migrations`). Regla de alineación local ↔ `schema_migrations` se traslada tal cual (`.cursor/rules/supabase-migrations.mdc`).
2. Reglas operativas que cambian de repo: «desplegar siempre tras tocar el webhook en rama» (sin preview Supabase), checklist Edge, deploy manual (`yarn deploy:whatsapp-webhook` → script equivalente en zm-tech).
3. Cambia el nombre de `tenant_id` hardcodeado (bloqueador #8) solo cuando el routing multi-tenant se active — **no** parte de este traslado.

### F5 — Limpieza en ZM
1. Borrar `supabase/functions`, `supabase/migrations`, `packages/{policies-text,shared-schema}`, `scripts/db`, `scripts/waba-*`, `.github/workflows/ota-production.yml`, `docs/waba` (mover a zm-tech/histórico). Quedan: `apps/web` (landing) + docs del tenant.
2. Actualizar `AGENTS.md`/`CLAUDE.md`/`.cursor/rules` (ya no hay Edge ni BD aquí). El repo ZM pasa a ser «landing + brief del tenant» y puede renombrarse (`zmlashnails-landing`) o, si la landing de Geema (`apps/landing`, Plan 10 Modo B/Corte 2) la reemplaza, archivarse.
3. Cuidado: Vercel vigila este repo (`zmlashnails.com`); el renombre del repo afecta la integración → hacerlo solo con la landing ya migrada.

## 5. Renombre «visible» de la BD

Es un cambio de metadato, no de infraestructura:
- **Supabase dashboard → Project Settings → General → Project name**: de «ZM Lash…» a «Geema» (el ref y la URL `udelxwwnyivknslueerr.supabase.co` no cambian; las API keys tampoco).
- Actualizar menciones documentales: `AGENTS.md`, `docs/SUPABASE.md` (zm-tech), `docs/ops/SUPABASE_MCP.md`, nombre del MCP `ClaudeSupabase` (no cambia el nombre canónico).
- Es reversible y sin downtime; **lo hace Alberto en el dashboard** (no se ejecuta desde aquí).

## 6. Decisiones abiertas

| # | Pregunta | Propuesta |
|---|----------|-----------|
| D1 | ¿Dónde viven `docs/waba/**` y análisis diarios (`docs/waba/analysis/`, rutina `rutina-waba-analysis`)? | zm-tech `docs/waba/`; actualizar rutina programada |
| D2 | `look-preview` y su spike (`scripts/look-preview`, GCP/Vertex) | Va con las Edge; el spike queda como histórico |
| D3 | Cron de análisis / rutinas remotas que clonan este repo | Reapuntar al repo de zm-tech |
| D4 | Secrets del repo de CI (`SUPABASE_ACCESS_TOKEN`, etc.) | Crear en zm-tech antes de F2 (no por chat) |
| D5 | ¿Un workflow por función o job único? | Job único con matriz y guard de inventario |
| D6 | `@zm/shared-schema` vs `@geemastudio/shared-schema` (drift Plan 02 bloqueador #9) | Cerrar antes de F4 o dejar zm-tech como único dueño del schema |

## 7. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Dos deployers simultáneos pisan el bot (v. incidente de drift) | Un solo owner en cada momento; F3 paso 5 deshabilita el job de ZM el mismo día |
| Copia con diferencias sutiles (imports, `deno.lock`) | Diff SHA-256 contra bundle prod (F1) |
| Cron deja de dispararse tras redeploy | Verificar la siguiente ejecución de cada `cron.job` en F3 |
| Pérdida de la regla «desplegar tras cada cambio» | Se traslada a AGENTS/CLAUDE de zm-tech en F4 |
| Rutinas/agentes remotos apuntan al repo viejo | D3 |

## 8. Orden y estimación

F0 (S) → F1 (M) → F2 (M) → F3 (S, 1 ventana) → F4 (S) → F5 (S). Todo antes del 2.º tenant (S7) y **sin depender** de S6; no mezclar con el activado del flag de routing. Un PR por fase (regla de agrupar PRs: una rama por tanda).
