# 00 — Resumen ejecutivo

**Fecha:** 2026-08-28  
**Pregunta:** ¿En qué punto estamos para migrar a Geema como plataforma (ZM = tenant #1) y estandarizar WABA para barberías, peluquerías, etc.?

---

## Respuesta en una frase

**ZM Lash ya es el tenant #1 en producción** con el bot WABA más maduro; **GeemaStudio es el shell SaaS** con onboarding y presets, pero **comparte la misma BD con un modelo de tenant distinto** y solo ~30% del stack operativo WABA. No falta “crear” el primer tenant — falta **converger arquitectura + portar WABA parametrizado**.

---

## Semáforo

| Área | Estado | Nota |
|------|--------|------|
| BD multi-tenant (Plan 02 A/B/C) | 🟢 | `tenant_id` + RLS panel |
| Plan 02 §11 (pre–2.º tenant) | 🔴 | Uniques `clients`, Auth Hook, routing WABA en repo ZM |
| Modelo tenant unificado | 🔴 | `tenants` (text) vs `tenant_settings` (UUID) |
| Geema apps (gestión salón) | 🟡 | Mobile core + packs/promos/chicas/timezone Lima ✅ (S5-C PR #30); multi-servicio, WABA, finanzas ejecutiva pendientes |
| WABA motor (L1) | 🟢 | Booking, carrito, Haiku shell — reutilizable |
| WABA multi-tenant runtime | 🔴 | ZM hardcodea `zm-lash-nails`; `waba_config` UNIQUE global |
| WABA suite multi-vertical (L4) | 🔴 | Presets en `tenant-config`; webhook no los consume |
| Panel `/panel/waba/*` en Geema | 🔴 | Solo existe en ZM |

---

## Estimación

| Fase | Sprints | Entregable |
|------|---------|------------|
| Fundación multi-tenant | 1–2 | §11 cerrado + bridge `tenants` ↔ `tenant_settings` |
| WABA multi-tenant runtime | 3–4 | `tenant_id` en webhook + crons; smoke 2 tenants |
| Suite productizable | 5–6 | Presets vertical + panel WABA en Geema |
| Go-live 2.º tenant | 7+ | Onboarding → seed + WABA propio |

**Total rough:** 4–6 sprints hasta un 2.º negocio real con WABA completo.

---

## Decisión recomendada (Opción A)

1. **ZM canónico para WABA** hasta que el webhook esté parametrizado por `tenant_id`.
2. **Unificar modelo tenant** con tabla puente (`tenants.id` ↔ `tenant_settings`).
3. **Geema absorbe** Edge Functions + panel WABA por oleadas (no reescribir desde cero).
4. **Presets `@zmtech/tenant-config`** alimentan L4 (CTWA, Haiku defaults, terminología).

---

## Decisiones pendientes (Alberto)

1. ¿El 2.º tenant usa apps Geema o ZM sigue siendo panel canónico hasta converger?
2. ¿Slug `tenants.text` + UUID `tenant_settings` como modelo final?
3. ¿Un número WABA Meta por tenant? (Geema ya asume sí.)
4. ¿Primer vertical post-belleza: `barbershop`?

---

## Siguiente documento

[01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md)
