# 04 — Roadmap por sprints

**Fecha:** 2026-08-28  
**Convención:** 1 sprint ≈ 2 semanas (ajustable). Un PR por tanda de cambios relacionados (regla Vercel Hobby).

---

## Vista general

| Sprint | Tema | Entregable clave | Depende de |
|--------|------|------------------|------------|
| **S1** | Schema P0 multi-tenant | Migraciones §11 + `waba_config` + debounce | — |
| **S2** | Modelo tenant unificado | Bridge `tenants` ↔ `tenant_settings` + Drizzle | S1 |
| **S3** | WABA runtime multi-tenant | Routing + thread `tenantId` en webhook ZM | S1, S2 |
| **S4** | Crons + RPCs tenant-aware | 11 Edge Functions parametrizadas | S3 |
| **S5** | Suite L3 — reglas externalizadas | `TenantWabaRules` + seed ZM | S3 |
| **S6** | Suite L4 + panel Geema | Presets vertical + `/panel/waba/*` port | S5 |
| **S7+** | Go-live 2.º tenant | Onboarding → WABA propio + QA | S4, S6 |

---

## Sprint 1 — Fundación BD (P0)

### Objetivo
Cerrar bloqueadores de schema que impiden dos negocios en la misma BD.

### Tareas

| ID | Tarea | Repo | Esfuerzo |
|----|-------|------|----------|
| S1-1 | UNIQUE `clients` compuesto con `tenant_id` | ZM migrations | S |
| S1-2 | UNIQUE `waba_config` → `(tenant_id, config_key)` | ZM migrations | S |
| S1-3 | PK `wa_action_debounce` → `(tenant_id, phone, kind)` + RPC | ZM migrations + SQL | M |
| S1-4 | Tabla `tenant_waba_numbers` + seed ZM actual | ZM migrations | S |
| S1-5 | Auth Hook: quitar default `zm-lash-nails`; `profiles.tenant_id NOT NULL` | ZM migrations | S |
| S1-6 | Documentar SQL en `scripts/db/` idempotente | ZM | S |
| S1-7 | Comunicar ventana de cambio + re-login staff (ver § abajo) | Ops | S |

### Ventana de cambio y comunicación (S1-5 / Auth Hook)

**No aplicar S1-5 en horario pico del salón ni en ventana activa de CTWA.**

| Ítem | Detalle |
|------|---------|
| **Ventana sugerida** | **Domingo 21:00–23:00 Lima** (salón cerrado; fuera de crons marketing 9–22) o **lunes 06:30–08:00** antes de apertura |
| **No-go** | L–S 09:00–19:00 Lima; viernes/sábado tarde si hay campaña Meta activa; víspera de feriado con citas |
| **Quién ejecuta migración** | Alberto (dev) |
| **Quién avisa al equipo** | **Alberto → Vanessa** (owner) por WhatsApp **≥24 h antes** con hora exacta y motivo (“actualización de seguridad, hay que volver a iniciar sesión en la app”) |
| **Quién re-loguea** | **Vanessa**, **Stephani**, **Karelis** (y cualquier profile `dev`/`owner`/`staff` con app instalada) |
| **Post-cambio** | Alberto confirma a Vanessa que las tres pudieron entrar; si falla alguien → rollback plan documentado en PR de migración |

### DoD
- [ ] Migraciones aplicadas en prod con version/name alineados (regla `.cursor/rules/supabase-migrations.mdc`)
- [ ] QA: dos filas `clients` mismo teléfono, distinto `tenant_id` — INSERT OK
- [ ] QA: dos filas `waba_config` misma key, distinto `tenant_id` — OK
- [ ] Mensaje enviado a Vanessa con ventana acordada; Stephani y Karelis avisadas por Vanessa o Alberto
- [ ] Re-login verificado en mobile para Vanessa + al menos 1 staff antes de cerrar sprint

### Riesgos
- Re-login staff tras Auth Hook — mitigado con S1-7 y ventana documentada arriba
- Coordinar con ventana de bajo tráfico WA — ver tabla no-go

---

## Sprint 2 — Modelo tenant + schema TS

### Objetivo
Un solo modelo de aislamiento para apps Geema y ZM.

### Tareas

| ID | Tarea | Repo | Esfuerzo |
|----|-------|------|----------|
| S2-1 | Diseño bridge `tenants` ↔ `tenant_settings` (ADR en esta carpeta) | Ambos docs | S |
| S2-2 | Migración bridge + seed ZM mapeado | ZM / geemastudio-server | M |
| S2-3 | Alinear `@zm/shared-schema` — `tenantId` 27 tablas + PK WA | ZM | M |
| S2-4 | Merge schema Geema → superset o package compartido | zm-tech | L |
| S2-5 | `AuthContext` lee `tenant_id` del JWT (mobile + web) | Ambos | S |
| S2-6 | RLS `operational_expenses` con filtro tenant | ZM migrations | S |
| S2-7 | **CI:** job que falle si `sync-geema-migration-docs.sh diff` no está vacío | ZM o zm-tech | S |

### DoD
- [ ] `yarn db:push` / Drizzle no diverge de prod
- [ ] Profile ZM staff con `tenant_id` explícito
- [ ] Documento ADR `05-ADR-modelo-tenant.md` (opcional) en esta carpeta
- [ ] Workflow CI S2-7 en verde (obligatorio antes de cerrar S2 — no dejar solo disciplina manual)

---

## Sprint 3 — WABA multi-tenant runtime

### Objetivo
Webhook ZM opera con `tenantId` resuelto; Geema routing integrado.

> **Riesgo prod:** toca el bot en vivo de Vanessa (`dispatcher.ts` ~2665 líneas + ~30 handlers). Obligatorio feature flag + rollback sin redeploy de schema.

### Tareas

| ID | Tarea | Repo | Esfuerzo |
|----|-------|------|----------|
| S3-1 | Portar `resolveTenantFromPhoneNumberId` de Geema → ZM webhook | ZM Edge | M |
| S3-2 | `loadWabaConfig(supabase, tenantId)` | ZM Edge | S |
| S3-3 | `loadCatalog` + `getOrCreateClient` + sesiones con `tenant_id` | ZM Edge | M |
| S3-4 | Thread `tenantId` en `dispatcher.ts` (~2665 líneas) y handlers (~30 archivos) | ZM Edge | **L** |
| S3-5 | Quitar hardcode `tenant_id: "zm-lash-nails"` en upserts | ZM Edge | M |
| S3-6 | Script QA `waba:validate:tenant-isolation` | ZM scripts | M |
| S3-7 | Deploy en `ota-production.yml` si toca functions | ZM CI | S |
| S3-8 | Feature flag `WABA_TENANT_ROUTING_ENABLED` + fallback single-tenant | ZM Edge | S |

### Feature flag y rollback (S3-8)

| Ítem | Detalle |
|------|---------|
| **Flag** | `WABA_TENANT_ROUTING_ENABLED` — lectura desde `waba_config` key `waba_tenant_routing_enabled` (boolean, default `false` en prod hasta smoke) o secret Edge si se prefiere no tocar BD en emergencia |
| **Comportamiento OFF** | Idéntico al prod actual: `tenant_id = "zm-lash-nails"` hardcodeado, sin resolver `phone_number_id` |
| **Comportamiento ON** | Resolver `tenantId` desde `tenant_waba_numbers`; filtrar catálogo/config/sesiones |
| **Activación** | Primero QA phones `978–999`; luego flag ON solo en staging/smoke; prod ON tras suite `:all` + 24 h sin `wa_error_log` nuevos |
| **Rollback (&lt;5 min)** | Poner flag `false` en `waba_config` (o secret) — **sin** redeploy ni migración; bot vuelve a single-tenant ZM |
| **Rollback (&gt;5 min)** | Redeploy Edge versión anterior vía `ota-production.yml` / `yarn deploy:whatsapp-webhook` si el bug es de código, no de config |

### DoD
- [ ] `yarn check:webhook` pasa
- [ ] Smoke: teléfono QA en tenant `test-barberia` no lee catálogo ZM **con flag ON**
- [ ] Smoke: flag OFF → comportamiento idéntico a pre-S3 (regresión cero en prod)
- [ ] Rollback documentado en PR S3 y probado una vez en QA (toggle OFF mid-suite)
- [ ] Prod ZM sin regresión (suite `:all` + cleanup)

---

## Sprint 4 — Crons y RPCs

### Objetivo
Ningún cron cruza tenants.

### Tareas

| ID | Tarea | Repo | Esfuerzo |
|----|-------|------|----------|
| S4-1 | RPCs SQL tenant-aware (`waba_find_silent_phones`, etc.) | ZM migrations | M |
| S4-2 | `cart-nudge`, `silence-watchdog`, `ads-bounce-nudge`, `browse-reengage` | ZM Edge | M |
| S4-3 | Recordatorios 24h, same-day, retoque | ZM Edge | M |
| S4-4 | `chat-quality-review`, `send-promo-whatsapp`, `sync-meta-ads-spend` | ZM Edge | M |
| S4-5 | Loop por tenant o filtro en cada query | ZM Edge | M |
| S4-6 | Secrets Meta/WABA por tenant vía **Vault** (ver § abajo) | ZM migrations + Edge | M |

### Secrets por tenant — patrón obligatorio (S4-6)

**Prohibido:** tokens Meta/WABA en `app_config`, columnas en texto plano, `cron.job` con Bearer embebido, o `.env` commiteado.

**Patrón existente (reutilizar, no reinventar):**

1. Secret en **Supabase Vault** — mismo patrón que `cron_secret` (PR #32, `docs/ops/DEPLOYMENT.md`).
2. Crons invocan Edge vía `invoke_cron_edge_function()` (`SECURITY DEFINER`, `SET search_path`).
3. `REVOKE EXECUTE` en funciones expuestas a `authenticated` / `anon` donde aplique.
4. Edge Functions leen secret con service role o helper Vault — **nunca** loguear valor.
5. Tabla `tenant_waba_numbers` guarda **metadatos** (`phone_number_id`, `tenant_id`, `waba_id`) — el token vive en Vault con nombre `waba_token_<tenant_id>` o mapa JSON en un solo secret rotatable.

**Referencias:** `docs/ops/DEPLOYMENT.md` § Vault · `scripts/db/` crons con `invoke_cron_edge_function` · `sync-meta-ads-spend` (rotar a este patrón si aún usa env global `META_*`).

### DoD
- [ ] Cada función del diff listada en `deploy-edge-functions` workflow
- [ ] QA cruzado 2 tenants sin nudge cruzado
- [ ] Ningún token Meta/WABA nuevo en SQL migración ni en `app_config`
- [ ] Al menos un cron tenant-aware invocado vía `invoke_cron_edge_function()` + Vault verificado

---

## Sprint 5 — Externalizar reglas ZM (L3)

### Objetivo
`constants.ts` → config por tenant; ZM sigue igual en comportamiento.

### Tareas

| ID | Tarea | Repo | Esfuerzo |
|----|-------|------|----------|
| S5-1 | Definir `TenantWabaRules` + storage JSONB | ZM schema + Edge | M |
| S5-2 | Migrar `EMPLOYEE_CATEGORIES`, horarios, pagos ZM a seed config | ZM | M |
| S5-3 | Capacidad genérica (sin UUIDs hardcode) | ZM Edge | M |
| S5-4 | `peru-holidays` → leer `salon_holidays` tenant primero | ZM Edge | S |
| S5-5 | Panel editar reglas básicas (horarios, depósito, staff↔cat) | ZM web o Geema web | M |

### DoD
- [ ] ZM prod comportamiento idéntico pre/post (suites QA verdes)
- [ ] Segundo tenant puede definir horarios/capacidad distintos sin deploy

---

## Sprint 6 — Presets vertical + panel Geema (L4)

### Objetivo
Barbería/peluquería pueden onboardear con defaults sensatos.

### Tareas

| ID | Tarea | Repo | Esfuerzo |
|----|-------|------|----------|
| S6-1 | `waba-preset-loader`: `businessType` → CTWA + Haiku defaults | ZM/Geema Edge | M |
| S6-2 | Seed onboarding: `waba_config` + catálogo preset | Geema mobile/server | M |
| S6-3 | Portar `/panel/waba/mensajes` a geemastudio-web | zm-tech | L |
| S6-4 | Portar `/panel/waba/campanas` + `/haiku` | zm-tech | M |
| S6-5 | Portar portafolio + simulador (opcional) | zm-tech | M |
| S6-6 | Eliminar/rehacer `/finanzas` web Geema (sin marca ZM) | zm-tech | M |
| S6-7 | Geema mobile: persistir push token + `send-notification` | zm-tech | M |

### DoD
- [ ] Demo `barbershop` con CTWA Corte/Barba/Combo
- [ ] Owner Geema opera mensajes WA desde panel web
- [ ] Audit 03 gaps P0 #1, #2, #4 cerrados o en progreso documentado

---

## Sprint 7+ — Go-live 2.º tenant real

### Objetivo
Primer cliente pagando (o barbería piloto) distinto de ZM.

### Tareas

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| S7-1 | INSERT `tenants` + `tenant_settings` + profiles staff | S |
| S7-2 | Configurar número WABA Meta + webhook + `tenant_waba_numbers` | M |
| S7-3 | Seed catálogo desde preset `barbershop` o custom | M |
| S7-4 | Smoke chat real + monitoreo `wa_error_log` 48h | S |
| S7-5 | Decisión monorepo único (Opción C largo plazo) — ADR | — |

### DoD
- [ ] 2 tenants en prod sin incidentes cross-tenant
- [ ] Al menos 1 cita vía bot del 2.º tenant
- [ ] Documentar runbook onboarding en `docs/plans/geema-migration/06-RUNBOOK-ONBOARDING-TENANT.md` (futuro)

---

## Paralelizable (no bloquea sprints críticos)

| Tarea | Sprint sugerido |
|-------|-----------------|
| Audit 03 gaps menores (portafolio, feriados UI) | S5–S6 |
| Expo 54 → 56 align mobile ZM/Geema | S7+ |
| Fase 5 drill-down `template_analytics` | Backlog |
| Rotar `CRON_SECRET` en Vault | S4 |
| CI diff sync Plan 05 (`S2-7`) | **S2** (ticket obligatorio, no backlog difuso) |

---

## Métricas de éxito (producto)

| Métrica | Baseline ZM | Meta 2.º tenant |
|---------|-------------|-----------------|
| Citas vía bot / ventana 48h | Variable (análisis WABA) | ≥1 cita bot en 30 días |
| Bounce CTWA un toque | ~40% (ago 2026) | ≥30% con preset correcto |
| Incidentes cross-tenant | N/A | 0 |
| Tiempo onboarding nuevo salón | Manual | <1 día con wizard |

---

## Mantenimiento de este plan

- Actualizar tablas de estado al cerrar cada sprint.
- Sincronizar carpeta con Geema: ver [SYNC.md](./SYNC.md).
- Cambios de alcance → editar aquí + `00-RESUMEN-EJECUTIVO.md`.
