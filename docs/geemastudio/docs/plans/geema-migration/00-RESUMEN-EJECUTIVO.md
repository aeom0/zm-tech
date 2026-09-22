# 00 — Resumen ejecutivo

**Fecha:** 2026-08-28 · **Actualizado:** 2026-09-22  
**Pregunta:** ¿En qué punto estamos para migrar a Geema como plataforma (ZM = tenant #1) y estandarizar WABA para barberías, peluquerías, etc.?

---

## Respuesta en una frase

**ZM Lash ya es el tenant #1 en producción** (`zm-lash-nails`); **GeemaStudio ya opera el panel de gestión + suite WABA usable** (inbox staff, Haiku, Campañas, catálogo/Productos) sobre la misma BD — falta **cerrar paridad restante del panel, reconciliar drift del webhook, y S4 (crons tenant-aware) antes del 2.º tenant**.

---

## Semáforo (22-sep-2026)

| Área | Estado | Nota |
|------|--------|------|
| BD multi-tenant (Plan 02 A/B/C) | 🟢 | `tenant_id` + RLS panel |
| Plan 02 §11 / S1–S3 | 🟢 | Uniques, Auth Hook, bridge, routing WABA + flag OFF en prod |
| Modelo tenant unificado | 🟢 | Bridge `tenants` ↔ `tenant_settings` (ADR 05); WABA usa slug `text` en prod |
| Geema apps (gestión salón) | 🟢 | Mobile + panel web P1; theming/PWA por tenant; Productos catálogo ✅ |
| WABA motor (L1) canónico ZM | 🟢 | Booking/carrito/Haiku en Edge ZM (prod) |
| WABA multi-tenant runtime | 🟡 | Flag `waba_tenant_routing_enabled=false`; smoke QA ON pendiente |
| Crons/RPCs tenant-aware (S4) | 🔴 | Bloquea 2.º tenant con bot completo |
| Panel `/panel/waba/*` Geema | 🟢 | Paridad tabs ZM + Estado (incl. Simulador ✅ 22-sep) |
| Retail `product_orders` | 🟡 | ZM: Ventas+Catálogo+push ✅; Geema: solo tab Catálogo; bot retail pausado |
| WABA suite multi-vertical (L4) | 🔴 | Presets en `tenant-config`; webhook no los consume aún |
| Drift `whatsapp-webhook` | 🔴 | Geema CHANGELOG 22-sep: prod v655 sin mirror limpio en repos — no redeployar a ciegas |

---

## Dónde continuar (recomendación 22-sep)

**Track A — cutover Vanessa a Geema (tenant #1):** suite panel WABA ✅ (Historial · Portafolio · deep link · Simulador). Siguiente: ops no-WABA (finanzas ejecutiva) + reconciliar webhook.  
**Track B — 2.º tenant:** S4 crons/Vault en repo ZM (no mezclar con Track A en la misma sesión).  
**Track C — riesgo:** reconciliar/versionar bundle Edge `whatsapp-webhook` prod antes de cualquier cambio de bot (retail o S4).

Detalle vivo: Plan 11/12 en `zm-tech/docs/geemastudio/docs/plans/`; roadmap sprints [04](./04-ROADMAP-SPRINTS.md).

---

## Estimación restante

| Fase | Entregable | Estado |
|------|------------|--------|
| Fundación multi-tenant (S1–S3) | §11 + bridge + runtime + flag | ✅ |
| Paridad panel Geema (Plan 11/12) | Historial + portafolio + finanzas ejecutiva web | 🟡 en curso |
| S4 crons tenant-aware | 11 Edge + Vault | ❌ |
| Suite L4 presets | `barbershop` + loader | ❌ |
| Go-live 2.º tenant | Onboarding → WABA propio | ❌ |

---

## Decisión vigente (Opción A)

1. **ZM canónico para el bot** (Edge `whatsapp-webhook` prod) hasta reconciliar drift + S4.
2. **Geema canónico para el panel** de tenant #1 (ops diarias Vanessa) a medida que cierre Plan 11/12.
3. **Presets `@zmtech/tenant-config`** alimentan L4 cuando el runtime consuma config por tenant.

---

## Decisiones pendientes (Alberto)

1. ¿Cutover de Vanessa al panel Geema antes o después de Historial + Portafolio?
2. ¿Priorizar Track A (panel) o Track C (reconciliar webhook) esta semana?
3. ¿Primer vertical post-belleza: `barbershop`?
4. ¿Smoke flag ON en tenant QA antes de tocar crons S4?

---

## Siguiente documento

[01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) · Planes Geema: `zm-tech/docs/geemastudio/docs/plans/11-PLAN-waba-suite-parity.md`
