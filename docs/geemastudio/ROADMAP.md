# ROADMAP GeemaStudio (2026) — ruta a beta v1.5

## Objetivo

Llegar a la primera beta de producción lo antes posible, intercalando estabilización técnica mínima con las features que realmente desbloquean el lanzamiento. No hay "primero limpiar todo y luego features" — cada sprint entrega valor concreto.

---

## Principios de ejecución

- **Beta primero**: cada decisión se toma preguntando si acerca o aleja la beta.
- **Plan 05 (ago 2026)**: fuente canónica del estado de migración ZM ↔ Geema y la suite WABA multi-vertical. Este roadmap solo cubre beta, producto y prioridades propias de Geema.
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
| 1 | P14–P17/P2 push WABA | zm-tech | P9/P10 ✅ 22-sep; P18–P20 ✅ 23-sep; siguiente P21–P23 (Haiku sin crédito, chat-quality-review push, trigger asignación) |
| 2 | Ventas `product_orders` en Geema | zm-tech | Tras catálogo; ZM ya tiene UI |
| — | S4 crons tenant-aware | ZM | Solo si se abre Track B (2.º tenant) |

**Hecho esta tanda:** Historial · Portafolio · deep link · **Simulador** (Plan 11 F4, reusa EF ZM).

**Fuera de esta semana:** retail bot / `add_to_cart` productos (pausado por decisión de producto); S7 2.º tenant.

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
- **Plan 11/12 WABA web**: Historial, Portafolio, deep link Clientes→Mensajes y Simulador ✅ 22-sep
- **Plan 12 Finanzas**: Resumen|Detalle web + enlaces PanelShell ✅ 22-sep
- **PR-09 Push FCM**: P0 + P8 + P9 + P10 ✅ 22-sep + P18–P20 ✅ 23-sep; push físico, cita WABA y pago por validar validados, ajustes de assets en curso
- **Host**: `https://geema.zmtechdev.com`
- Migración Plan 05: **S1–S3** ✅; **S4** ❌ (repo ZM)

### Pendientes (prioridad)

| # | Ítem | Repo | Notas |
|---|------|------|-------|
| 1 | P14–P17/P2 push WABA | zm-tech | P9/P10 ✅ 22-sep; P18–P20 ✅ 23-sep; siguiente P21–P23 |
| 2 | Ventas `product_orders` en Geema | zm-tech | Tras catálogo; ZM ya tiene UI |
| 3 | **S4** crons + Vault | ZM | Bloquea 2.º tenant |
| 4 | Smoke Finanzas ZM en APK | zm-tech | Validación mobile pendiente |

### Riesgos activos

- Push FCM (**PR-09**): P0 + P8–P10 + P18–P20 ✅ (push físico validado); ajustes de assets en curso; EF canónica en repo ZM (no portar)
- S4 (crons WABA) bloquea 2.º tenant con bot completo
- Retail bot pausado por producto; no está bloqueado por drift del webhook

### Beta gate (actualizado 22-sep 2026)

| Ítem | Estado |
|------|--------|
| PR-01…PR-08 | ✅ (ver historial abajo) |
| PR-09 Push FCM E2E | ✅ P0 + P8–P10 + P18–P20; ajustes de assets en curso |
| PR-10 / PR-10B WABA avanzado + reenganche | ❌ post-S4 |
| PR-11 Panel web | ✅ P1 + Campañas + inbox + Historial + Portafolio + Simulador |

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
| PR-09  | Push FCM E2E — nativo FCM v1 (`push_token` + `send-notification`); **no** Expo Push | ✅ P0 + P8–P10 22-sep, P18–P20 23-sep; assets en ajuste |
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
| `/panel/waba`              | P1        | ✅ **22-sep**: paridad tabs ZM + Estado (campañas, portafolio, mensajes, simulador, haiku, historial) |
| `/panel/servicios` Productos | P1      | ✅ catálogo (22-sep); ⏳ Ventas `product_orders`                                              |
| `/panel/configuracion/web` | P2        | ✅ parcial (CMS Mi Web)                                                                       |
| `/panel/waba/campanas`     | P1        | ✅ **21-sep**                                                                                 |
| `/panel/waba/historial`    | P1.5      | ✅ **22-sep**                                                                                 |
| `/panel/waba/portafolio`   | P2        | ✅ **22-sep**                                                                                 |
| `/panel/waba/simulador`    | P2        | ✅ **22-sep** (reusa EF `waba-chat-simulator`)                                                |
| `/panel/inventario`        | P2        | ❌                                                                                            |

Orden P1 cerrado: ~~`clientes` → `personal` → `configuracion` → `agenda` → `waba`~~.

Ver [docs/WEB_ARCHITECTURE.md](docs/WEB_ARCHITECTURE.md).

---

## Migración ZM ↔ Geema

El estado de S1–S7, los gates multi-tenant, S4, S5-C, S6 y el segundo tenant
vive únicamente en el Plan 05:

- [Resumen ejecutivo](docs/plans/geema-migration/00-RESUMEN-EJECUTIVO.md)
- [Roadmap de migración](docs/plans/geema-migration/04-ROADMAP-SPRINTS.md)
- [Plan 05 y reglas de sincronización](docs/plans/geema-migration/README.md)

Este archivo no replica ese semáforo para evitar estados contradictorios.


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

_Actualizado: 22 sep 2026 — beta/producto Geema; el estado de migración vive en Plan 05._
