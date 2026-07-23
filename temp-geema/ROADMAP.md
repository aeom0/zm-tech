# ROADMAP GeemaStudio (2026) — ruta a beta v1.5

## Objetivo

Llegar a la primera beta de producción lo antes posible, intercalando estabilización técnica mínima con las features que realmente desbloquean el lanzamiento. No hay "primero limpiar todo y luego features" — cada sprint entrega valor concreto.

---

## Principios de ejecución

- **Beta primero**: cada decisión se toma preguntando si acerca o aleja la beta.
- Estabilizar lo mínimo indispensable, no lo perfecto.
- Features y deuda técnica en paralelo cuando no hay dependencia entre sí.
- Entregar en incrementos pequeños con criterios de aceptación claros.
- Mantener consistencia multi-tenant (moneda, terminología, branding, permisos).
- Quality gate mínimo: `yarn check:types` antes de todo commit.

---

## Estado actual (v1.5-unreleased — jul 2026)

### Completado (incluye [Unreleased] 2026-07-21)
- Monorepo funcional: `apps/mobile`, `apps/web`, `packages/shared-schema`, `packages/tenant-config`
- **TypeScript 6.0.3** en todo el monorepo (`resolutions.typescript` en raíz); web sin `baseUrl` deprecado, `target` ES2022
- **Expo SDK 56**: RN **0.85.3**, React **19.2.3**, Reanimated **4.3.1**, worklets **0.8.3**; breaking SDK 56 resueltos (`StatusBar` sin `backgroundColor`/`translucent`, `absoluteFill`, tipos Reanimated en dashboard)
- Core mobile: onboarding, agenda (vista dueño grilla día + columna por profesional, vista staff timeline; línea de hora actual), servicios, clientes, inventario, finanzas, validación pagos, asignar profesionales
- **Personal / agenda**: foto opcional por empleado (`avatar_url` + Storage `employee-avatars`); **FAB crear** + eliminar profesional con confirmación; visible en cabeceras de agenda y franja de equipo
- **Moneda multi-LATAM**: selector de 19 monedas (`CurrencyPickerModal`) en Ajustes + onboarding paso 2; `syncRemote`
- **Onboarding**: color personalizado HSV (`CustomColorPickerModal`); TD-001 resuelto (`Onboarding`, `BorderRadius.card`, `Onboarding.canvasBackground`)
- Core web: `/finanzas`, `/` (landing), dashboard métricas (KPIs, gráfico 7 días, top servicios, próximas citas), panel **`/panel/servicios`** y **`/panel/horarios`**
- **Marca Lunaris**: mobile `Gradients.onboarding`; web **`apps/web/src/lib/theme.ts`** (`LUNARIS`); **`DiamondHero`** consume tokens de `theme.ts`
- **Deploy Vercel**: sin `ignoreCommand` — build web en cada push a `main`
- Logos SVG diamante, favicon; RLS con `get_my_role()`, badges en tab Más
- Bot WABA en landing (WABAPreview, PricingCard con tiers)
- **WABA multi-tenant (base)**: Edge Function `whatsapp-webhook` + columnas en `tenant_settings` + resolución por `phone_number_id` — ver `docs/WABA_MULTITENANT_ARCHITECTURE.md` (capa de reenganche ZM v3.0 aún no portada → PR-10 / PR-10B)

### Riesgos activos bloqueantes para beta
- `ThemeContext`: posibles crashes intermitentes de arranque si consumers renderizan antes del provider
- Defaults inconsistentes entre `tenant-config` y `tenant_settings` en DB
- Auth móvil ya usa Supabase Auth real (`signInWithPassword` + `profiles`); falta validación E2E en build nativo (PR-01/PR-04)

### Pendiente de beta (gate)
| Ítem | Estado (jul 2026) |
|---|---|
| PR-07 CI GitHub Actions | **Pendiente** — no hay `.github/workflows` en el repo |
| PR-09 Push FCM E2E | **Pendiente** — `getDevicePushTokenAsync` existe; token **no** se persiste en `profiles.push_token`; no hay Edge Function `send-notification` en este proyecto |
| EAS Build APK firmado | Parcial — `eas.json` + perfiles existen; falta canal internal testing validado |
| WABA avanzado (reenganche, anti-doble-reserva global, etc.) | **Bloqueado** hasta PR-07 + PR-09; base multi-tenant ya en código |

---


## Sprint 1 — semanas 1–2 · P0 desbloqueante

> Sin esto no hay beta. Todo lo demás depende de auth real.

### 1. Auth real en mobile (P0 máxima prioridad)
- Reemplazar login mock por Supabase Auth real
- Enlazar sesión ↔ `profiles` ↔ roles (`dev` | `owner` | `staff`)
- Flujos protegidos no dependen de estado local inseguro
- PR-01

### 2. ThemeContext hydration fix (P0)
- Garantizar que el provider envuelve a todos los consumers antes del primer render
- Eliminar crasheos intermitentes de arranque
- PR-02

### 3. Defaults multi-tenant (P0)
- Unificar comisión, terminología y locale entre `packages/tenant-config` y `tenant_settings` (DB)
- Una única fuente de verdad; los defaults visibles en onboarding/settings coinciden con lo persistido
- PR-03

### Criterios de aceptación Sprint 1
- Usuario real puede iniciar/cerrar sesión en mobile y web con el mismo comportamiento de permisos
- No hay crasheos de arranque relacionados con tema/context
- Defaults visibles en onboarding coinciden con datos en DB

---

## Sprint 2 — semanas 2–4 · features beta core

> Features que deben estar en la beta desde el día uno.

### 4. EAS Build beta (P0 para distribución)
- Configurar `apps/mobile/eas.json` con perfil `preview` → APK firmado para Android (`yarn workspace mobile build:preview:android`)
- Canal de distribución: internal testing (Google Play internal track o URL directa)
- Verificar que auth real funciona en build nativo (no solo Expo Go)
- PR-04

### 5. Anti-solapamiento de citas (P1)
- Validar disponibilidad del profesional al crear o reprogramar citas
- Bloquear intentos de doble reserva con feedback claro en UI
- Respetar `config.locale.timezone` (no hardcodear `America/Lima`)
- PR-05

### 6. Web `/servicios` CRUD completo (P1)
- Categorías (create, edit, reorder)
- Servicios por categoría (create, edit, toggle active, precio con coma decimal LATAM)
- Packs (create, edit, seleccionar servicios)
- Promos (create, edit, añadir ítems desde service/pack)
- **Estado**: entregado en **`/panel/servicios`** — PR-06 (categorías + servicios) y **PR-06B** (packs + promos + `promotion_items`). *Pendiente opcional*: reorder de categorías explícito en UI si no está cubierto.

### Criterios de aceptación Sprint 2
- APK descargable e instalable en Android físico con auth funcional
- Intentos de doble reserva son bloqueados con feedback claro
- CRUD de servicios y packs funcional desde la web

---

## Sprint 3 — semanas 4–6 · calidad mínima + features beta

> Dos carriles en paralelo: deuda técnica mínima y features que completan la beta.

### 3A — Calidad mínima (carril estabilización)

#### 7. CI básico obligatorio (P1)
- Workflow GitHub Actions para PRs: `yarn lint` + typecheck workspaces + build web
- Fallo de checks bloquea merge
- PR-07

#### 8. Error handling robusto en pantallas críticas (P1)
- Hooks de dashboard, finanzas y agenda: estados de error/retry visibles en UI
- Sin errores silenciosos ni pantallas en blanco ante fallo de red
- PR-08

### 3B — Features beta (carril producto)

#### 9. Notificaciones push FCM v1 end-to-end (P1)
- `getDevicePushTokenAsync()` → persistir token en `profiles.push_token`
- Trigger DB `trg_notify_appointment_assigned` → Edge Function `send-notification`
- Validado en build nativo (token FCM, no Expo Push)
- PR-09

### 10. Bot WABA multi-tenant — Edge Function (P1)

**Alcance actualizado (jul 2026)**: el código base multi-tenant YA EXISTE y funciona
(ver `docs/WABA_MULTITENANT_ARCHITECTURE.md`). Lo que falta es traer la capa de
funcionalidad que ZM desarrolló en su v3.0, adaptada a arquitectura multi-tenant:

- Port de: capacidad global anti-doble-reserva (`countOverlappingAppointments`),
  `silence-watchdog`, portafolio de fotos por servicio, referencia visual con
  Storage por tenant.
- Ver PR-10B para el motor de reenganche (bloque separado, ver abajo).
- Configuración de credenciales WABA por tenant: hoy es manual vía SQL/Supabase
  Dashboard — evaluar si el panel `/panel/waba/configuracion` (PR-11) debe
  incluir un formulario de alta.
- PR-10

### 10B. Motor de reenganche WABA multi-tenant (P1 — nuevo, jul 2026)

> Port del motor de retención que ZM validó en producción (v3.0, jul 2026). No estaba
> contemplado en el roadmap original porque no existía cuando se escribió PR-10.

**Componentes a portar** (todos con arquitectura multi-tenant desde el inicio,
`tenant_id` en cada tabla nueva):

| Feature | Origen ZM | Prioridad |
|---|---|---|
| Recordatorio 24h | `appointment-reminders` + `send-appointment-reminder` | Alta |
| Recordatorio same-day 3h | `same-day-appointment-reminder` | Media |
| Reenganche de retoque | `retouch-reminders` + `send-retouch-reengage` | Media |
| Browse-reengage | cron `*/15`, Haiku si browsing sin carrito ≥30 min | Media |
| Ads-bounce-nudge | CTWA ≥90min, horario 9–22 | Media |
| Anti-spam mutuo entre flujos | guards cruzados por `*_sent_at` | Alta (evita spam real a clientas) |
| Suite QA de regresión | `yarn waba:validate:*` — adaptar a multi-tenant | Alta (sin esto no hay forma segura de validar) |

**DoD**: cada cron/Edge Function filtra por tenant activo (`features_waba = true`);
suite QA corre contra un tenant de prueba sin afectar producción; anti-spam
verificado entre al menos 2 tenants simultáneos.

PR-10B

### Criterios de aceptación Sprint 3
- Todo PR dispara checks automáticos y reporta resultados
- Pantallas críticas tienen UX clara en error/timeout/retry
- Notificaciones funcionando de punta a punta en build nativo
- Bot WABA responde con catálogo del tenant correcto; base multi-tenant documentada y operable

---


## Beta gate — v1.5.0

> Estos son los criterios mínimos para declarar la primera beta de producción.

| Criterio | Sprint |
|---|---|
| Auth Supabase real funcionando en build nativo | Sprint 1 |
| Sin crasheos de arranque en ThemeContext | Sprint 1 |
| EAS Build: APK descargable e instalable | Sprint 2 |
| Citas sin solapamiento, con feedback en UI | Sprint 2 |
| CI verde en todo PR | Sprint 3A |
| Push notifications E2E en build nativo | Sprint 3B |

---

## Sprint 4 — semanas 6–10 · post-beta, escalar

> Una vez en beta, se itera sobre calidad y nuevas features de crecimiento.

### Refactor módulos de alta complejidad (P2)
- Partir `FinancesScreen` mobile en hooks + components + utils tipados
- Reducir complejidad y mejorar testabilidad

### PromoMasivaScreen (P2 — requiere WABA activo)
- Stepper 5 pasos: configurar → segmentar → preview → enviando → resultado
- Segmentación: `todas` | `vip` | `nuevas` | `en_riesgo`
- Edge Function `send-promo-whatsapp` con polling de progreso

### Optimización de queries (P2)
- Reducir trabajo pesado en cliente para módulos de clientes, finanzas y dashboard
- Resolver desfase de timezone en dashboard web (usar `config.locale.timezone`)
- Estandarizar convención de query keys de TanStack Query

### Testing por capas (P2)
- Unit tests: utilidades y reglas de negocio clave
- Integración: hooks de datos/mutaciones con casos críticos
- E2E smoke: auth, onboarding, agenda y dashboard

### SEO + accesibilidad web (P3)
- Sitemap, robots, metadata mejorada, structured data
- Mejoras de accesibilidad en tabs, acordeones y tablas de la landing
- Performance: hidratar solo lo necesario

---

## Orden de PRs — primer mes

| PR | Descripción | Sprint | Prioridad |
|---|---|---|---|
| PR-01 | Auth real mobile + ajustes de permisos | 1 | P0 |
| PR-02 | Fix ThemeContext hydration | 1 | P0 |
| PR-03 | Unificación defaults tenant-config/DB | 1 | P0 |
| PR-04 | EAS Build beta + canal internal testing | 2 | P0 |
| PR-05 | Validación anti-solapamiento de citas | 2 | P1 |
| PR-06 | Web `/panel/servicios` — categorías + servicios | 2 | P1 |
| PR-06B | Web `/panel/servicios` — packs + promos (`promotion_items`) | 2 | P1 |
| PR-07 | CI básico GitHub Actions | 3A | P1 |
| PR-08 | Error handling dashboard/finanzas/agenda | 3A | P1 |
| PR-09 | Push notifications FCM v1 E2E | 3B | P1 |
| PR-10 | Bot WABA multi-tenant Edge Function (capa ZM v3.0 sobre base ya existente) | 3B | P1 |
| PR-10B | Motor de reenganche WABA multi-tenant | Post-beta | P1 |
| PR-11 | Panel web completo (`/panel/clientes`, `/panel/personal`, `/panel/agenda`, `/panel/waba`, `/panel/configuracion`) | Post-beta | P1 |

---

## PR-11 — Panel web completo (post-beta)

> Agrupa todas las rutas de panel de gestión pendientes. No bloquea beta móvil, pero sí la utilidad real del panel web para Tenant #1 (Vanessa).

Ver [docs/WEB_ARCHITECTURE.md](docs/WEB_ARCHITECTURE.md) para la distinción entre Panel de gestión y Landing pública del tenant.

### Rutas incluidas

| Ruta | Descripción | Prioridad |
|------|-------------|-----------|
| `/panel/clientes` | Lista, detalle, métricas VIP/nuevo/en riesgo | P1 |
| `/panel/personal` | CRUD equipo: foto, color, comisiones, estado | P1 |
| `/panel/waba` | Historial chats, editor system prompt Haiku, analytics | P1 |
| `/panel/agenda` | Vista grilla día + columnas por profesional | P1 |
| `/panel/configuracion` | Logo, nombre, moneda, terminología | P1 |
| `/panel/configuracion/web` | `web_mode` + slug + dominio propio | P2 |
| `/panel/waba/campanas` | Campañas masivas WA: stepper, segmentación, envío | P2 |
| `/panel/inventario` | Gestión de stock | P2 |

**Orden de implementación recomendado**: `clientes` → `personal` → `waba` → `agenda` → `configuracion`

> **Nota**: estas rutas son independientes del `web_mode` del tenant. El panel de gestión está **siempre activo** para todo tenant autenticado, independientemente de si tienen landing pública (`geema_hosted`), dominio propio (`own_domain`) o ninguna (`none`).

---

## Backlog continuo (siempre activo)

- Revisión de RLS y permisos por rol ante cada nueva feature
- TypeScript hardening: reducir `any` y casts inseguros
- Observabilidad funcional (errores de UI y fallas de red)
- Performance budget para pantallas y rutas críticas
- Migraciones Drizzle versionadas en repo (reducir dependencia de `db:push`)
- Limpieza de legado: pantallas y rutas no usadas, naming inconsistente
- Branding: eliminar textos legacy de marca anterior en web/finanzas

## Mejoras mobile de ZM pendientes de portar (no dependen de WABA)

| Mejora | Origen ZM | Esfuerzo |
|---|---|---|
| Sentry crash reports (`@sentry/react-native` + source maps Metro) | v jul-2026 | Bajo |
| `ClientCard` rediseñada (más aire, gasto como ancla) | 18-jul-2026 | Bajo |
| Fix categoría favorita desde historial (sin depender de `service_categories.color`) | sesión 28-jun | Bajo |
| Costos WABA en Finanzas (`waba_pricing_daily`, `PricingBreakdownCard`) | jul-2026 | Medio — depende de PR-10B |
| Referencia visual en Agenda (galería + "Abrir link") | 20-jul-2026 | Medio — depende de PR-10B |

---


## Métricas de éxito (beta)

| Métrica | Objetivo |
|---|---|
| Crasheos en arranque | 0 en build nativo |
| Flujo auth → agenda completo | sin errores en happy path |
| CI: PRs que pasan en primer intento | > 80% |
| Tiempo de carga dashboard mobile | < 2s en red 4G |
| Citas con solapamiento creadas | 0 |

---

## Notas de gestión

- Si una tarea P0 queda incompleta, no se avanza de sprint.
- EAS Build (PR-04) puede ejecutarse en paralelo con PR-02 y PR-03 una vez que PR-01 esté completo.
- Bot WABA (PR-10 / PR-10B): la base multi-tenant ya está en código; el port de ZM v3.0 (capacidad, reenganche) requiere cuenta Meta Business activa para validación E2E.
- `PromoMasivaScreen` queda fuera de la beta v1.5 — requiere WABA validado en producción.
- No avanzar WABA avanzado (PR-10/10B) mientras PR-07 y PR-09 sigan abiertos: son prerrequisito del beta gate.

---

*Actualizado: 21 jul 2026. Sincronizado con CHANGELOG [Unreleased], auditoría cruzada ZM v3.0 WABA, y estado real del repo aeom0/geemastudio.*
