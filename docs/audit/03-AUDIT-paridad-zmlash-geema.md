# Audit 03 — Paridad ZM Lash & Nails (referencia) vs GeemaStudio (multi-tenant)

> **Solo lectura.** Fecha: 2026-08-07. Plan fuente: `docs/geemastudio/docs/03-PLAN-audit-paridad-zmlash-geema.md` (copia también en ZM Lash `docs/03-PLAN-audit-paridad-zmlash-geema.md`).
>
> Repos: `aeom0/ZM-Lash-and-Nails-Beauty` (`/home/alber/ZM-Lash-and-Nails-Beauty`) · `aeom0/zm-tech` Geema (`apps/geemastudio-{web,mobile,server}`).
>
> Metodología: verificación punta a punta (UI → hook/servicio → Supabase/Edge), no por nombre de carpeta. Estados: ✅ Completo · 🟡 Parcial · ❌ No existe · ❓ No verificable.

---

## 6.1 Tabla principal

| Feature                             | ZM Lash (referencia) | Geema Web | Geema Mobile | Geema Server   | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | -------------------- | --------- | ------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agenda / citas                      | ✅                   | ❌        | ✅           | 🟡             | ZM: grid 30 min + recordatorios 24h/same-day + capacidad global WABA. Geema mobile: CRUD real (`useAgendaQueries`/`useAgendaMutations`). Web: sin ruta agenda. Server WABA: `checkAvailability` filtra por `employee_id` pero el bot inserta `employee_id: null` → solapes WABA probablemente no se detectan (mismo bug que ZM resolvió en v3.0 con `countOverlappingAppointments`).                                                                  |
| Servicios                           | ✅                   | ✅        | ✅           | ✅             | Catálogo + categorías + precios + duración conectados. Geema server: `loadCatalog(supabase, tenantId)`.                                                                                                                                                                                                                                                                                                                                               |
| Inventario                          | ✅                   | ❌        | ✅           | ❌             | ZM + Geema mobile: CRUD `inventory_items` + alerta bajo stock. Sin panel web ni uso WABA.                                                                                                                                                                                                                                                                                                                                                             |
| Finanzas                            | 🟡                   | 🟡        | ✅           | ❌             | ZM: ingresos/pagos/período/WABA pricing; **sin** gastos ni cierre de caja. Geema mobile: monólito ~1740 líneas funcional. Geema web `/finanzas`: **copia literal de ZM** (Vanessa, zmlashnails.com, S/, sin `tenant_id`) — ver §6.3.                                                                                                                                                                                                                  |
| Comisiones                          | ✅                   | ❌        | ✅           | ❌             | ZM + Geema mobile: `%` en `employees` + desglose. Geema añade `payment_mode` commission/salary/mixed (`payroll.ts`). Sin UI web de personal.                                                                                                                                                                                                                                                                                                          |
| Packs                               | ✅                   | ✅        | ✅           | ✅             | CRUD en `/panel/servicios` (web) y mobile. Sidebar web aún marca Packs como “Próximamente” (UI desactualizada; la tab sí funciona).                                                                                                                                                                                                                                                                                                                   |
| Promociones                         | ✅                   | ✅        | ✅           | ✅             | CRUD ítems OK. ZM además: broadcast masivo WA (`PromoMasiva` + `send-promo-whatsapp`) — **ausente en Geema**.                                                                                                                                                                                                                                                                                                                                         |
| Bot WhatsApp (WABA)                 | ✅                   | ❌        | ❌           | 🟡             | ZM: webhook + Haiku + 10+ crons reenganche/recordatorio + panel `/panel/waba/*`. Geema server: webhook multi-tenant sólido (`tenant-resolver` por `phone_number_id`, currency/tz del tenant) pero **sin** silence-watchdog, cart-nudge, ads-bounce, browse-reengage, retouch, same-day, chat-quality, staff-echo, BSUID, coalesce phone-lock, panel mensajes/campañas/haiku. Solo 2 Edge Functions en repo (`whatsapp-webhook`, `reset-demo-tenant`). |
| Portafolio / galería                | ✅                   | ❌        | ❌           | ❌             | ZM: `service_portfolio_images` + panel + Haiku `show_portfolio` + foto proactiva. Geema: cero rastro en código.                                                                                                                                                                                                                                                                                                                                       |
| Push notifications                  | ✅                   | ❌        | 🟡           | 🟡             | ZM: FCM nativo → `profiles.push_token` → `send-notification`. Geema mobile: obtiene token y lo descarta (`TODO`). Server llama `send-notification` **que no existe** en el repo. Alerta WA a admins vía Graph API sí funciona.                                                                                                                                                                                                                        |
| Feriados / holidays                 | ✅                   | ❌        | ❌           | ❌             | ZM: tabla `salon_holidays` + UI + slots WABA. Geema: solo horario semanal recurrente (`working-schedule` / `/panel/horarios`).                                                                                                                                                                                                                                                                                                                        |
| Roles y permisos                    | ✅                   | 🟡        | ✅           | ❓             | Modelo `dev/owner/staff` igual. Geema web: gate binario en finanzas; `/panel` solo exige sesión. RLS Geema: por rol, **sin** aislamiento por tenant en apps de gestión (ver gap #1).                                                                                                                                                                                                                                                                  |
| Onboarding                          | ❌                   | ❌        | ✅           | 🟡             | ZM: no aplica (tenant único, seed manual). Geema mobile: wizard 7 pantallas → `tenant_settings` + empleados. Server: `reset-demo-tenant` (4 demos hardcodeados), no onboarding genérico. Web: solo login.                                                                                                                                                                                                                                             |
| Clientas (CRM)                      | ✅                   | ❌        | ✅           | —              | Módulo extra vs lista del plan. Mobile Geema OK; sin panel web.                                                                                                                                                                                                                                                                                                                                                                                       |
| Personal / chicas                   | ✅                   | ❌        | ✅           | —              | Mobile Geema OK + terminology vía `tenant-config`. Sin web.                                                                                                                                                                                                                                                                                                                                                                                           |
| Validación de pagos                 | ✅                   | ❌        | ✅           | —              | Mobile Geema existe (`screens/validacion/`).                                                                                                                                                                                                                                                                                                                                                                                                          |
| Asignar profesionales               | ✅                   | ❌        | ✅           | —              | Mobile Geema existe (`screens/asignar/`).                                                                                                                                                                                                                                                                                                                                                                                                             |
| Promo broadcast WA                  | ✅                   | ❌        | ❌           | ❌             | Solo ZM (`send-promo-whatsapp` + stepper mobile).                                                                                                                                                                                                                                                                                                                                                                                                     |
| Multi-tenant scoping (apps gestión) | 🟡*                  | ❌        | ❌           | ✅ (solo WABA) | *ZM Plan 02: `tenant_id` + RLS en prod (un tenant real hoy). Geema: **0 usos de `tenant_id` en web/mobile** (grep confirmado). Schema Drizzle sin `tenant_id`; migración SQL parcial solo en tablas WABA/catálogo; pagos/inventario sin columna.                                                                                                                                                                                                      |

\* ZM Lash hoy opera un solo tenant en prod; el retrofit Plan 02 ya está en BD/RLS, pero el producto no es aún “segundo salón”.

---

## 6.2 Gaps críticos (priorizados — bloquean vender a un 2.º tenant)

### 1. Aislamiento multi-tenant ausente en Web + Mobile — **bloquea onboarding real**

- **Qué falta:** filtros `.eq("tenant_id", …)` (o JWT claim + RLS por tenant) en **todas** las queries de gestión: `appointments`, `clients`, `payments`, `services`, `employees`, `inventory_items`, packs/promos. Hoy `rg tenant_id` en `geemastudio-web` y `geemastudio-mobile` = **0**. El bot WABA sí scopea; los paneles no.
- **Por qué crítico:** un `owner` de tenant A vería/editaría datos de tenant B. Sin esto no se puede vender el producto.
- **Esfuerzo:** L (schema Drizzle + migraciones faltantes en payments/inventory/… + RLS + reescritura de hooks + QA cruzado).
- **Ref ZM:** Plan 02 en `docs/02-PLAN-retrofit-tenant-id.md` (ya aplicado en ZM prod) como patrón de referencia, no copy-paste ciego.

### 2. `/finanzas` web es ZM Lash hardcodeado + sin tenant — **riesgo de marca y de datos**

- **Qué falta:** rehacer o eliminar `apps/geemastudio-web/src/app/finanzas/{page,layout,useFinanzasData}.tsx`. Textos actuales: “Vanessa”, “ZM Lash & Nails Beauty”, `zmlashnails.com`, `S/`/`es-PE`, “chica”.
- **Por qué crítico:** si un prospecto abre finanzas web, ve marca ajena; y sin `tenant_id` mezcla pagos.
- **Esfuerzo:** S–M (alinear con mobile/`tenant-config` o quitar la ruta hasta tener panel propio).

### 3. Capacidad anti-doble-reserva WABA rota (`employee_id: null`) — **bug funcional de agenda**

- **Qué falta:** portar `countOverlappingAppointments()` de ZM (`whatsapp-webhook/handlers/agenda.ts`) — contar solapes **globales** sin filtrar por empleada.
- **Por qué crítico:** dos clientas pueden agendar el mismo slot vía bot sin que el sistema lo note.
- **Esfuerzo:** S.
- **Ref ZM:** `supabase/functions/whatsapp-webhook/handlers/agenda.ts` + re-chequeo en `payment.ts`.

### 4. Capa operativa WABA v3 (crons + panel) inexistente — **paridad de producto conversacional**

- **Qué falta:** Edge Functions y panel que en ZM ya están en prod: `silence-watchdog`, `cart-nudge`, `ads-bounce-nudge`, `browse-reengage`, recordatorios 24h/same-day, `retouch-reminders`, `chat-quality-review`, `waba-staff-session`, `send-whatsapp-notification`, `send-promo-whatsapp`, más `/panel/waba/{mensajes,campanas,haiku,portafolio,historial}`.
- **Por qué crítico:** sin reenganche/recordatorios/panel, Geema no ofrece la experiencia WA que Vanessa ya tiene; el bot “contesta” pero no opera el funnel.
- **Esfuerzo:** L (priorizar en oleadas: recordatorios → nudges → panel mensajes → resto).
- **Nota:** ya está en `docs/geemastudio/ROADMAP.md` (PR-10/10B/11) — el gap es conocido; este audit lo confirma contra ZM v3.6+.

### 5. Push FCM punta a punta roto — **ops del salón ciega**

- **Qué falta:** persistir token en `profiles.push_token` (o tabla equivalente scoped); Edge Function `send-notification` (FCM v1); cablear `notifyAdmins` del webhook.
- **Por qué crítico:** citas/pagos/errores WA no alertan al celular del dueño (solo WA a `waba_admin_phones` si está configurado).
- **Esfuerzo:** S–M.
- **Ref ZM:** `apps/mobile/hooks/useNotifications.ts` + `supabase/functions/send-notification/`.

### 6. Agenda / Clientas / Personal / Validación solo en mobile — **web incompleta para dueña de escritorio**

- **Qué falta:** rutas web equivalentes (o decisión explícita “Geema web = solo catálogo + horarios + landing hasta post-beta”).
- **Por qué crítico:** no bloquea el 2.º tenant si mobile es el panel canónico; sí bloquea si se vende “panel web”.
- **Esfuerzo:** M–L según alcance.

### 7. Portafolio visual — **feature validada en ZM ausente**

- **Qué falta:** tabla + panel + acción Haiku `show_portfolio` + (opcional) foto proactiva al cotizar.
- **Por qué crítico:** no bloquea onboarding técnico; sí es brecha de conversión WA ya probada en tráfico real.
- **Esfuerzo:** M.
- **Ref ZM:** `lib/portfolio.ts`, `/panel/waba/portafolio`, QA `:portfolio`.

### 8. Feriados del salón — **hueco de disponibilidad**

- **Qué falta:** modelo de excepciones de fecha (cerrado / horario reducido) + UI + consumo en slots WABA/mobile.
- **Por qué crítico:** medio — sin esto un tenant en PE (o con feriados locales) ofrece horarios inválidos.
- **Esfuerzo:** M.
- **Ref ZM:** `salon_holidays` + `peru-holidays.ts` (generalizar; no copiar lista PE hardcodeada como única fuente).

### Gaps menores / deuda detectada (no bloquean el 2.º tenant por sí solos)

| Ítem                                                                    | Severidad | Nota                                                  |
| ----------------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| Promo broadcast masivo WA                                               | Media     | Solo ZM; Geema tiene CRUD de promos, no envío masivo. |
| Finanzas sin gastos/cierre de caja                                      | Baja      | Tampoco completo en ZM (🟡 ambos lados).              |
| Onboarding web                                                          | Baja      | Mobile cubre; web no.                                 |
| Sidebar “Packs/Promos Próximamente”                                     | Cosmético | Tabs reales ya existen en `/panel/servicios`.         |
| `abandoned-cart-reminders` activo en ZM prod en paralelo a `cart-nudge` | Ops ZM    | Fuera de alcance Geema; anotar para cleanup en ZM.    |

---

## 6.3 No portar (específico de Vanessa / ZM — generalizar o dejar fuera)

| Qué                                                         | Dónde aparece hoy                                                  | Qué hacer en Geema                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Branding “ZM Lash & Nails Beauty”, Vanessa, zmlashnails.com | `geemastudio-web/.../finanzas/*` (producción)                      | Eliminar/reemplazar por `tenant_settings` / `useTenant()`.                                           |
| Moneda fija `S/` + `es-PE`                                  | Finanzas web; presets `tenant-config` default PEN/Lima             | Default PE OK; **forzar** currency/timezone en onboarding; nunca hardcodear en UI.                   |
| Terminología “chica(s)”                                     | Finanzas web; seeds example                                        | Usar `config.terminology.staff`.                                                                     |
| Número WABA / admin phones de ZM                            | No hardcodear en Geema; en ZM viven en config/secrets              | Por tenant: `waba_*` en `tenant_settings`.                                                           |
| Lista feriados PE 2026 hardcodeada                          | ZM `peru-holidays.ts` (con fallback)                               | Modelo `salon_holidays` por tenant; seed opcional PE.                                                |
| `FALLBACK_BLOCKED_PHONE_NUMBERS` (Entel PE)                 | Geema `dispatcher.ts`                                              | Mantener como override regional documentado, no como config “global”.                                |
| Testimonios landing con “Vanessa” / “ZM”                    | `TestimonialCarousel.tsx`                                          | Sustituir por prueba social genérica o de clientes Geema reales.                                     |
| Seeds con “LISTA DE PRECIOS ZM” / Vanessa                   | `scripts/db/seed-*-example.sql`                                    | Renombrar a “Ejemplo Salón”; precios genéricos.                                                      |
| Flujos ultra-específicos ZM                                 | Retoque 1B Vanessa, plantillas `_zm`, copy 932, creativos CTWA 15% | Portar **como features opcionales/config**, no como defaults del producto.                           |
| Política de garantía / apodos / jerga PE del bot            | Prompts Haiku ZM                                                   | CMS por tenant (Geema ya tiene camino vía config Haiku en ZM panel — portar el patrón, no el texto). |

---

## Mapa rápido de madurez

```
ZM Lash (referencia operativa)     Geema (producto multi-tenant)
─────────────────────────────     ─────────────────────────────
Agenda mobile+web+WABA ✅          Mobile ✅  Web ❌  WABA 🟡 (bug cupo)
Catálogo/packs/promos ✅           ✅ en 3 superficies (broadcast ❌)
Inventario/comisiones ✅           Mobile ✅  Web ❌
WABA “planta completa” ✅          Webhook base 🟡 + 0 crons v3 + 0 panel
Portafolio / feriados ✅           ❌ / ❌
Push FCM ✅                        🟡 roto E2E
Onboarding ❌ (N/A 1 tenant)       Mobile ✅  Web ❌
Aislamiento tenant 🟡 (1 tenant)  Solo bot ✅ · Apps gestión ❌ ← P0
```

---

## Recomendación de orden de ataque

1. **P0 aislamiento tenant** (gap 1) — sin esto no hay segundo cliente.
2. **P0 limpiar `/finanzas` web** (gap 2) — rápido y evita vergüenza comercial.
3. **P1 fix capacidad WABA** (gap 3) — S, alto impacto en citas.
4. **P1 push FCM E2E** (gap 5) — ops usable.
5. **P2 oleada WABA** (gap 4): recordatorios → nudges → panel mensajes.
6. **P2/P3** portafolio, feriados, paridad web de Clientas/Agenda/Personal según si se vende panel web o mobile-first.

---

## Apéndice — evidencia mínima (rutas)

**ZM Lash**

- Agenda: `apps/mobile/screens/agenda/**`, `supabase/functions/appointment-reminders`, `same-day-appointment-reminder`
- WABA: `supabase/functions/whatsapp-webhook/**`, panel `apps/web/src/app/panel/waba/**`
- Portafolio: `whatsapp-webhook/lib/portfolio.ts`, `service_portfolio_images`
- Feriados: `apps/mobile/screens/holidays/**`, `salon_holidays`
- Push: `apps/mobile/hooks/useNotifications.ts`, `send-notification`

**Geema**

- Mobile agenda/servicios/finanzas/clientas/onboarding: `apps/geemastudio-mobile/screens/**`
- Web panel: `apps/geemastudio-web/src/app/panel/{servicios,horarios}` — sin agenda/waba/clientas
- Web finanzas contaminada: `apps/geemastudio-web/src/app/finanzas/page.tsx`
- WABA: `apps/geemastudio-server/supabase/functions/whatsapp-webhook/` (`tenant-resolver.ts`, `services-catalog.ts`)
- Edge Functions en repo: solo `whatsapp-webhook`, `reset-demo-tenant`
