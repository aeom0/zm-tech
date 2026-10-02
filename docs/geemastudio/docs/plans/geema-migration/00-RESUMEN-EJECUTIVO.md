# 00 — Resumen ejecutivo

**Fecha:** 2026-08-28 · **Actualizado:** 2026-09-28  
**Pregunta:** ¿En qué punto estamos para migrar a Geema como plataforma (ZM = tenant #1) y estandarizar WABA para barberías, peluquerías, etc.?

---

## Respuesta en una frase

**ZM Lash ya es el tenant #1 en producción** (`zm-lash-nails`); **GeemaStudio ya opera el panel de gestión + suite WABA usable** (inbox staff, Haiku, Campañas, catálogo/Productos, **finanzas ejecutiva**) sobre la misma BD. **S4 (crons y RPCs tenant-aware) está cerrado** (PR #151). **S5 (reglas del bot) está cerrado en código** (PR #154, #155, #156): el webhook lee `waba_rules` y el panel `/panel/waba/reglas` edita horario, abono y staff. Antes del 2.º tenant siguen el smoke del flag de routing, S6 y el loop Meta Ads (diferido a S7). Track C (drift webhook) ✅ cerrado 22-sep.

---

## Semáforo (28-sep-2026)

| Área | Estado | Nota |
|------|--------|------|
| BD multi-tenant (Plan 02 A/B/C) | 🟢 | `tenant_id` + RLS panel |
| Plan 02 §11 / S1–S3 | 🟢 | Uniques, Auth Hook, bridge, routing WABA + flag OFF en prod |
| Modelo tenant unificado | 🟢 | Bridge `tenants` ↔ `tenant_settings` (ADR 05); WABA usa slug `text` en prod |
| Geema apps (gestión salón) | 🟢 | Mobile + panel web P1; theming/PWA por tenant; Productos catálogo ✅ |
| WABA motor (L1) canónico ZM | 🟢 | Booking/carrito/Haiku en Edge ZM (prod) |
| WABA multi-tenant runtime | 🟡 | Flag `waba_tenant_routing_enabled=false`; smoke QA ON pendiente |
| Crons/RPCs tenant-aware (S4) | 🟢 | PR #151. Loop Meta Ads diferido a S7 |
| Reglas WABA por tenant (S5) | 🟢 | S5-1 a S5-5 ✅. Panel `/panel/waba/reglas`. Cupo por servicio sigue en el JSON |
| Panel `/panel/waba/*` Geema | 🟢 | Paridad tabs ZM + Estado (incl. Simulador ✅ 22-sep) |
| Retail `product_orders` | 🟡 | ZM: Ventas+Catálogo+push ✅; Geema: solo tab Catálogo; bot retail pausado |
| WABA suite multi-vertical (L4) | 🔴 | Presets en `tenant-config`; webhook no los consume aún |
| Drift `whatsapp-webhook` | 🟢 | Track C ✅ — prod v655 = ZM `010b240f` / `main`; ver [09](./09-WEBHOOK-PROD-RECONCILE.md) |

---

## Dónde continuar (recomendación 22-sep)

**Track A — cutover Vanessa a Geema (tenant #1):** **Corte 1 (panel y app) validado el 2-oct-2026** — checklist D1–D4, W1–W6, R1–R3b del Plan 13 completo (código + prod en solo lectura; Simulador y push físico confirmados por Alberto). Falta el Corte 2 (landing `zmlashnails.com`, Plan 11 Modo B): reseñas reales de Google (bloqueada por datos), confirmar `web_team` con Vanessa y retiro de Sanity. Detalle: Plan 13 § Validación Corte 1 (zm-tech PR #45).
**Track B — 2.º tenant:** S4 ✅ (PR #151). S5 ✅ en código (PR #154, #155, #156, panel de reglas). Siguiente: smoke del flag de routing en tenant QA, S6, y el loop Meta Ads en S7.  
**Track C — riesgo:** ✅ cerrado — bot canónico ZM; redeploy solo desde ZM ([09](./09-WEBHOOK-PROD-RECONCILE.md)).

Detalle vivo: Plan 11/12 en `zm-tech/docs/geemastudio/docs/plans/`; roadmap sprints [04](./04-ROADMAP-SPRINTS.md).

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

1. **ZM canónico para el bot** (Edge `whatsapp-webhook` prod). S4 quedó en este repo.
2. **Geema canónico para el panel** de tenant #1 (ops diarias Vanessa) a medida que cierre Plan 11/12.
3. **Presets `@zmtech/tenant-config`** alimentan L4 cuando el runtime consuma config por tenant.

---

## Corte 1 — hallazgos de seguridad (2-oct-2026)

Corregidos en prod con la migración `20261002120954_revoke_anon_table_grants` (archivo en `zm-tech/apps/geemastudio-server/supabase/migrations/`; **no** se duplica en este repo, la BD es compartida).

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

1. ~~¿Cutover de Vanessa al panel Geema ya?~~ Corte 1 validado (2-oct); pendiente definir fecha y aviso al equipo.
2. ¿Primer vertical post-belleza: `barbershop`?
3. ¿Smoke flag ON en tenant QA antes del 2.º tenant?
4. ¿Desbloquear bot retail (`add_to_cart` productos) ahora que no hay drift?

---

## Siguiente documento

[01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) · Planes Geema: `zm-tech/docs/geemastudio/docs/plans/11-PLAN-waba-suite-parity.md`
