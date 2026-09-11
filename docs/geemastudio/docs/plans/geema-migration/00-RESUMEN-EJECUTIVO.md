# 00 — Resumen ejecutivo

**Fecha:** 2026-09-10 (alineado con código; original 2026-08-28)  
**Pregunta:** ¿En qué punto estamos para migrar a Geema como plataforma (ZM = tenant #1) y estandarizar WABA para barberías, peluquerías, etc.?

---

## Respuesta en una frase

**ZM Lash ya es el tenant #1 en producción** con el bot WABA más maduro; **GeemaStudio es el shell SaaS** operable en shadow (APK SDK 56 + adaptadores). S1–S3 de multi-tenant/WABA runtime están cerrados; **falta S4+ (crons tenant-aware) y panel/web WABA** para un 2.º negocio con bot completo.

---

## Semáforo

| Área | Estado | Nota |
|------|--------|------|
| BD multi-tenant (Plan 02 A/B/C + §11 S1) | 🟢 | Uniques, Auth Hook, `tenant_waba_numbers` en prod |
| Modelo tenant (bridge S2) | 🟢 | ADR + bridge `tenants` ↔ `tenant_settings` |
| WABA multi-tenant runtime (S3) | 🟢 | Flag off en prod ZM; smoke QA tenant pendiente |
| **Crons/RPCs tenant-aware (S4)** | 🔴 | **Siguiente crítico** — bloquea 2.º tenant con bot |
| Geema mobile (gestión + S5-C) | 🟡 | Core + packs/promos/agenda multi-svc ✅; S5C-8/9 + smoke Finanzas pendientes |
| Panel web Geema | 🟡 | `/servicios` + `/horarios` ✅; clientes/personal/agenda/waba ❌ |
| Landing tenant `/s/[slug]` | 🟢 | Fase 1 cerrada; Fase 2 CMS / Fase 3 dominio pendientes |
| WABA suite multi-vertical (L4 / S6) | 🔴 | Presets en `tenant-config`; panel `/panel/waba/*` no portado |
| Push FCM E2E (S6-7 / PR-09) | 🔴 | Token no persistido; sin `send-notification` en Geema |

---

## Estimación restante

| Fase | Sprints | Entregable |
|------|---------|------------|
| Crons WABA multi-tenant | **S4** | Edge Functions + Vault; smoke 2 tenants |
| Cerrar S5-C + branding | S5-B / restos S5-C | Ranking dashboard, hint Finanzas, logo Storage |
| Suite productizable | S6 | Presets vertical + panel WABA en Geema |
| Go-live 2.º tenant | S7+ | Onboarding → WABA propio + QA |

**Rough:** 3–5 sprints hasta un 2.º negocio real con WABA completo (S1–S3 ya no cuentan).

---

## Foco esta semana (zm-tech) — 10–14 sep 2026

Ver [ROADMAP.md](../../../ROADMAP.md) § Foco semana:

1. Alinear docs ✅  
2. S5C-9 + smoke Finanzas ZM  
3. PR-11a `/panel/clientes`  
4. Si sobra: S5C-8 ranking  

**Paralelo (repo ZM):** S4 cuando se abra sesión dedicada.

---

## Decisión recomendada (sigue vigente)

1. **ZM canónico para WABA** hasta crons S4 + smoke 2 tenants.  
2. **Geema** absorbe panel gestión (clientes → personal → …) y luego `/panel/waba`.  
3. **Presets `@zmtech/tenant-config`** alimentan L4 cuando S6 arranque.

---

## Decisiones pendientes (Alberto)

1. ¿El 2.º tenant usa apps Geema o ZM sigue panel canónico hasta converger?  
2. ¿Primer vertical post-belleza: `barbershop`?  
3. ¿Priorizar S4 (ZM) o PR-11 panel (Geema) en la misma semana? → **esta semana: Geema (S5C + clientes)**; S4 en sesión aparte.

---

## Siguiente documento

[01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md)
