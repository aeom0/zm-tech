# 00 — Resumen ejecutivo

**Fecha:** 2026-08-28 · **Actualizado:** 2026-10-12  
**Pregunta:** ¿En qué punto estamos para migrar a Geema como plataforma (ZM = tenant #1) y estandarizar WABA para barberías, peluquerías, etc.?

---

## Respuesta en una frase

**ZM Lash ya es el tenant #1 en producción** (`zm-lash-nails`); **GeemaStudio ya opera el panel de gestión + suite WABA usable** (inbox staff, Haiku, Campañas, catálogo/Productos, **finanzas ejecutiva**) sobre la misma BD. **S4 (crons y RPCs tenant-aware) está cerrado** (PR #151). **S5 (reglas del bot) está cerrado en código** (PR #154, #155, #156): el webhook lee `waba_rules` y el panel `/panel/waba/reglas` edita horario, abono y staff. **Desde el 6-oct la suite WABA vive y se despliega solo desde zm-tech** ([10](./10-PLAN-traslado-waba-a-geema.md) F0–F5) y **desde el 8-oct el agente Haiku 5.5 atiende el WABA de ZM Lash** (`agent_enabled`, sin allowlist). Antes del 2.º tenant siguen F6 (parametrizar hardcodes de ZM), el smoke del flag de routing, S6 y S7.

---

## Semáforo (12-oct-2026)

| Área | Estado | Nota |
|------|--------|------|
| BD multi-tenant (Plan 02 A/B/C) | 🟢 | `tenant_id` + RLS panel |
| Plan 02 §11 / S1–S3 | 🟢 | Uniques, Auth Hook, bridge, routing WABA + flag OFF en prod |
| Modelo tenant unificado | 🟢 | Bridge `tenants` ↔ `tenant_settings` (ADR 05); WABA usa slug `text` en prod |
| Geema apps (gestión salón) | 🟢 | Mobile + panel web P1; theming/PWA por tenant; Productos catálogo ✅ |
| WABA motor (L1) | 🟢 | Edge en `geemastudio-server`, deploy `edge-functions.yml`. Agente Haiku 5.5 con tools en ZM Lash (8-oct); el dispatcher clásico es respaldo hasta la Fase 3 del cutover |
| WABA multi-tenant runtime | 🟡 | Flag `waba_tenant_routing_enabled=false` (verificado 12-oct); un solo número en `tenant_waba_numbers`; smoke QA ON y F6 pendientes |
| Crons/RPCs tenant-aware (S4) | 🟢 | PR #151. Loop Meta Ads diferido a S7 |
| Reglas WABA por tenant (S5) | 🟢 | S5-1 a S5-5 ✅. Panel `/panel/waba/reglas`. Cupo por servicio sigue en el JSON |
| Panel `/panel/waba/*` Geema | 🟢 | Paridad tabs ZM + Estado (incl. Simulador ✅ 22-sep) |
| Retail `product_orders` | 🟡 | Geema: catálogo + ventas (web Productos y mobile Ventas) ✅; bot retail pausado por producto; Inventario mobile diferido ([Plan 15](../15-PLAN-retail-productos.md)) |
| WABA suite multi-vertical (L4) | 🔴 | Presets en `tenant-config`; webhook no los consume aún |
| Drift `whatsapp-webhook` | 🟢 | Un solo deployer (zm-tech, push a `main`); Track C histórico en [09](./09-WEBHOOK-PROD-RECONCILE.md) |

---

## Dónde continuar (actualizado 12-oct)

**Track A — cutover Vanessa a Geema (tenant #1):** **Corte 1 (panel y app) validado el 2-oct-2026** — checklist D1–D4, W1–W6, R1–R3b del Plan 13 completo (código + prod en solo lectura; Simulador y push físico confirmados por Alberto). Falta el Corte 2 (landing `zmlashnails.com`, Plan 11 Modo B): reseñas reales de Google (bloqueada por datos), confirmar `web_team` con Vanessa y retiro de Sanity. Detalle: Plan 13 § Validación Corte 1 (zm-tech PR #45).
**Track B — 2.º tenant:** S4 ✅ (PR #151). S5 ✅ en código (PR #154, #155, #156, panel de reglas). Traslado WABA ✅ (10 F0–F5). Siguiente: F6 (hardcodes de ZM: nombre, dirección, abono, copy), smoke del flag de routing en tenant QA, S6, y el loop Meta Ads en S7.  
**Track C — riesgo:** ✅ cerrado — desde el 6-oct el único deployer de Edge es `edge-functions.yml` de zm-tech ([10](./10-PLAN-traslado-waba-a-geema.md)).

Detalle vivo: Plan 11/12/13 en `docs/geemastudio/docs/plans/`; roadmap sprints [04](./04-ROADMAP-SPRINTS.md); pendientes de producto en [`ROADMAP.md`](../../../ROADMAP.md).

---

## Actualización 5–8 oct 2026 — retiro de la UI de ZM, traslado WABA y agente Haiku

- **PR #172 de ZM ✅ (5-oct):** `apps/mobile` y las rutas de panel de ZM eliminadas; el equipo opera 100 % en Geema.
- **Plan [10](./10-PLAN-traslado-waba-a-geema.md) ✅ F0–F5 (6-oct):** la suite WABA vive en `geemastudio-server` y la despliega `.github/workflows/edge-functions.yml` (push a `main`). El repo ZM quedó solo con la landing `zmlashnails.com` y docs operativos. El proyecto Supabase no cambió (URL Edge, webhook Meta, secrets y crons intactos). Queda F6.
- **PR #173 de ZM ✅:** el webhook cachea 5 min el tenant del número y 60 s catálogo + `waba_config` (menos lecturas a la API). Efecto operativo: `waba_tenant_routing_enabled` tarda hasta 5 min en aplicarse (activar o apagar) y precios/copy hasta 60 s.

---

## Estimación restante

| Fase | Entregable | Estado |
|------|------------|--------|
| Fundación multi-tenant (S1–S3) | §11 + bridge + runtime + flag | ✅ |
| Paridad panel Geema (Plan 11/12) | Historial + portafolio + finanzas ejecutiva web | 🟢 WABA+finanzas; falta push |
| S4 crons tenant-aware | 14 Edge + 4 RPCs + Vault | ✅ PR #151; Meta Ads en S7 |
| S5 reglas WABA | `waba_rules` + panel de reglas | ✅ S5-1 a S5-5 (#154, #155, #156) |
| Suite L4 presets | `barbershop` + loader | ❌ |
| Go-live 2.º tenant | Onboarding → WABA propio | ❌ |

---

## Decisión vigente (Opción A)

1. ~~ZM canónico para el bot~~ — superado el 6-oct: el bot y todas las Edge viven en `geemastudio-server` (zm-tech).
2. **Geema canónico para el panel** de tenant #1 (ops diarias Vanessa): ZM retiró su mobile y panel (PR #172 de ZM, 5-oct).
3. **Presets `@zmtech/tenant-config`** alimentan L4 cuando el runtime consuma config por tenant.

---

## Corte 1 — hallazgos de seguridad (2-oct-2026)

Corregidos en prod con la migración `20261002120954_revoke_anon_table_grants` (`apps/geemastudio-server/supabase/migrations/`).

| # | Hallazgo | Estado |
|---|----------|--------|
| H1 | `anon` con GRANT completo (incl. DELETE/TRUNCATE) sobre ~46 tablas de `public`, frenado solo por RLS | ✅ revocado |
| H2 | Policy `tenant_landing_public_read` dejaba a `anon` leer la fila completa de un tenant con `web_enabled = true` (incl. `waba_*`, `contact_info`) | ✅ lectura anon acotada a columnas web |
| H3 | `wa_error_log` 48 h: 3 entradas, ya corregidas (#160 BSUID, `96425bbc` foto de tardanzas, guard de cita fantasma) | ✅ sin errores nuevos |
| H4 | Vistas `tenant_brand_public` / `tenant_landing_public`: simples, `security_invoker = false`, con INSERT/UPDATE/DELETE para anon y authenticated; escribían en `tenant_settings` saltándose RLS | ✅ solo `SELECT` |

**Decisión confirmada:** `web_enabled = true` en `zm-lash-nails` es intencional (activado el 1-oct).

**Causa común:** Supabase concede ALL a `anon`/`authenticated` sobre todo objeto nuevo de `public`. Regla para ZM y Geema: tras crear tabla o vista pública, `REVOKE ALL ... FROM anon` y conceder solo lo necesario (ver `packages/shared-schema/AGENTS.md` § RLS).

---

## Decisiones pendientes (Alberto)

1. ~~¿Cutover de Vanessa al panel Geema ya?~~ Hecho: Corte 1 validado (2-oct) y ZM retiró su panel (5-oct).
2. ¿Primer vertical post-belleza: `barbershop`?
3. ¿Smoke flag ON en tenant QA antes del 2.º tenant?
4. ¿Desbloquear bot retail (`add_to_cart` productos)? Ya no hay drift; si se retoma, va como tool del agente Haiku.
5. Fase 3 del cutover del agente (borrar el dispatcher clásico): tras una semana estable desde el 8-oct ([plan](../../../../../apps/geemastudio-server/docs/waba/plan-cutover-agente-haiku.md)).

---

## Siguiente documento

[01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) · Planes Geema: `zm-tech/docs/geemastudio/docs/plans/12-PLAN-waba-suite-parity.md`
