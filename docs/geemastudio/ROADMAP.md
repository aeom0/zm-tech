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

## Foco semana 22–28 sep 2026

> Orden concreto. No mezclar S4 (repo ZM) con Plan 11 (zm-tech) en la misma sesión salvo cambio de contexto explícito.

| # | Entregable | Repo | DoD |
|---|------------|------|-----|
| 0 | ~~Alinear docs Plan 05 + scorecard Plan 12~~ | ambos | ✅ 22-sep |
| 1 | **Simulador WABA** (Plan 11 F4) | zm-tech | Pre go-live |
| 2 | (Paralelo otra sesión) reconciliar drift `whatsapp-webhook` prod v655 | ZM | Bundle versionado |
| — | S4 crons tenant-aware | ZM | Solo si se abre Track B (2.º tenant) |

**Hecho esta tanda:** Historial · Portafolio · deep link Clientes→Mensajes (Plan 12 P3).

**Fuera de esta semana:** retail bot / `add_to_cart` productos (bloqueado por drift webhook); S7 2.º tenant.

---

## Estado actual (v1.5-unreleased — 22-sep 2026)

### Completado (hasta 22-sep 2026)

- Monorepo: `apps/geemastudio-{mobile,web,server}`, `@geemastudio/shared-schema`, `@zmtech/tenant-config`
- TypeScript ~6, Expo SDK 56, React 19.2, New Architecture
- **Auth real** mobile: `signInWithPassword` + `profiles` + roles (`dev` \| `owner` \| `staff`)
- Core mobile: onboarding, agenda, servicios/packs/promos, clientes, inventario, finanzas, feriados, colores de marca, splash tenant, promo broadcast WA
- **S5-C P0/P1 mayor**: packs/promos/timezone/employees ✅ (#30); multi-servicio + refs ✅ (#31); feriados ✅; finanzas ejecutiva mobile ✅ (costos WABA UI pendiente); **S5C-9** hint Finanzas ✅
- Core web: `/panel/*` P1 (clientes, personal, config, agenda, servicios, horarios, WABA)
- **Plan 11**: F0/F1 cerradas (21-sep); F2 Haiku ✅; F3 inbox staff ✅; F5.1 Campañas ✅
- Theming panel + PWA dinámico + tab Productos (catálogo) ✅ 22-sep
- **Host**: `https://geema.zmtechdev.com`
- Migración Plan 05: **S1–S3** ✅; **S4** ❌ (repo ZM)

### Pendientes (prioridad)

| # | Ítem | Repo | Notas |
|---|------|------|-------|
| 1 | **Simulador WABA** (Plan 11 F4) | zm-tech | Pre go-live Vanessa |
| 2 | Finanzas ejecutiva web | zm-tech | Plan 12 P1 |
| 3 | Ventas `product_orders` en Geema | zm-tech | Tras catálogo; ZM ya tiene UI |
| 4 | Reconciliar webhook prod v655 | ZM | Antes de bot retail / redeploy |
| 5 | **S4** crons + Vault | ZM | Bloquea 2.º tenant |
| 6 | **PR-09** Push FCM E2E | zm-tech | Plan 12 Fase X |
| 7 | Smoke Finanzas ZM en APK | zm-tech | DoD S5-C abierto |

### Riesgos activos

- **Drift `whatsapp-webhook`**: prod v655 sin mirror limpio en repos (CHANGELOG Geema 22-sep) — no redeployar a ciegas
- Push FCM (**PR-09**): token se descarta; sin EF `send-notification` en repo Geema
- S4 (crons WABA) bloquea 2.º tenant con bot completo
- Retail bot pausado hasta reconciliar webhook

### Beta gate (actualizado 22-sep 2026)

| Ítem | Estado |
|------|--------|
| PR-01…PR-08 | ✅ (ver historial abajo) |
| PR-09 Push FCM E2E | ❌ Plan 12 Fase X |
| PR-10 / PR-10B WABA avanzado + reenganche | ❌ post-S4 |
| PR-11 Panel web | ✅ P1 + Campañas + inbox; ⏳ Historial/Portafolio |

---

## Sprint 1 — P0 desbloqueante

| PR    | Descripción                           | Estado     |
| ----- | ------------------------------------- | ---------- |
| PR-01 | Auth real mobile + perfiles           | ✅         |
| PR-02 | ThemeContext hydration                | ✅         |
| PR-03 | Unificación defaults tenant-config/DB | ✅ parcial |

---

## Sprint 2 — features beta core

| PR          | Descripción                          | Estado                  |
| ----------- | ------------------------------------ | ----------------------- |
| PR-04       | EAS Build beta + internal testing    | ✅ APK; ⏳ canal formal |
| PR-05       | Anti-solapamiento citas              | ✅                      |
| PR-06 / 06B | `/panel/servicios` catálogo completo | ✅                      |

---

## Sprint 3 — calidad + WABA/push

| PR     | Descripción                                               | Estado                    |
| ------ | --------------------------------------------------------- | ------------------------- |
| PR-07  | CI GitHub Actions                                         | ✅                        |
| PR-08  | Error handling dashboard/finanzas/agenda                  | ✅ base                   |
| PR-09  | Push FCM E2E — nativo FCM v1 (`push_token` + `send-notification`); **no** Expo Push | ❌ Plan 12 Fase X |
| PR-10  | Bot WABA capa ZM v3.0 (capacidad, silence-watchdog, refs) | ❌ (base multi-tenant ✅) |
| PR-10B | Motor reenganche WABA multi-tenant                        | ❌ post-beta / post-S4    |

---

## PR-11 — Panel web completo

> No bloquea beta móvil; sí utilidad real del panel para Tenant #1.

| Ruta                       | Prioridad | Estado                                                                    |
| -------------------------- | --------- | ------------------------------------------------------------------------- |
| `/panel/servicios`         | P1        | ✅                                                                        |
| `/panel/horarios`          | P1        | ✅                                                                        |
| `/panel/clientes`          | P1        | ✅ **10-sep** (lista, KPIs, segmentos, drawer historial)                  |
| `/panel/personal`          | P1        | ✅ **10-sep** (lista, CRUD, foto, comisiones, dialecto ZM/Geema)          |
| `/panel/configuracion`     | P1        | ✅ **10-sep** (datos, colores, logo, presencia web)                       |
| `/panel/agenda`            | P1        | ✅ **10-sep** (grilla día read-only + drawer)                             |
| `/panel/waba`              | P1        | ✅ **22-sep**: estado + campañas + portafolio + mensajes + Haiku + Historial; ⏳ Simulador |
| `/panel/servicios` Productos | P1      | ✅ catálogo (22-sep); ⏳ Ventas `product_orders`                                              |
| `/panel/configuracion/web` | P2        | ✅ parcial (CMS Mi Web)                                                                       |
| `/panel/waba/campanas`     | P1        | ✅ **21-sep**                                                                                 |
| `/panel/waba/historial`    | P1.5      | ✅ **22-sep**                                                                                 |
| `/panel/waba/portafolio`   | P2        | ✅ **22-sep**                                                                                 |
| `/panel/inventario`        | P2        | ❌                                                                                            |

Orden P1 cerrado: ~~`clientes` → `personal` → `configuracion` → `agenda` → `waba`~~.

Ver [docs/WEB_ARCHITECTURE.md](docs/WEB_ARCHITECTURE.md).

---

## Migración ZM ↔ Geema (Plan 05) — semáforo

| Sprint    | Tema                                     | Estado                                             |
| --------- | ---------------------------------------- | -------------------------------------------------- |
| S1–S3     | Schema P0 + bridge tenant + WABA runtime | ✅                                                 |
| **S4**    | Crons/RPCs tenant-aware + Vault          | ❌ **siguiente crítico (repo ZM)**                 |
| S5 / S5-B | Reglas L3 + branding logo                | Parcial                                            |
| **S5-C**  | Paridad mobile shadow                    | ✅ casi; quedan S5C-8/9 + smoke Finanzas           |
| S6        | Presets L4 + `/panel/waba/*`             | 🟡 Mensajes/Haiku/Campañas ✅; Historial/Portafolio/Simulador ❌ |
| S7+       | Go-live 2.º tenant                       | ❌                                                 |

Detalle: [`docs/plans/geema-migration/`](docs/plans/geema-migration/README.md).

### S5-C restos

| ID                      | Tarea                                             | Estado                           |
| ----------------------- | ------------------------------------------------- | -------------------------------- |
| S5C-8                   | Dashboard ranking top servicios + alertas feriado | Pendiente (esta semana si sobra) |
| S5C-9                   | Hint UI dónde está Finanzas                       | ✅ 10-sep                        |
| Smoke Finanzas ZM       | Pagos visibles en Más → Finanzas                  | Pendiente (**vie 11**)           |
| Costos WABA en Finanzas | `PricingBreakdownCard`                            | Bloqueado a suite WABA           |

---

## Landing multi-tenant

| Fase | Qué                                      | Estado                                                                                              |
| ---- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1    | Templates + secciones + mirror `zm-demo` | ✅                                                                                                  |
| 2    | CMS mobile “Mi Web” (OTA preview 12-sep) | ✅ parcial — ver [`docs/plans/10-PLAN-mi-web-cms-fase2.md`](docs/plans/10-PLAN-mi-web-cms-fase2.md) |
| 3    | Dominio propio + contenido real ZM       | ❌                                                                                                  |

Pendiente post–Fase 2: `/panel/configuracion/web`, migrar Sanity → `zm-lash-nails`, `web_mode` UI, sync catálogo→`web_services`.

---

## Post-beta / backlog

- PromoMasivaScreen (requiere WABA validado)
- Sentry mobile, `ClientCard` rediseño, Look Preview (Plan 07)
- Testing por capas, SEO/a11y web
- Optimización queries + timezone dashboard web

---

## Métricas de éxito (beta)

| Métrica                | Objetivo             |
| ---------------------- | -------------------- |
| Crasheos en arranque   | 0 en build nativo    |
| Flujo auth → agenda    | happy path sin error |
| CI PRs primer intento  | > 80%                |
| Dashboard mobile       | < 2s en 4G           |
| Citas con solapamiento | 0                    |

---

## Notas de gestión

- Si una tarea P0 de la semana queda incompleta, no abrir S6/WABA avanzado.
- S4 vive sobre todo en repo ZM — no mezclar con PR-11 en el mismo hilo sin cambio de contexto explícito.
- DDL en `udelxwwnyivknslueerr` requiere confirmación explícita (p. ej. RPC S5C-8).
- `PromoMasivaScreen` y PR-10B fuera de beta v1.5.

---

_Actualizado: 22 sep 2026 — docs alineados Plan 05/11/12; siguiente = Historial WABA._
