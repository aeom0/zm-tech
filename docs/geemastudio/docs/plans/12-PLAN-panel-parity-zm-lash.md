# Panel interno GeemaStudio ≥ ZM Lash — paridad completa

> **Responsabilidad documental:** este plan es la fuente del scorecard de paridad del panel y del criterio de go-live Vanessa. Plan 11 conserva el detalle de implementación WABA; Plan 05 conserva el estado ejecutivo de migración.

> Estado: **en curso** (actualizado 22-sep-2026). Complementa [`11-PLAN-waba-suite-parity.md`](11-PLAN-waba-suite-parity.md).
>
> Meta: el panel web de Geema (`apps/geemastudio-web`) debe ser **igual o superior** al de ZM Lash canónico (`ZM-Lash-and-Nails-Beauty/apps/web`) antes de migrar a Vanessa como tenant real.
>
> **Hecho 22-sep:** Plan 11 WABA suite + Plan 12 P1/P2 finanzas + **PR-09 P0 + P8** (push físico validado en APK de producción; ajustes de assets en curso). **Siguiente:** P9–P10 ops Vanessa.

## Relación con Plan 11

| Doc | Alcance |
|-----|---------|
| **Plan 11** | Suite WABA del panel + deuda técnica + foundations (UUID/RLS/API routes) |
| **Este Plan 12** | Paridad del **panel completo** (no solo WABA): finanzas, shell, clientes, ops web, runtime bot, promo |

Plan 11 sigue siendo el camino de implementación WABA. Este doc:

1. Expone huecos que Plan 11 **no cubre** o **subprioriza**.
2. Define fases de panel no-WABA y runtime bot.
3. Fija criterio Done de paridad side-by-side.

---

## Scorecard actual (22-sep-2026)

Leyenda: ✅ paridad · 🟡 parcial · ❌ falta · ➕ Geema ya superior

| Módulo web | ZM Lash | Geema | Veredicto |
|------------|---------|-------|-----------|
| Shell / nav unificado | Fragmentado (`/finanzas`, `/clientes`, `/servicios`, `/panel/waba`) | `/panel/*` + link Finanzas en PanelShell/Más/Inicio ✅ 22-sep | ➕ |
| Dashboard KPIs | Solo mobile | `/panel` + `/dashboard` | ➕ |
| Agenda | Solo mobile | Grilla **read-only** | ➕ vista; 🟡 sin CRUD |
| Catálogo (cats/servicios/packs/promos) | `/servicios` | `/panel/servicios` | ✅ |
| Productos retail | `/panel/productos` Ventas+Catálogo | Tab Productos catálogo ✅; Ventas ❌ | 🟡 |
| Clientes CRM | `/clientes` + deep link WA | `/panel/clientes` + deep link WA ✅ 22-sep | ✅ |
| Personal | Solo mobile | CRUD web | ➕ |
| Horarios / timezone | Mobile | `/panel/horarios` | ➕ |
| Config + CMS landing | Sanity externo | `/panel/configuracion` + `/web` | ➕ |
| Finanzas operativas | `/finanzas` Detalle | `/finanzas` Detalle multi-tenant | ✅ |
| Finanzas **ejecutiva** (P&L, gastos, break-even) | `ExecutiveDashboard` | `/finanzas` Resumen ✅ 22-sep (Plan 12 P1) | ✅ |
| Inventario | Solo mobile | ❌ web · ✅ mobile | ❌ (ambos sin web) |
| Validación pagos / Asignar staff | Solo mobile | Solo mobile | ❌ web (aceptable si se documenta mobile-first) |
| WABA tabs | **6** (+ simulador) | **7** (estado + 6 de ZM) | ✅ (Geema tiene Estado extra) |
| WABA inbox (uso diario) | Consola staff completa | Consola staff Plan 11 F3 ✅ | ✅ |
| WABA historial | Analytics desktop | `/panel/waba/historial` ✅ 22-sep | ✅ |
| WABA portafolio | Hasta 4 fotos/servicio | `/panel/waba/portafolio` ✅ 22-sep | ✅ |
| WABA simulador | Chat QA fidelidad total | `/panel/waba/simulador` ✅ 22-sep (reusa EF ZM) | ✅ |
| Edge Functions bot/ops | **~25** (repo ZM, BD compartida) | Panel reusa EFs ZM; **bot canónico ZM** (Track C ✅ v655=`main`) | 🟢 Opción A |
| Push FCM E2E | Operativo (ZM APK) | P0 código + P8 push físico ✅; ajustes de assets en curso | ✅ |

Evidencia nav (22-sep):

- Geema WABA: `WabaNav.tsx` → Campañas, Mensajes, Asistente IA (+ página estado)
- Inbox: Plan 11 Fase 3 M1–M23 cerrados
- Productos: `/panel/servicios?tab=productos` (catálogo only)

---

## Huecos del Plan 11 (auditoría)

### A. Fuera de alcance de Plan 11 (hay que cubrir aquí)

| # | Hueco | Por qué importa para Vanessa |
|---|-------|------------------------------|
| G1 | ~~Finanzas ejecutiva web~~ | ✅ 22-sep `/finanzas` Resumen (Plan 12 P1) |
| G2 | ~~Deep link Clientes → hilo WABA~~ | ✅ 22-sep `ClientDetailDrawer` + `waPhone.ts` |
| G3 | ~~Shell: PanelShell ↔ `/finanzas`~~ | ✅ 22-sep (card Inicio + Más + breadcrumb Panel) |
| G4 | Crons / nudges / recordatorios (11+ EFs ZM) | Panel perfecto + bot sin recordatorios = funnel roto → S4 |
| G5 | `countOverlappingAppointments` en webhook Geema | N/A Opción A — bot solo ZM (Track C); no mantener webhook Geema |
| G6 | Promo broadcast WA + Reenganchar | Prod ZM. **Envío masivo mobile** hecho 21-sep — ver R5; `send-retouch-reengage` sigue pendiente |
| G7 | Push FCM E2E | **P0 + P8 ✅** 22-sep — push físico validado en APK de producción; EF canónica ZM. Ajustes de assets en curso |
| G8 | Tenant scoping global en hooks web | Plan 11 solo arregla tablas WABA vía API routes |
| G9 | Legal por jurisdicción tenant | ZM tiene términos/privacidad/libro reclamaciones |
| G10 | Docs stale (`WEB_ARCHITECTURE`, audit 03) | CMS web ya existe; finanzas P1 ✅ — limpiar restos |

### B. Dentro de Plan 11 pero mal priorizados

| Ítem Plan 11 | Problema | Ajuste |
|--------------|----------|--------|
| Fase 5 campañas = "opcional" | En ZM es **puerta de entrada** al módulo WA (`AdminNav` → `/panel/waba/campanas`) | Subir a **P1** tras Haiku/inbox |
| Fase 5 historial = "opcional" | Analytics desktop es valor documentado en `WEB_ARCHITECTURE.md` | Subir a **P1.5** (bajo riesgo: solo queries) |
| Fase 4 simulador = "corte natural" | Correcto técnicamente; crítico QA **antes** de go-live ZM | Mantener después de inbox; no saltar go-live sin él |
| Promos/Reenganchar = "fase separada" | Subestima: schema + stepper + EF | Este Plan 12 §Fase R |
| Fase 1 solo API WABA | No resuelve RLS/tenant del resto del panel | Plan 12 §Fase T (tenant scoping) |
| Sin criterio Done side-by-side | No hay checklist Vanessa-usable | Ver § Criterio Done abajo |

### C. Plan 11 bien priorizado (no tocar)

- Fase 0 deuda técnica (Vanessa hardcode, demo login, copy dominio stale)
- Fase 1 UUID + RLS → API routes (bloqueante)
- Fase 2 Haiku 4 keys + test preview
- Fase 3 inbox = **consola de staff** (checklist M1–M23 en Plan 11; cierre mínimo P0+P1)

---

## Dónde Geema ya gana (no portar hacia atrás)

No diluir estas ventajas al alcanzar paridad WABA:

1. Panel unificado multi-tenant (`/panel/*`) vs logins fragmentados ZM
2. Agenda web (aunque read-only) — ZM no la tiene
3. Personal + Horarios + Config + CMS landing en web
4. Dashboard KPIs en `/dashboard`
5. Onboarding + presets multi-vertical
6. Landing multi-tenant (`/s/[slug]` + middleware `custom_domain`)

Criterio "superior": paridad de capacidades ZM **más** estos puntos, sin romper multi-tenant ni reintroducir hardcodes de salón.

---

## Fases (orden de ejecución)

### Fase 0 — Alineación docs + deuda (rápido)

1. Ejecutar Plan 11 Fase 0 tal cual.
2. Actualizar `WEB_ARCHITECTURE.md`: CMS `/panel/configuracion/web` = ✅; marcar inventario/validación/asignar como decisión mobile-first o P2.
3. Nota en `geema-migration/00-RESUMEN-EJECUTIVO.md`: panel WABA ya no es "solo ZM" — es MVP Geema + gap suite.

### Fase T — Tenant scoping panel (P0, paralelo a Plan 11 Fase 1)

1. Auditoría de hooks web (`hooks/agenda`, `clientes`, `finanzas`, `servicios`, `personal`, `configuracion`) — ¿filtran por `tenant_id` / `tenant_settings.id`?
2. Checklist por módulo: lectura + mutación scoped; tests smoke con 2 tenants demo.
3. No mezclar con API routes WABA: mismo patrón de "sesión + rol" donde RLS no baste.

Ref: `docs/audit/03-AUDIT-paridad-zmlash-geema.md` (ítems P0 no obsoletos).

### Fase P — Panel no-WABA (Plan 11B)

| ID | Entregable | Ref ZM | Prioridad |
|----|------------|--------|-----------|
| P1 | ~~**Finanzas ejecutiva web**: ViewToggle Resumen/Detalle; KPIs, gastos, break-even, charts~~ | `apps/web/.../executive/*` | ✅ 22-sep Geema `/finanzas` |
| P2 | ~~Links en `PanelShell` → `/finanzas`; card en `/panel`; vuelta Panel desde finanzas~~ | — | ✅ 22-sep |
| P3 | ~~Clientes: botón "Abrir chat WA" → `/panel/waba/mensajes?phone=` (misma normalización que ZM)~~ | `ClientDetailSidebar.tsx` L664 | ✅ 22-sep (`ClientDetailDrawer` + `waPhone.ts`) |
| P4 | Decisión documentada: Validación pagos + Asignar profesionales = **mobile-first** hasta backlog web, **o** MVP web de cola | mobile screens | P2 |
| P5 | Inventario web CRUD (si Vanessa lo pide en desktop) | `InventoryScreen` patrón | P2 |
| P6 | Agenda web: mutaciones mínimas (reasignar / status) — no full CRUD día 1 | drawer actual | P3 |

### Fase W — Ajustes a Plan 11 (repriorización)

Aplicar sobre el doc 11 sin reescribirlo entero:

1. Campañas CTWA: de "Fase 5 opcional" → **Fase 3.5 / P1** (tras inbox).
2. Historial/analytics: de opcional → **Fase 3.6 / P1.5**.
3. Portafolio: mantener P2 pero **antes** de go-live ZM si el bot ya sirve `show_portfolio`.
4. Criterio Done WABA = § Criterio Done (abajo) filas W-\*.

### Fase R — Runtime bot + automation (Plan 12-runtime)

Paralelo a Plan 11 Fases 2–3; **después** de foundations UUID:

| Oleada | Edge Functions a portar (generalizar tenant) | Notas |
|--------|-----------------------------------------------|-------|
| R1 | `send-whatsapp-notification`, `waba-staff-session` (`pause_bot`/`resume_bot`/`haiku_finish_booking`), `test-haiku-preview` | Prereq inbox Plan 11 M1–M2 + Haiku test |
| R2 | `appointment-reminders`, `same-day-appointment-reminder` / `send-*` | Recordatorios cita |
| R3 | `cart-nudge`, `abandoned-cart-reminders`, `silence-watchdog` | Funnel carrito |
| R4 | `ads-bounce-nudge`, `browse-reengage` | CTWA / browse |
| R5 | `send-promo-whatsapp` + UI mobile/web stepper | Promo broadcast. **Hecho (21-sep-2026):** wizard mobile 5 pasos (`apps/geemastudio-mobile/screens/promos/`) + Historial, conectados a `promo_broadcasts`/`promo_broadcast_items` y a la EF `send-promo-whatsapp` ya desplegada (no se tocó la EF). Pendiente: prueba manual end-to-end (wizard probado solo hasta preview, sin disparar envío real) |
| R6 | `send-retouch-reengage`, `retouch-reminders` | Feature flag por vertical |
| R7 | `look-preview` | Ya tiene Plan 06/07 aparte |
| R8 | `countOverlappingAppointments` en `geemastudio-server/.../handlers/agenda.ts` | Bug cupo |

Geema hoy: solo `whatsapp-webhook` + `reset-demo-tenant`.  
ZM: listar en `ZM-Lash-and-Nails-Beauty/supabase/functions/`.

### Fase X — Push FCM E2E (PR-09) + plataforma

> Auditoría 20-sep-2026. ZM Lash: push FCM nativo **E2E operativo**. Geema: stub mobile + callers rotos (~15% paridad). **No portar** `send-push-notification` (Expo Push legado; ZM tampoco lo usa en prod). Camino canónico: `getDevicePushTokenAsync()` → `profiles.push_token` → EF `send-notification` (FCM v1).

#### Estado Geema hoy (22-sep PR-09 P0)

| Pieza | Path / nota | Estado |
|-------|-------------|--------|
| Obtiene token nativo | `geemastudio-mobile/hooks/useNotifications.ts` | ✅ |
| Persiste en BD | `profiles.push_token` update al login | ✅ |
| `profiles.push_token` + `tenant_id` en Drizzle | `@geemastudio/shared-schema` | ✅ (BD ya tenía columnas; sin migración) |
| Firebase Android `com.geemastudio.app` | App ID `…:android:feea1a36…` en proyecto `zm-lash-nails-beauty` | ✅ |
| EAS `GOOGLE_SERVICES_JSON` | secret file · preview/production/development | ✅ |
| `app.config.js` → `googleServicesFile` | patrón ZM | ✅ |
| EF `send-notification` | **Canónico en repo ZM** (Opción A); no portar a geemastudio-server | ✅ decisión |
| Secret `FCM_SERVICE_ACCOUNT` | Mismo SA del proyecto Firebase compartido | ✅ ya en Vault Supabase |
| Callers webhook | ZM `notify.ts` → EF prod (Track C) | ✅ |
| `notifyAdmins` scope | `owner`+`dev` + `.eq(tenant_id)` (fix ZM `notify.ts`) | ✅ |
| Deep link tap `waba_chat` | `Linking` → `geema.zmtechdev.com/panel/waba/mensajes?phone=` | ✅ |
| Cold start | `getLastNotificationResponseAsync` | ✅ |
| Canales Android | `default` / `waba-chat` / `waba-alerts` / `waba-appointments` + `{businessName}` | ✅ |
| Smoke físico APK Geema | push físico validado en APK de producción; ajustes de assets en curso | ✅ P8 |
| Campanita Agenda UI | `NotificationsBell` — **no es FCM** | ≠ |

#### Flujo ZM (referencia)

```
APK → getDevicePushTokenAsync() → profiles.push_token
  → notifyAdmins* → EF send-notification (FCM v1 + FCM_SERVICE_ACCOUNT)
  → tap: Agenda (appointment_*) | Linking → /panel/waba/mensajes?phone= (waba_chat)
```

Ref: `ZM-Lash-and-Nails-Beauty/apps/mobile/hooks/useNotifications.ts`, `supabase/functions/send-notification/`, `whatsapp-webhook/lib/notify.ts` (ClientChat, PausedReply, WaError, QA guard).

#### Nota Opción A (22-sep, post Track C) — decisión Firebase + CI

BD compartida `udelxwwnyivknslueerr`: la EF **`send-notification` ya corre en prod** desde repo ZM. No hace falta un segundo webhook Geema.

**Decisión PR-09 (22-sep):**

1. **Firebase**: app Android `com.geemastudio.app` en el **mismo** proyecto `zm-lash-nails-beauty` → reutiliza `FCM_SERVICE_ACCOUNT` (un SA, dos apps). No SA multi-proyecto.
2. **P5 / P7**: **no portar** EF a `geemastudio-server` ni espejar deploy en CI zm-tech. Deploy canónico = repo ZM + `ota-production.yml` / `yarn deploy:*`. Documentado aquí para no reabrir.
3. **P6**: secret Supabase ya presente; sin cambio.
4. Local: `google-services.json` gitignored; EAS file secret `GOOGLE_SERVICES_JSON`; example en repo.

#### Checklist Done — Push (estilo inbox M\*)

##### P0 — E2E mínimo (cierra PR-09)

- [x] **P1** — Columna `profiles.push_token` (+ `tenant_id`) en Drizzle; BD ya tenía ambas — sin migración
- [x] **P2** — `useNotifications`: update `push_token` al login; sin TODO Express
- [x] **P3** — Firebase Android `com.geemastudio.app` + EAS `GOOGLE_SERVICES_JSON` (file, 3 envs)
- [x] **P4** — `app.config.js` inyecta `googleServicesFile`
- [x] **P5** — **N/A Opción A** — no portar EF; canónico repo ZM
- [x] **P6** — Secret `FCM_SERVICE_ACCOUNT` ya en `udelx…` (mismo proyecto Firebase)
- [x] **P7** — **N/A** — CI deploy solo desde ZM (`ota-production.yml`); no espejo zm-tech
- [x] **P8** — Smoke: APK de producción → token en `profiles` → invoke EF → push físico validado

##### P1 — Ops Vanessa (mismo día)

- [ ] **P9** — Push cita WABA nueva llega en <30s (pendiente P8 + APK)
- [ ] **P10** — Push pago por validar (pendiente P8)
- [x] **P11** — Canales Android: `default`, `waba-chat`, `waba-alerts`, `waba-appointments` (`{businessName} · …`)
- [x] **P12** — `notifyAdmins` `owner`+`dev` + `tenant_id` (ZM `notify.ts`; redeploy webhook)
- [x] **P13** — Log `sent/errors` del invoke (ya en ZM `notify.ts`)

##### P1.5 — Paridad WABA chat (complementa inbox Plan 11 M4 / M11)

- [x] **P14** — `notifyAdminsClientChat` + cooldown ~45m + guard `isQaWaPhone` (ya ZM; Opción A)
- [x] **P15** — `notifyAdminsPausedClientReply` (ya ZM; Opción A)
- [x] **P16** — Tap `type=waba_chat` → `Linking.openURL` panel Geema `?phone=`
- [x] **P17** — Cold start: `getLastNotificationResponseAsync` en `useNotifications`

##### P2 — Paridad ZM v3

- [ ] **P18** — Push imagen/audio diseño (`inbound-image` / `inbound-audio`)
- [ ] **P19** — Push referencia cita → Agenda (`appointment_reference` + `useOpenAppointmentDeepLink`)
- [ ] **P20** — `notifyAdminsWaError`
- [ ] **P21** — Haiku sin crédito + billing Meta #131042
- [ ] **P22** — Cron `chat-quality-review` + push “Revisar YA”
- [ ] **P23** — Trigger DB asignación staff: corregir `user_id` → `user_ids[]` si se porta; evaluar multi-tenant

**PR-09 cerrado** = P0 ✅ + P1 ✅ en tenant sandbox (idealmente smoke también con owner ZM en APK Geema). P1.5 va en paralelo / justo después de inbox Fase 3. P2 sigue Plan 12 Fase R / Plan 11 triggers.

#### Otras piezas plataforma (no push)

1. CI: listar / deploy Edge Functions en workflow (además de `send-notification`).
2. Legal pages template por `tenant_settings.country` (backlog post go-live).
3. Branding FCM tenant-aware (`color` + `image`) — S5B-10 en `06-BRANDING…`; **después** de P0–P1.

---

## Criterio Done — paridad Vanessa-usable

Checklist side-by-side (tenant sandbox Geema vs panel ZM prod):

### Shell / ops

- [ ] D1 — Desde `/panel/*` se llega a Finanzas y Dashboard en ≤1 click
- [ ] D2 — Finanzas web tiene vista Ejecutiva (KPIs + al menos 1 chart P&L o gastos)
- [ ] D3 — Cliente → "Abrir chat WA" abre el hilo correcto
- [ ] D4 — Copy de dominio custom refleja middleware real (Plan 11 Fase 0)

### WABA (extiende Plan 11)

- [ ] W1 — `waba_config.tenant_id` UUID alineado bot ↔ panel
- [ ] W2 — Lecturas panel vía API routes; anon directo a tablas WABA = denegado
- [ ] W3 — Haiku: 4 keys editables + test preview
- [ ] W4 — Inbox **P0+P1** (Plan 11 M1–M13): texto, pausa/reactiva, badge bot, composer 24h, poll 10s, imagen, bloquear, copiar, `?phone=`, preview catálogo, badge pausado/unread
- [ ] W4b — Inbox **P1.5** (M14–M19) antes de go-live ZM con tráfico real de fotos/plantillas
- [ ] W4c — Inbox **P2** (M20–M23): Haiku agenda, borrar hilo, reacciones/quotes — deseable, no bloquea campañas
- [ ] W5 — WabaNav con al menos: Campañas, Mensajes, Haiku, Historial (Portafolio/Simulador si go-live bot)
- [ ] W6 — Simulador corre 1 flujo booking feliz contra dispatcher real

### Runtime / push

- [ ] R1 — Recordatorio 24h o same-day activo en tenant sandbox
- [ ] R2 — `send-whatsapp-notification` + `waba-staff-session` operativos desde el inbox (prereq W4)
- [ ] R3 — Push **PR-09 P0+P1** (checklist P1–P13 en Fase X)
- [ ] R3b — Push P1.5 (P14–P17) alineado a inbox M4/M11 (bot pausado → aviso si responde)

**Go-live ZM (DNS + `web_enabled`) sigue fuera**: requiere OK Vanessa/Alberto + contenido CMS (Plan 10). Este Done es del **panel**, no de la landing pública.

---

## Orden de sprints sugerido

```
Sprint A  Plan 11 F0 + F1  |  Plan 12 Fase 0 docs  |  Fase T  |  PR-09 P0 (token+EF+Firebase) en paralelo
Sprint B  Plan 11 F2 Haiku |  Fase P1–P2 (finanzas ejecutiva + shell)  |  PR-09 P1 smoke Vanessa
Sprint C  Plan 11 F3 inbox |  R1 EFs staff/notify  |  P3 deep link clientes  |  Push P1.5 (paused reply)
Sprint D  Campañas + Historial (ex-Fase 5) |  R2 recordatorios
Sprint E  Simulador + Portafolio |  R3–R4 nudges
Sprint F  Promo broadcast (R5) |  Push P2 (P18–P23) |  decisión inventario/validación web
```

---

## Archivos críticos (además de Plan 11)

| Área | Path |
|------|------|
| Finanzas ejecutiva ZM | `ZM-Lash-and-Nails-Beauty/apps/web/src/app/finanzas/components/executive/` |
| Finanzas Geema | `apps/geemastudio-web/src/app/finanzas/` (+ `components/executive/*`, hooks `executive*`) |
| Executive mobile Geema | `apps/geemastudio-mobile/screens/finances/hooks/useExecutiveSummary.ts` |
| PanelShell | `apps/geemastudio-web/src/app/panel/PanelShell.tsx` |
| Clientes Geema | `apps/geemastudio-web/src/app/panel/clientes/` |
| Deep link ZM | `.../clientes/components/ClientDetailSidebar.tsx` |
| Inventario features | `docs/audit/04-INVENTARIO-features-zm-lash-para-geema.md` (N19 push) |
| EFs ZM | `ZM-Lash-and-Nails-Beauty/supabase/functions/` |
| EFs Geema | `apps/geemastudio-server/supabase/functions/` |
| Push mobile Geema | `apps/geemastudio-mobile/hooks/useNotifications.ts` |
| Push mobile ZM | `ZM-Lash-and-Nails-Beauty/apps/mobile/hooks/useNotifications.ts` |
| Push EF ZM | `.../supabase/functions/send-notification/` |
| Notify WABA Geema | `geemastudio-server/.../whatsapp-webhook/lib/notify.ts` |

---

## Fuera de alcance explícito

- Go-live DNS `zmlashnails.com` (Plan 10).
- Reescribir landing Sanity → mantener CMS Geema.
- Port 1:1 de branding / copy ZM.
- Big-bang merge del webhook 2665 líneas: oleadas por módulo (CTWA, staff-echo, portfolio, coalesce).
- **`send-push-notification` (Expo Push)** — legado en ZM, sin uso con token nativo; no portar.
