# Panel interno GeemaStudio ≥ ZM Lash — paridad completa

> Estado: **planificado** (20-sep-2026). Complementa [`11-PLAN-waba-suite-parity.md`](11-PLAN-waba-suite-parity.md).
>
> Meta: el panel web de Geema (`apps/geemastudio-web`) debe ser **igual o superior** al de ZM Lash canónico (`ZM-Lash-and-Nails-Beauty/apps/web`) antes de migrar a Vanessa como tenant real.

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

## Scorecard actual (20-sep-2026)

Leyenda: ✅ paridad · 🟡 parcial · ❌ falta · ➕ Geema ya superior

| Módulo web | ZM Lash | Geema | Veredicto |
|------------|---------|-------|-----------|
| Shell / nav unificado | Fragmentado (`/finanzas`, `/clientes`, `/servicios`, `/panel/waba`) | `/panel/*` + shells separados finanzas/dashboard | ➕ estructura Geema; 🟡 faltan links cruzados |
| Dashboard KPIs | Solo mobile | `/dashboard` | ➕ |
| Agenda | Solo mobile | Grilla **read-only** | ➕ vista; 🟡 sin CRUD |
| Catálogo (cats/servicios/packs/promos) | `/servicios` | `/panel/servicios` | ✅ |
| Clientes CRM | `/clientes` + deep link WA | `/panel/clientes` sin deep link WA | 🟡 |
| Personal | Solo mobile | CRUD web | ➕ |
| Horarios / timezone | Mobile | `/panel/horarios` | ➕ |
| Config + CMS landing | Sanity externo | `/panel/configuracion` + `/web` | ➕ |
| Finanzas operativas | `/finanzas` | `/finanzas` multi-tenant | 🟡 |
| Finanzas **ejecutiva** (P&L, gastos, break-even) | `ExecutiveDashboard` + 10 componentes | ❌ web (🟡 mobile) | ❌ |
| Inventario | Solo mobile | ❌ web · ✅ mobile | ❌ (ambos sin web) |
| Validación pagos / Asignar staff | Solo mobile | Solo mobile | ❌ web (aceptable si se documenta mobile-first) |
| WABA tabs | **6** (campañas, portafolio, mensajes, simulador, haiku, historial) | **3** (estado, mensajes RO, haiku 1 key) | ❌ |
| WABA inbox (uso diario) | Consola staff completa (~2k LOC) | Solo lectura (~190 LOC) | ❌ → Plan 11 Fase 3 M1–M23 |
| Edge Functions bot/ops | **~25** | **2** (webhook + reset-demo) | ❌ |

Evidencia nav:

- ZM: `ZM-Lash-and-Nails-Beauty/apps/web/src/app/panel/waba/_components/WabaNav.tsx` (6 tabs)
- Geema: `apps/geemastudio-web/src/app/panel/waba/_components/WabaNav.tsx` (3 tabs)
- Deep link ZM: `clientes/components/ClientDetailSidebar.tsx` → `/panel/waba/mensajes?phone=`
- Inbox ZM: `panel/waba/mensajes/_components/MessageThread.tsx` (+ EFs `send-whatsapp-notification`, `waba-staff-session`)
- Agenda Geema: `panel/agenda/_components/AppointmentDetailDrawer.tsx` — "Vista de solo lectura"

---

## Huecos del Plan 11 (auditoría)

### A. Fuera de alcance de Plan 11 (hay que cubrir aquí)

| # | Hueco | Por qué importa para Vanessa |
|---|-------|------------------------------|
| G1 | Finanzas ejecutiva web | ZM la usa en desktop diario (`finanzas/components/executive/*`) |
| G2 | Deep link Clientes → hilo WABA | Flujo ops: CRM → chat sin copiar teléfono |
| G3 | Shell: PanelShell ↔ `/dashboard` ↔ `/finanzas` | Hoy hay que recordar 3 URLs; ZM al menos agrupa AdminNav |
| G4 | Crons / nudges / recordatorios (11+ EFs ZM) | Panel perfecto + bot sin recordatorios = funnel roto |
| G5 | `countOverlappingAppointments` en webhook Geema | Doble reserva vía bot |
| G6 | Promo broadcast WA + Reenganchar | Prod ZM (`send-promo-whatsapp`, `send-retouch-reengage`); Geema mobile = placeholder |
| G7 | Push FCM E2E | Token descartado en Geema mobile; ZM `send-notification` |
| G8 | Tenant scoping global en hooks web | Plan 11 solo arregla tablas WABA vía API routes |
| G9 | Legal por jurisdicción tenant | ZM tiene términos/privacidad/libro reclamaciones |
| G10 | Docs stale (`WEB_ARCHITECTURE`, audit 03, resumen migración) | CMS web ya existe; panel P1 ya no es "pendiente" |

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
| P1 | **Finanzas ejecutiva web**: ViewToggle Resumen/Ejecutivo; port de KPIs, gastos, break-even, charts | `apps/web/src/app/finanzas/components/executive/*` | P1 |
| P2 | Links en `PanelShell` → `/dashboard` y `/finanzas`; links de vuelta en esos shells | — | P1 |
| P3 | Clientes: botón "Abrir chat WA" → `/panel/waba/mensajes?phone=` (misma normalización que ZM) | `ClientDetailSidebar.tsx` L664 | P1 (después de inbox Fase 3) |
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
| R5 | `send-promo-whatsapp` + UI mobile/web stepper | Promo broadcast |
| R6 | `send-retouch-reengage`, `retouch-reminders` | Feature flag por vertical |
| R7 | `look-preview` | Ya tiene Plan 06/07 aparte |
| R8 | `countOverlappingAppointments` en `geemastudio-server/.../handlers/agenda.ts` | Bug cupo |

Geema hoy: solo `whatsapp-webhook` + `reset-demo-tenant`.  
ZM: listar en `ZM-Lash-and-Nails-Beauty/supabase/functions/`.

### Fase X — Plataforma (transversal)

1. Push FCM: persistir `profiles.push_token` + port `send-notification` / `send-push-notification`.
2. CI: listar Edge Functions en workflow (espejo ZM).
3. Legal pages template por `tenant_settings.country` (backlog post go-live).

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

### Runtime

- [ ] R1 — Recordatorio 24h o same-day activo en tenant sandbox
- [ ] R2 — `send-whatsapp-notification` + `waba-staff-session` operativos desde el inbox (prereq W4)

**Go-live ZM (DNS + `web_enabled`) sigue fuera**: requiere OK Vanessa/Alberto + contenido CMS (Plan 10). Este Done es del **panel**, no de la landing pública.

---

## Orden de sprints sugerido

```
Sprint A  Plan 11 F0 + F1  |  Plan 12 Fase 0 docs  |  Fase T arranque
Sprint B  Plan 11 F2 Haiku |  Fase P1–P2 (finanzas ejecutiva + shell links)
Sprint C  Plan 11 F3 inbox |  R1 EFs staff/notify  |  P3 deep link clientes
Sprint D  Campañas + Historial (ex-Fase 5) |  R2 recordatorios
Sprint E  Simulador + Portafolio |  R3–R4 nudges
Sprint F  Promo broadcast (R5) |  Push FCM |  decisión inventario/validación web
```

---

## Archivos críticos (además de Plan 11)

| Área | Path |
|------|------|
| Finanzas ejecutiva ZM | `ZM-Lash-and-Nails-Beauty/apps/web/src/app/finanzas/components/executive/` |
| Finanzas Geema | `apps/geemastudio-web/src/app/finanzas/page.tsx` |
| Executive mobile Geema | `apps/geemastudio-mobile/screens/finances/hooks/useExecutiveSummary.ts` |
| PanelShell | `apps/geemastudio-web/src/app/panel/PanelShell.tsx` |
| Clientes Geema | `apps/geemastudio-web/src/app/panel/clientes/` |
| Deep link ZM | `.../clientes/components/ClientDetailSidebar.tsx` |
| Inventario features | `docs/audit/04-INVENTARIO-features-zm-lash-para-geema.md` |
| EFs ZM | `ZM-Lash-and-Nails-Beauty/supabase/functions/` |
| EFs Geema | `apps/geemastudio-server/supabase/functions/` |

---

## Fuera de alcance explícito

- Go-live DNS `zmlashnails.com` (Plan 10).
- Reescribir landing Sanity → mantener CMS Geema.
- Port 1:1 de branding / copy ZM.
- Big-bang merge del webhook 2665 líneas: oleadas por módulo (CTWA, staff-echo, portfolio, coalesce).
