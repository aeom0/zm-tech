# 00 — Resumen ejecutivo

**Fecha:** 2026-08-28 · **Actualizado:** 2026-09-28  
**Pregunta:** ¿En qué punto estamos para migrar a Geema como plataforma (ZM = tenant #1) y estandarizar WABA para barberías, peluquerías, etc.?

---

## Respuesta en una frase

**ZM Lash ya es el tenant #1 en producción** (`zm-lash-nails`); **GeemaStudio ya opera el panel de gestión + suite WABA usable** (inbox staff, Haiku, Campañas, catálogo/Productos, **finanzas ejecutiva**) sobre la misma BD. **S4 (crons y RPCs tenant-aware) está cerrado** (PR #151). **S5 va a medias:** S5-1 (reglas en `waba_rules`, PR #154) y S5-4 (feriados por tenant, PR #155) están en prod; el bot todavía no lee esas reglas (S5-2/S5-3) y falta el panel (S5-5). Antes del 2.º tenant siguen el smoke del flag de routing, el resto de S5, S6 y el loop Meta Ads (diferido a S7). Track C (drift webhook) ✅ cerrado 22-sep.

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
| Reglas WABA por tenant (S5) | 🟡 | S5-1 ✅ PR #154 (`waba_rules`, sin consumidores). S5-4 ✅ PR #155 (feriados). Faltan S5-2, S5-3 y S5-5 |
| Panel `/panel/waba/*` Geema | 🟢 | Paridad tabs ZM + Estado (incl. Simulador ✅ 22-sep) |
| Retail `product_orders` | 🟡 | ZM: Ventas+Catálogo+push ✅; Geema: solo tab Catálogo; bot retail pausado |
| WABA suite multi-vertical (L4) | 🔴 | Presets en `tenant-config`; webhook no los consume aún |
| Drift `whatsapp-webhook` | 🟢 | Track C ✅ — prod v655 = ZM `010b240f` / `main`; ver [09](./09-WEBHOOK-PROD-RECONCILE.md) |

---

## Dónde continuar (recomendación 22-sep)

**Track A — cutover Vanessa a Geema (tenant #1):** suite panel WABA ✅ + finanzas ejecutiva ✅ (Plan 12 P1/P2) + push FCM P9/P10 ✅ (cita WABA y pago por validar recibidos en Geema). Siguiente: paridad WABA avanzada o cutover ops.
**Track B — 2.º tenant:** S4 ✅ (PR #151). S5-1 ✅ (PR #154) y S5-4 ✅ (PR #155). Siguiente: smoke del flag de routing en tenant QA, S5-2/S5-3/S5-5, S6, y el loop Meta Ads en S7.  
**Track C — riesgo:** ✅ cerrado — bot canónico ZM; redeploy solo desde ZM ([09](./09-WEBHOOK-PROD-RECONCILE.md)).

Detalle vivo: Plan 11/12 en `zm-tech/docs/geemastudio/docs/plans/`; roadmap sprints [04](./04-ROADMAP-SPRINTS.md).

---

## Estimación restante

| Fase | Entregable | Estado |
|------|------------|--------|
| Fundación multi-tenant (S1–S3) | §11 + bridge + runtime + flag | ✅ |
| Paridad panel Geema (Plan 11/12) | Historial + portafolio + finanzas ejecutiva web | 🟢 WABA+finanzas; falta push |
| S4 crons tenant-aware | 14 Edge + 4 RPCs + Vault | ✅ PR #151; Meta Ads en S7 |
| S5 reglas WABA | `waba_rules` + feriados por tenant | 🟡 S5-1 ✅ #154, S5-4 ✅ #155; S5-2/3/5 abiertos |
| Suite L4 presets | `barbershop` + loader | ❌ |
| Go-live 2.º tenant | Onboarding → WABA propio | ❌ |

---

## Decisión vigente (Opción A)

1. **ZM canónico para el bot** (Edge `whatsapp-webhook` prod). S4 quedó en este repo.
2. **Geema canónico para el panel** de tenant #1 (ops diarias Vanessa) a medida que cierre Plan 11/12.
3. **Presets `@zmtech/tenant-config`** alimentan L4 cuando el runtime consuma config por tenant.

---

## Decisiones pendientes (Alberto)

1. ¿Cutover de Vanessa al panel Geema ya (WABA + finanzas ✅)?
2. ¿Primer vertical post-belleza: `barbershop`?
3. ¿Smoke flag ON en tenant QA antes del 2.º tenant?
4. ¿Desbloquear bot retail (`add_to_cart` productos) ahora que no hay drift?

---

## Siguiente documento

[01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) · Planes Geema: `zm-tech/docs/geemastudio/docs/plans/11-PLAN-waba-suite-parity.md`
