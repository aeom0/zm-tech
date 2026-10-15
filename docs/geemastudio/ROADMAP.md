# ROADMAP GeemaStudio (2026) — ruta a beta v1.5

## Objetivo

Llegar a la primera beta de producción lo antes posible, intercalando estabilización técnica mínima con las features que realmente desbloquean el lanzamiento. No hay "primero limpiar todo y luego features" — cada sprint entrega valor concreto.

---

## Principios de ejecución

- **Beta primero**: cada decisión se toma preguntando si acerca o aleja la beta.
- **Plan 04 (ago 2026)**: fuente canónica del estado de migración ZM ↔ Geema y la suite WABA multi-vertical. Este roadmap solo cubre beta, producto y prioridades propias de Geema.
- Estabilizar lo mínimo indispensable, no lo perfecto.
- Features y deuda técnica en paralelo cuando no hay dependencia entre sí.
- Entregar en incrementos pequeños con criterios de aceptación claros.
- Mantener consistencia multi-tenant (moneda, terminología, branding, permisos).
- Quality gate mínimo: `pnpm check:types` / typecheck workspaces antes de todo commit.

---

## Estado actual (v1.5-unreleased — 12-oct 2026)

### Completado

- Monorepo: `apps/geemastudio-{mobile,web,server}`, `@geemastudio/shared-schema`, `@zmtech/tenant-config`
- TypeScript ~6, Expo SDK 56, React 19.2, New Architecture
- **Auth real** mobile: `signInWithPassword` + `profiles` + roles (`dev` \| `owner` \| `staff`)
- Core mobile: onboarding, agenda, servicios/packs/promos, clientes, inventario, finanzas, feriados, colores de marca, splash tenant, promo broadcast WA, ventas de productos, Equipo (horarios, ausencias, servicios por profesional)
- Core web: `/panel/*` P1 (clientes, personal, config, agenda, servicios, horarios) + suite WABA (campañas, mensajes, historial, portafolio, simulador, Haiku, reglas)
- Productos: catálogo + ventas `product_orders` (web y mobile) ✅ 23-sep
- Finanzas ejecutiva web (Resumen \| Detalle) ✅ 22-sep; pagos en Bs con tasas BCV/USDT para tenants VE ✅ 5-oct
- Planes de suscripción (Plan 17 F1–F4) ✅ 2/3-oct; gestión de profesionales (Plan 18 F0–F7) ✅ 3-oct
- **PR-09 Push FCM**: P0 + P8–P10 + P18–P23 ✅ (push físico validado)
- **Corte 1** (panel y app de ZM en Geema) validado el 2-oct; ZM retiró su mobile y panel el 5-oct ([Plan 13 § Validación Corte 1](docs/plans/13-PLAN-panel-parity-zm-lash.md))
- **Migración Plan 04**: S1–S5 ✅; traslado de la suite WABA a `geemastudio-server` ✅ 6-oct (Plan 04/10 F0–F5). Edge solo se despliega desde zm-tech (`edge-functions.yml`)
- **Agente Haiku 5.5** atiende el WABA de ZM Lash desde el 8-oct (Fases 1–2 del [cutover](../../apps/geemastudio-server/docs/waba/plan-cutover-agente-haiku.md)); el bot clásico queda de respaldo
- Auditoría de citas (`appointment_audit`) y traza de reprogramación ✅ 12-oct
- **Host**: `https://geema.zmtechdev.com`

### Pendientes (lista única, prioridad)

> Esta tabla es la única lista de pendientes de Geema. Los planes guardan el detalle; si un plan y esta tabla difieren, se corrige el plan.

| #   | Ítem                                                                                                | Detalle                                                                                                                                                                                                                                                                                                                                                   | Bloqueo                    |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | **Fase 3 del cutover del agente**: borrar el dispatcher clásico                                     | PR aparte tras una semana estable desde el 8-oct. Hoy el dispatcher aún atiende party, curso, no-show, botones de plantilla y listas de categoría/día/hora                                                                                                                                                                                                | Estabilidad (≈ 15-oct)     |
| 2   | Notas de voz en el agente                                                                           | Transcribir antes del agente y escalar solo si hay problema o pide persona                                                                                                                                                                                                                                                                                | —                          |
| 3   | Actualizar la regla de `AGENTS.md` «regex para dinero/citas» → «las herramientas validan en código» | Lo pide el plan de cutover al cerrar la Fase 2 (ya desplegada)                                                                                                                                                                                                                                                                                            | —                          |
| 4   | Repartir un pago en servicio + producto                                                             | `PaymentModal` sin split; mostrar `kind` en finanzas web                                                                                                                                                                                                                                                                                                  | Web hecho (Plan 19 F1); falta UI en mobile |
| 5   | Smoke Finanzas en APK                                                                               | Validación mobile pendiente                                                                                                                                                                                                                                                                                                                               | —                          |
| 6   | Promo broadcast: primer envío desde el asistente (web o app) | Envío real probado en prod (21-sep y 6-oct, 279 sin fallas, con service role). Asistente web listo (Plan 19 W10); falta probarlo con la sesión del dueño a teléfonos QA | —                          |
| 7   | Reenganche de retoque desde el panel/app con `send-retouch-reengage`                                | La EF está desplegada; el botón de la app abre WhatsApp con texto, no usa la EF (Plan 13 G6)                                                                                                                                                                                                                                                              | —                          |
| 8   | Plan 18: sugerir solo profesionales elegibles al asignar + revisión visual en teléfono (web: hecho en Plan 19 F2) | —                                                                                                                                                                                                                                                                                                                                                         | Validar config con Vanessa |
| 9   | Nombres de packs «tinturado»                                                                        | Ver propuesta abajo                                                                                                                                                                                                                                                                                                                                       | Confirmación de Vanessa    |
| 10  | Corte 2 — landing `zmlashnails.com` (Modo D, repo ZM)                                               | Reseñas reales, `web_team`, `web_whatsapp`, banner, video, imágenes a Storage                                                                                                                                                                                                                                                                             | Datos y OK de Vanessa      |
| 11  | Cotizador de diseños de uñas                                                                        | [Plan](../../apps/geemastudio-server/docs/waba/plan-cotizador-disenos-unas.md): 51 fotos esperando etiquetas                                                                                                                                                                                                                                              | Etiquetas del salón        |
| 12  | Plan 04/10 F6 + smoke `waba_tenant_routing_enabled`                                                 | Parametrizar hardcodes de ZM (nombre, dirección, abono, copy); flag hoy `false`                                                                                                                                                                                                                                                                           | Antes del 2.º tenant       |
| 13  | S6 (presets L4 por vertical) y S7 (2.º tenant + loop Meta Ads)                                      | [Plan 04](docs/plans/04-geema-migration/04-ROADMAP-SPRINTS.md)                                                                                                                                                                                                                                                                                            | F6                         |
| 14  | Plan 12: portar formato de quotes/plantillas al webhook (M14/M18)                                   | Decidir si vale la pena                                                                                                                                                                                                                                                                                                                                   | Decisión                   |
| 15  | Plan 14 P2 (CRM clientes) · Plan 15 Inventario mobile · bot retail                                  | Bot retail pausado por producto                                                                                                                                                                                                                                                                                                                           | Decisión de producto       |
| 16  | Push FCM: ajustes de assets · EAS canal formal                                                      | —                                                                                                                                                                                                                                                                                                                                                         | —                          |
| 17  | Plan 17 F5 (descarga del APK)                                                                       | Opcional: la PWA es el canal principal (Plan 19 W13). El APK se envía por WhatsApp; Supabase Free limita a 50 MB (R2 o Pro)                                                                                                                                                                                                                                                                                     | Decisión de costo          |
| 18  | **Plan 19: paridad mobile ↔ web**                                                                   | F0 paquete `@geemastudio/data` → F1 web: agenda, clientes y pagos con escritura + vista staff → F2 web: feriados, validación, asignar, inventario, notificaciones → F3 web: promo masiva, reordenar, dashboard → F3b web: alta de negocio self-service, onboarding y PWA (W13) → F4 mobile: bandeja WhatsApp. Absorbe #4 (F1) y la parte «solo elegibles» de #8 (F2). [Plan 19](docs/plans/19-PLAN-paridad-mobile-web.md) | F0–F3 en web; faltan smoke, F3b y F4 |

### Propuesta: `title` / `short_name` de packs y servicios «tinturado» (5-oct 2026)

Problema: en WhatsApp (título de lista interactiva ≤ 24 caracteres) «Lifting + Tinturado» se recorta y no dice si el tinte es de pestañas, de cejas o efecto rímel. Hoy en BD: «Diseño + Tinturado de Cejas» (S/50), «Diseño Cejas + Tinturado» (S/70), «Lifting + Tinturado» (S/60). Los tres nombres son parecidos y ambiguos.

Regla propuesta: `title` completo y explícito; `short_name` ≤ 24 caracteres con el objeto (pestañas/cejas) siempre visible. Borrador (a validar con Vanessa, incluido si «rímel» es servicio aparte o variante):

| Actual                        | `title` propuesto                                                                 | `short_name` propuesto |
| ----------------------------- | --------------------------------------------------------------------------------- | ---------------------- |
| Lifting + Tinturado           | Lifting de Pestañas + Tinte de Pestañas                                           | Lifting + Tinte Pest.  |
| Diseño + Tinturado de Cejas   | Diseño de Cejas + Tinte de Cejas                                                  | Diseño + Tinte Cejas   |
| Diseño Cejas + Tinturado      | (duplicado del anterior: confirmar diferencia con Vanessa y fusionar o renombrar) | —                      |
| Efecto rímel (si es variante) | Tinte de Pestañas efecto Rímel                                                    | Tinte Pest. Rímel      |

Pasos: confirmar con Vanessa → UPDATE de `services`/`packs` (title, short_name) vía migración o panel → revisar prompts Haiku y listas WABA que citen esos nombres. No cambiar precios ni `service_ids`.

### Riesgos activos

- Fase 3 del agente: borrar el dispatcher elimina el respaldo; hacerlo solo con una semana estable y con el flag `agent_enabled` como rollback mientras exista el bot viejo
- F6 (hardcodes de ZM en Edge) bloquea un 2.º tenant con bot completo
- Retail bot pausado por producto; no está bloqueado por drift del webhook

### Beta gate (actualizado 12-oct 2026)

| Ítem                                      | Estado                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| PR-01…PR-08                               | ✅ (ver historial abajo)                                                      |
| PR-09 Push FCM E2E                        | ✅ P0 + P8–P10 + P18–P23; ajustes de assets en curso                          |
| PR-10 / PR-10B WABA avanzado + reenganche | ✅ para ZM Lash (suite trasladada 6-oct + agente 8-oct); multi-tenant tras F6 |
| PR-11 Panel web                           | ✅ P1 + suite WABA + Productos/Ventas                                         |

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

| PR     | Descripción                                                                         | Estado                                                  |
| ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| PR-07  | CI GitHub Actions                                                                   | ✅                                                      |
| PR-08  | Error handling dashboard/finanzas/agenda                                            | ✅ base                                                 |
| PR-09  | Push FCM E2E — nativo FCM v1 (`push_token` + `send-notification`); **no** Expo Push | ✅ P0 + P8–P10 22-sep, P18–P20 23-sep; assets en ajuste |
| PR-10  | Bot WABA capa ZM v3.0 (capacidad, silence-watchdog, refs)                           | ✅ suite ZM trasladada a `geemastudio-server` (6-oct)   |
| PR-10B | Motor reenganche WABA multi-tenant                                                  | ✅ crons tenant-aware (S4); 2.º tenant tras F6          |

---

## PR-11 — Panel web completo

> No bloquea beta móvil; sí utilidad real del panel para Tenant #1.

| Ruta                         | Prioridad | Estado                                                                                                |
| ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `/panel/servicios`           | P1        | ✅                                                                                                    |
| `/panel/horarios`            | P1        | ✅                                                                                                    |
| `/panel/clientes`            | P1        | ✅ **10-sep** (lista, KPIs, segmentos, drawer historial)                                              |
| `/panel/personal`            | P1        | ✅ **10-sep** (lista, CRUD, foto, comisiones, dialecto ZM/Geema)                                      |
| `/panel/configuracion`       | P1        | ✅ **10-sep** (datos, colores, logo, presencia web)                                                   |
| `/panel/agenda`              | P1        | ✅ **10-sep** (grilla día read-only + drawer)                                                         |
| `/panel/waba`                | P1        | ✅ **22-sep**: paridad tabs ZM + Estado (campañas, portafolio, mensajes, simulador, haiku, historial) |
| `/panel/servicios` Productos | P1        | ✅ catálogo (22-sep) + Ventas `product_orders` (23-sep)                                               |
| `/panel/configuracion/web`   | P2        | ✅ parcial (CMS Mi Web)                                                                               |
| `/panel/waba/campanas`       | P1        | ✅ **21-sep**                                                                                         |
| `/panel/waba/historial`      | P1.5      | ✅ **22-sep**                                                                                         |
| `/panel/waba/portafolio`     | P2        | ✅ **22-sep**                                                                                         |
| `/panel/waba/simulador`      | P2        | ✅ **22-sep** (reusa EF `waba-chat-simulator`)                                                        |
| `/panel/waba/reglas`         | P1        | ✅ **28-sep** (S5: horario, abono, staff)                                                             |
| `/panel/inventario`          | P2        | ❌                                                                                                    |

Orden P1 cerrado: ~~`clientes` → `personal` → `configuracion` → `agenda` → `waba`~~.

Ver [docs/WEB_ARCHITECTURE.md](docs/WEB_ARCHITECTURE.md).

---

## Migración ZM ↔ Geema

El estado de S1–S7, los gates multi-tenant, S4, S5-C, S6 y el segundo tenant
vive únicamente en el Plan 04:

- [Resumen ejecutivo](docs/plans/04-geema-migration/00-RESUMEN-EJECUTIVO.md)
- [Roadmap de migración](docs/plans/04-geema-migration/04-ROADMAP-SPRINTS.md)
- [Plan 04 y reglas de sincronización](docs/plans/04-geema-migration/README.md)

Este archivo no replica ese semáforo para evitar estados contradictorios.

---

## Landing multi-tenant

| Fase | Qué                                      | Estado                                                                                                                   |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | Templates + secciones + mirror `zm-demo` | ✅                                                                                                                       |
| 2    | CMS mobile “Mi Web” (OTA preview 12-sep) | ✅ parcial — ver [`docs/plans/11-PLAN-mi-web-cms-fase2.md`](docs/plans/11-PLAN-mi-web-cms-fase2.md)                      |
| 3    | Contenido real ZM en su landing propia   | 🟡 Modo D en prod (oct); faltan reseñas, banner, video e imágenes a Storage. Modo A (DNS a Geema) descartado por legales |

Pendiente post–Fase 2: `web_mode` explícito en la UI y sync catálogo → `web_services` (backlog). Sanity ya se retiró (5-oct).

---

## Post-beta / backlog

- Sentry mobile, `ClientCard` rediseño, Look Preview (Plan 07)
- Testing por capas, SEO/a11y web
- Optimización queries + timezone dashboard web
- Acceso biométrico en la PWA del panel (WebAuthn): fase 1 desbloqueo local con huella/Face ID (toggle en ajustes, sobre la sesión Supabase); fase 2 passkey como login real (Edge Function + tabla de credenciales, requiere DDL con confirmación)

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
- DDL en `udelxwwnyivknslueerr` requiere confirmación explícita (p. ej. RPC S5C-8).

---

_Actualizado: 12 oct 2026 — beta/producto Geema; el estado de migración vive en Plan 04._
