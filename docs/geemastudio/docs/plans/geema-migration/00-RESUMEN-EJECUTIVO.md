# 00 — Resumen ejecutivo

**Fecha:** 2026-09-12 (alineado con código; original 2026-08-28)  
**Pregunta:** ¿En qué punto estamos para migrar a Geema como plataforma (ZM = tenant #1) y estandarizar WABA para barberías, peluquerías, etc.?

---

## Respuesta en una frase

**ZM Lash ya es el tenant #1 en producción** con el bot WABA más maduro; **GeemaStudio es el shell SaaS** operable en shadow (APK SDK 56 + adaptadores). S1–S3 cerrados; **panel web P1 (incl. WABA MVP) ✅**; **falta S4 (crons tenant-aware)** para un 2.º negocio con bot completo.

---

## Semáforo

| Área | Estado | Nota |
|------|--------|------|
| BD multi-tenant (Plan 02 A/B/C + §11 S1) | 🟢 | Uniques, Auth Hook, `tenant_waba_numbers` en prod |
| Modelo tenant (bridge S2) | 🟢 | ADR + bridge `tenants` ↔ `tenant_settings` |
| WABA multi-tenant runtime (S3) | 🟢 | Flag off en prod ZM; smoke QA tenant pendiente |
| **Crons/RPCs tenant-aware (S4)** | 🔴 | **Siguiente crítico** — bloquea 2.º tenant con bot |
| Geema mobile (gestión + S5-C) | 🟡 | Core ✅; S5C-9 ✅; quedan S5C-8 + smoke Finanzas |
| Panel web Geema | 🟢 | P1 cerrado 12-sep (servicios→waba MVP); P2 campañas/inventario ❌ |
| Landing tenant `/s/[slug]` | 🟢 | Fase 1 cerrada; Fase 2 CMS / Fase 3 dominio pendientes |
| WABA suite multi-vertical (L4 / S6) | 🟡 | Panel MVP ✅; presets Edge + campañas/analytics ❌ |
| Push FCM E2E (S6-7 / PR-09) | 🔴 | Token no persistido; sin `send-notification` en Geema |

---

## Estimación restante

| Fase | Sprints | Entregable |
|------|---------|------------|
| Crons WABA multi-tenant | **S4** | Edge Functions + Vault; smoke 2 tenants |
| Cerrar S5-C restos | S5-C | Ranking dashboard + smoke Finanzas |
| Suite productizable (resto) | S6 | Presets vertical + campañas/analytics WABA |
| Go-live 2.º tenant | S7+ | Onboarding → WABA propio + QA |

**Rough:** 3–5 sprints hasta un 2.º negocio real con WABA completo (S1–S3 y panel P1 ya no cuentan).

---

## Foco semana (zm-tech) — 10–14 sep 2026

Ver [ROADMAP.md](../../../ROADMAP.md) § Foco semana:

1. Alinear docs ✅  
2. S5C-9 ✅ · smoke Finanzas ZM (pendiente APK)  
3. PR-11 panel P1 completo ✅ (clientes → … → **waba MVP 12-sep**)  
4. Si sobra: S5C-8 ranking  

**Paralelo (repo ZM):** S4 cuando se abra sesión dedicada.

---

## Decisión recomendada (sigue vigente)

1. **ZM canónico para WABA runtime** hasta crons S4 + smoke 2 tenants.  
2. **Geema** panel gestión P1 cerrado; WABA CMS P2 (campañas/analytics) cuando haga falta.  
3. **Presets `@zmtech/tenant-config`** alimentan L4 cuando S6-1/2 arranquen.

---

## Decisiones pendientes (Alberto)

1. ¿El 2.º tenant usa apps Geema o ZM sigue panel canónico hasta converger?  
2. ¿Primer vertical post-belleza: `barbershop`?  
3. ¿Priorizar S4 (ZM) o restos S5-C / Push en la misma semana? → **S4 en sesión aparte**; smoke Finanzas cuando haya APK.

---

## Siguiente documento

[01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md)
