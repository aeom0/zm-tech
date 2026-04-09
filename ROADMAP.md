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

## Estado actual (v1.4.8 — abr 2026)

### Completado
- Monorepo funcional: `apps/mobile`, `apps/web`, `packages/shared-schema`, `packages/tenant-config`
- Core mobile: onboarding, agenda (vista dueño grilla día + columna por profesional, vista staff timeline; línea de hora actual), servicios, clientes, inventario, finanzas, validación pagos, asignar profesionales
- **Personal / agenda**: foto opcional por empleado (`avatar_url` + Storage `employee-avatars`), editable en Más → Personal; visible en cabeceras de agenda y franja de equipo
- Core web: `/finanzas`, `/` (landing), dashboard métricas (KPIs, gráfico 7 días, top servicios, próximas citas), panel **`/panel/servicios`** y **`/panel/horarios`**
- **Marca Lunaris**: mobile `Gradients.onboarding`; web **`apps/web/src/lib/theme.ts`** (`LUNARIS`) — landing + panel + login alineados turquesa; **`DiamondHero`** consume tokens de `theme.ts` (sin stops duplicados)
- **Deploy Vercel**: sin `ignoreCommand` — build web en cada push a `main` (evita fallos shallow `git`)
- Logos SVG diamante, favicon
- RLS 9 tablas con `get_my_role()`, `usePendingBadgeCount`, badges en tab Más
- Bot WABA en landing (WABAPreview, PricingCard con tiers)

### Riesgos activos bloqueantes para beta
- Auth móvil en **modo desarrollo** — sin enforcement real de sesión/roles Supabase
- `ThemeContext`: posibles crashes intermitentes de arranque si consumers renderizan antes del provider
- Defaults inconsistentes entre `tenant-config` y `tenant_settings` en DB

### Pendiente de beta
- EAS Build (sin APK firmado no hay distribución real)
- Web catálogo autenticado: **`/panel/servicios`** (CRUD hecho); falta si se requiere **`/servicios`** público u otro flujo
- Notificaciones push FCM end-to-end
- Bot WABA multi-tenant (Edge Function)

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

#### 10. Bot WABA multi-tenant — Edge Function (P1)
- Port de `whatsapp-webhook` de ZM a GeemaStudio con arquitectura multi-tenant
- Catálogo dinámico desde DB del tenant activo
- Templates configurables desde `tenant_settings`
- Plantilla por defecto: `promo_geemastudio_v1`
- CORS + respuesta 200 inmediata a Meta antes de procesar
- PR-10

### Criterios de aceptación Sprint 3
- Todo PR dispara checks automáticos y reporta resultados
- Pantallas críticas tienen UX clara en error/timeout/retry
- Notificaciones funcionando de punta a punta en build nativo
- Bot WABA responde con catálogo del tenant correcto

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
| PR-10 | Bot WABA multi-tenant Edge Function | 3B | P1 |
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
- Bot WABA (PR-10) requiere cuenta Meta Business activa para validación E2E; el código puede estar listo antes.
- `PromoMasivaScreen` queda fuera de la beta v1.5 — requiere WABA validado en producción.

---

*Actualizado: marzo 2026. Generado con análisis de estado real del repo aeom0/geemastudio v1.4.3.*
