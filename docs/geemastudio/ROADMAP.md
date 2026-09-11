# ROADMAP GeemaStudio (2026) — ruta a beta v1.5

## Objetivo

Llegar a la primera beta de producción lo antes posible, intercalando estabilización técnica mínima con las features que realmente desbloquean el lanzamiento. No hay "primero limpiar todo y luego features" — cada sprint entrega valor concreto.

---

## Principios de ejecución

- **Beta primero**: cada decisión se toma preguntando si acerca o aleja la beta.
- **Plan 05 (ago 2026)**: migración ZM ↔ Geema + suite WABA multi-vertical — ver [`docs/plans/geema-migration/`](docs/plans/geema-migration/README.md) (espejo de ZM; sync vía script en repo ZM).
- Estabilizar lo mínimo indispensable, no lo perfecto.
- Features y deuda técnica en paralelo cuando no hay dependencia entre sí.
- Entregar en incrementos pequeños con criterios de aceptación claros.
- Mantener consistencia multi-tenant (moneda, terminología, branding, permisos).
- Quality gate mínimo: `pnpm check:types` / typecheck workspaces antes de todo commit.

---

## Foco semana 10–14 sep 2026

> Orden concreto para esta semana. No mezclar con S4 (repo ZM) en la misma sesión salvo que se abra explícitamente.

| # | Día | Entregable | Repo | DoD |
|---|-----|------------|------|-----|
| 0 | Jue 10 | **Alinear docs** (este ROADMAP + semáforo Plan 05 + CLAUDE auth) | zm-tech | Docs reflejan código real |
| 1 | Vie 11 | **S5C-9** — hint UI “Finanzas está en Más” (onboarding/admin) | zm-tech | ✅ hecho 10-sep |
| 2 | Vie 11 | **Smoke Finanzas ZM** — checklist shadow (pagos visibles tenant `zm-lash-nails`) | zm-tech + APK | Cerrar DoD abierto de S5-C |
| 3 | Sáb–Dom | **PR-11a** — `/panel/clientes` | zm-tech | ✅ 10-sep |
| 3b | — | **PR-11b/c/d** — personal + configuracion + agenda | zm-tech | ✅ 10-sep |
| 4 | Si sobra | **S5C-8** — ranking top servicios Dashboard | zm-tech | opcional |
| — | Paralelo (otra sesión) | **S4** crons/RPCs WABA tenant-aware + Vault | ZM | Camino crítico 2.º tenant |

**Fuera de esta semana (no empezar):** PR-10B reenganche, PromoMasiva, Look Preview, Landing Fase 2/3, S6 panel WABA completo.

---

## Estado actual (v1.5-unreleased — sep 2026)

### Completado (hasta 5-sep 2026)

- Monorepo: `apps/geemastudio-{mobile,web,server}`, `@geemastudio/shared-schema`, `@zmtech/tenant-config`
- TypeScript ~6, Expo SDK 56, React 19.2, New Architecture
- **Auth real** mobile: `signInWithPassword` + `profiles` + roles (`dev` \| `owner` \| `staff`)
- Core mobile: onboarding, agenda (owner grid + staff timeline), servicios/packs/promos (adaptador ZM), clientes, inventario, finanzas (comisiones + payouts), validación pagos, asignar profesionales, feriados, colores de marca
- **S5-C P0/P1 mayor**: packs/promos/timezone/employees ✅ (#30); multi-servicio + referencias ✅ (#31); feriados ✅; finanzas ejecutiva mobile ✅ (costos WABA aún no)
- Core web: `/`, `/finanzas`, `/dashboard`, `/panel/servicios`, `/panel/horarios`, landing tenant `/s/[slug]` (Fase 1)
- **CI** `.github/workflows/ci.yml` (lint + typecheck + build web) ✅ (#36)
- **Error handling** pantallas críticas (`ErrorState`) ✅ (#36)
- Anti-solapamiento citas en mobile ✅
- WABA multi-tenant **base** (webhook + `phone_number_id`) — capa ZM v3.0 / reenganche aún no
- Migración Plan 05: **S1–S3** cerrados en prod/código; **S4+** pendiente

### Riesgos activos

- Push FCM: token no se persiste en `profiles.push_token`; sin Edge `send-notification` en Geema
- Defaults `tenant-config` vs `tenant_settings` — vigilar regresiones en onboarding
- EAS internal testing: APK preview existe; canal Play internal no validado E2E documentado
- S4 (crons WABA) bloquea 2.º tenant con bot completo

### Beta gate (actualizado sep 2026)

| Ítem | Estado |
|------|--------|
| PR-01 Auth real mobile | ✅ |
| PR-02 ThemeContext hydration | ✅ (sin crashes reportados post-OTA) |
| PR-03 Defaults multi-tenant | ✅ parcial (país/moneda/feriados alineados; vigilar edge cases) |
| PR-04 EAS Build preview APK | ✅ parcial — falta canal internal testing formal |
| PR-05 Anti-solapamiento | ✅ |
| PR-06 / PR-06B Panel servicios | ✅ |
| PR-07 CI GitHub Actions | ✅ |
| PR-08 Error handling crítico | ✅ base (`ErrorState`) |
| PR-09 Push FCM E2E | ❌ Pendiente |
| PR-10 / PR-10B WABA avanzado + reenganche | ❌ Bloqueado tras S4 + PR-09 |
| PR-11 Panel web resto | ❌ En curso (esta semana: clientes) |

---

## Sprint 1 — P0 desbloqueante

| PR | Descripción | Estado |
|----|-------------|--------|
| PR-01 | Auth real mobile + perfiles | ✅ |
| PR-02 | ThemeContext hydration | ✅ |
| PR-03 | Unificación defaults tenant-config/DB | ✅ parcial |

---

## Sprint 2 — features beta core

| PR | Descripción | Estado |
|----|-------------|--------|
| PR-04 | EAS Build beta + internal testing | ✅ APK; ⏳ canal formal |
| PR-05 | Anti-solapamiento citas | ✅ |
| PR-06 / 06B | `/panel/servicios` catálogo completo | ✅ |

---

## Sprint 3 — calidad + WABA/push

| PR | Descripción | Estado |
|----|-------------|--------|
| PR-07 | CI GitHub Actions | ✅ |
| PR-08 | Error handling dashboard/finanzas/agenda | ✅ base |
| PR-09 | Push FCM E2E (`push_token` + `send-notification`) | ❌ |
| PR-10 | Bot WABA capa ZM v3.0 (capacidad, silence-watchdog, refs) | ❌ (base multi-tenant ✅) |
| PR-10B | Motor reenganche WABA multi-tenant | ❌ post-beta / post-S4 |

---

## PR-11 — Panel web completo

> No bloquea beta móvil; sí utilidad real del panel para Tenant #1.

| Ruta | Prioridad | Estado |
|------|-----------|--------|
| `/panel/servicios` | P1 | ✅ |
| `/panel/horarios` | P1 | ✅ |
| `/panel/clientes` | P1 | ✅ **10-sep** (lista, KPIs, segmentos, drawer historial) |
| `/panel/personal` | P1 | ✅ **10-sep** (lista, CRUD, foto, comisiones, dialecto ZM/Geema) |
| `/panel/configuracion` | P1 | ✅ **10-sep** (datos, colores, logo, presencia web) |
| `/panel/agenda` | P1 | ✅ **10-sep** (grilla día read-only + drawer) |
| `/panel/waba` | P1 | ❌ (S6) |
| `/panel/agenda` | P1 | ❌ |
| `/panel/configuracion` | P1 | ❌ |
| `/panel/configuracion/web` | P2 | ❌ |
| `/panel/waba/campanas` | P2 | ❌ |
| `/panel/inventario` | P2 | ❌ |

Orden: `clientes` → `personal` → `configuracion` → `agenda` → `waba`.

Ver [docs/WEB_ARCHITECTURE.md](docs/WEB_ARCHITECTURE.md).

---

## Migración ZM ↔ Geema (Plan 05) — semáforo

| Sprint | Tema | Estado |
|--------|------|--------|
| S1–S3 | Schema P0 + bridge tenant + WABA runtime | ✅ |
| **S4** | Crons/RPCs tenant-aware + Vault | ❌ **siguiente crítico (repo ZM)** |
| S5 / S5-B | Reglas L3 + branding logo | Parcial |
| **S5-C** | Paridad mobile shadow | ✅ casi; quedan S5C-8/9 + smoke Finanzas |
| S6 | Presets L4 + `/panel/waba/*` | ❌ |
| S7+ | Go-live 2.º tenant | ❌ |

Detalle: [`docs/plans/geema-migration/`](docs/plans/geema-migration/README.md).

### S5-C restos

| ID | Tarea | Estado |
|----|-------|--------|
| S5C-8 | Dashboard ranking top servicios + alertas feriado | Pendiente (esta semana si sobra) |
| S5C-9 | Hint UI dónde está Finanzas | ✅ 10-sep |
| Smoke Finanzas ZM | Pagos visibles en Más → Finanzas | Pendiente (**vie 11**) |
| Costos WABA en Finanzas | `PricingBreakdownCard` | Bloqueado a suite WABA |

---

## Landing multi-tenant

| Fase | Qué | Estado |
|------|-----|--------|
| 1 | Templates + secciones + mirror `zm-demo` | ✅ |
| 2 | CMS mobile “Mi web” | ❌ |
| 3 | Dominio propio + contenido real ZM | ❌ |

---

## Post-beta / backlog

- PromoMasivaScreen (requiere WABA validado)
- Sentry mobile, `ClientCard` rediseño, Look Preview (Plan 07)
- Testing por capas, SEO/a11y web
- Optimización queries + timezone dashboard web

---

## Métricas de éxito (beta)

| Métrica | Objetivo |
|---------|----------|
| Crasheos en arranque | 0 en build nativo |
| Flujo auth → agenda | happy path sin error |
| CI PRs primer intento | > 80% |
| Dashboard mobile | < 2s en 4G |
| Citas con solapamiento | 0 |

---

## Notas de gestión

- Si una tarea P0 de la semana queda incompleta, no abrir S6/WABA avanzado.
- S4 vive sobre todo en repo ZM — no mezclar con PR-11 en el mismo hilo sin cambio de contexto explícito.
- DDL en `udelxwwnyivknslueerr` requiere confirmación explícita (p. ej. RPC S5C-8).
- `PromoMasivaScreen` y PR-10B fuera de beta v1.5.

---

_Actualizado: 10 sep 2026 — alineación estado real + foco semanal._
