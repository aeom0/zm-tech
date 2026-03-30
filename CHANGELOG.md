# Changelog — SalonPro

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [1.4.6] — 2026-03-30

### Añadido
- **Config horario de trabajo**: zona horaria IANA (`tenant_settings.timezone`, ya mapeada en mobile) + **`business_hours`** por día editables.
  - **Mobile**: pantalla **`HorariosTrabajo`** (stack Más → Configuración → “Horario de trabajo”); `TenantContext.updateTenant(..., { syncRemote: true })` persiste en Supabase.
  - **Web (panel)**: **`/panel/horarios`** — mismo modelo (`timezone`, `business_hours`); nav lateral “Horario”; dependencia `@salonpro/tenant-config` en `apps/web`.
- **`@salonpro/tenant-config`**: módulos **`working-schedule.ts`** (validación HH:MM, `mergeTenantConfig`, `horasVisiblesParaAgenda`, bloqueo por franja) e **`iana-timezone.ts`** (Luxon 3: semana/día en zona del tenant, `instanteCitaEnZona`, `zonaIANASegura`, formateos Intl con `timeZone`).
- **Agenda (mobile)**: grilla alineada al **calendario y reloj del negocio** (`config.locale.timezone`); celdas fuera de franja atenuadas y sin alta; citas filtradas por día/hora en esa zona; alta/reprogramación con instante correcto para BD.
- **Drizzle (`tenant_settings`)**: columnas documentadas para alinear con remoto: **`timezone`**, **`client_terminology`**, **`tagline`**, **`features_whatsapp`**.

### Cambiado
- **`TenantContext`**: fusiones profundas con `mergeTenantConfig`; `updateTenant(partial, { syncRemote?: boolean })`.
- **Mobile**: eliminado `AGENDA_HOURS` fijo en `agenda/constants.ts`; rango de filas desde `horasVisiblesParaAgenda`.
- **`apps/web/package.json`**: `yarn.lock` por workspace `tenant-config` + Luxon.

---

## [1.4.5] — 2026-03-25

### Añadido
- Tabla **`appointment_verifications`** en `packages/shared-schema` (Drizzle + Zod + relaciones con `appointments`), alineada con Supabase.
- Scripts **`yarn db:generate`** y **`yarn db:studio`** en la raíz del monorepo.
- Carpeta **`migrations/`** en la raíz (salida prevista de Drizzle Kit) con `.gitkeep`.
- SQL de referencia **`scripts/db/migrations/20260324_advisor_rls_performance.sql`**: `search_path` en funciones públicas, índices FK, políticas RLS consolidadas y patrón initplan seguro para `auth.uid()` (ya aplicado en proyecto Supabase SalonPro vía MCP).
- **Web (panel)**: ruta autenticada **`/panel/servicios`** — CRUD de **`service_categories`** y **`services`** (toggle inline `is_active`, PR-06) más CRUD de **`packs`**, **`promotions`** y **`promotion_items`** (PR-06B; Supabase directo, TanStack Query). Tabs con título tipo *Catálogo de Servicios › …* y tab activo sincronizado con query **`?tab=`** (`categorias` | `servicios` | `packs` | `promos`).
- **Web (auth)**: login básico en **`/login`** para acceso al panel y layout SSR con guard de sesión.
- **Mobile (Agenda)**: chequeo de disponibilidad y **bloqueo de solapes** al crear/reprogramar citas (incluye guard previo al insert/update para evitar race conditions).
- **Mobile (Personal/Finanzas)**: soporte de **pagos de empleados** por modo `commission` / `salary` / `mixed`, con utilidades de cálculo de nómina y badge de modo en UI.

### Cambiado
- **Drizzle**: índices `idx_appointments_*`, `idx_payments_appointment_id`, `idx_profiles_employee_id`, `idx_services_category_id` e índices `idx_appt_verif_*` declarados en `schema.ts` para coincidir con la base remota y con `yarn db:push`.
- **`drizzle.config.ts`**: comentarios que distinguen `db:push` vs `db:generate` y remiten al SQL de advisors/RLS.
- **Supabase Web**: cliente actualizado para usar `@supabase/ssr` (browser + server) y soportar guard SSR por cookies en App Router.
- **Onboarding (Equipo)**: simplificado — ya no captura comisión/salario; el modo de pago se configura luego en **Personal**.

### Notas
- **Security Advisor**: puede seguir mostrando *Leaked Password Protection* en plan Free de Supabase Auth; el resto de avisos de funciones `search_path` y performance RLS/FK quedaron atendidos en remoto según el SQL anterior.

---

## [1.4.4] — 2026-03-24

### Añadido
- Marca **diamante** (`logo-diamondSparkle.svg` y variantes `positive` / `negative` en `apps/web/public/`; copias en `apps/mobile/assets/`).
- `apps/web/public/favicon.png` y regeneración de `splash-icon.png` / íconos raíz alineados al diamante.
- `apps/mobile/app.json`: `icon`, `updates.url` (`https://u.expo.dev/<projectId>`) para EAS Update y canales.
- Scripts `build:preview:android` y `build:preview:ios` en `apps/mobile/package.json`.

### Cambiado
- **Web**: Navbar y Footer usan solo el diamante (`next/image`); en barra clara tras scroll (modo claro) se aplica `invert` al mismo SVG.
- **Mobile**: splash in-app con PNG del diamante; sin wordmark “SalonPro” en el bloque del logo; `expo-splash-screen` con fondo `#111318`.
- **`apps/mobile/eas.json`**: perfil `preview` con `EXPO_PUBLIC_SUPABASE_URL` (anon key vía entornos Expo).
- **Raíz `app.json`**: splash `#111318`, adaptive Android con `android-icon-foreground.png` regenerado.

### Eliminado
- `eas.json` duplicado en la raíz del monorepo (config EAS solo en `apps/mobile/eas.json`).
- Logos horizontales web (`logo.svg`, `logo-light.svg`, `logo-icon.svg`), `GemaStudio.png`.
- Assets mobile obsoletos (`logo-salonpro*`, `logo.svg`, `compare.html`, carpeta `apps/mobile/assets/images/` duplicada).
- `assets/images/android-icon-background.png` y `android-icon-monochrome.png` en raíz (foreground + íconos unificados al diamante).

---

## [1.3.2] — 2026-03-19

### Añadido
- **Fase 10 — ValidacionPagosScreen**: pantalla completa de validación de pagos con spinner per-row (Aprobar / Rechazar independientes por fila).
  - `screens/validacion/types.ts` — interfaces `PendingAppointment`, `VerificationAction`, `RowLoadingState`.
  - `screens/validacion/hooks/useValidacionData.ts` — React Query: lista de citas `payment_submitted`, enriquecimiento en memoria con nombre de servicio y empleado, mutación `verifyMutation` que inserta en `appointment_verifications` y actualiza `appointments.status`.
  - `screens/validacion/components/ValidacionRow.tsx` — card con franja de color del empleado, datos de la cita y botones Aprobar/Rechazar con `ActivityIndicator` per-row.
  - `screens/ValidacionPagosScreen.tsx` — orquestador con `FlatList`, `RefreshControl`, estado `rowLoading` per-row y empty state "Todo al día".
- **Tabla `appointment_verifications`** en Supabase: registra cada acción de verificación (`approved`/`rejected`) con RLS para roles `owner`/`dev`. FK `appointment_id` como `text` para compatibilidad con el esquema existente.
- **Navegación**: `ValidacionPagos` añadida a `MoreStackParamList`; menú "Validación de Pagos" en `MoreHomeScreen` navega a la pantalla real (reemplaza el `Alert.alert` placeholder).

---

## [1.3.1] — 2026-03-19

### Añadido
- `apps/web/public/logo-light.svg` — variante del logo horizontal para fondos claros; fills/strokes invertidos a `#0F0F0F` con las mismas opacidades que la versión oscura.

### Corregido
- Eliminado `<rect fill="#0F0F0F"/>` de `logo.svg` y `logo-icon.svg`; los SVG ahora son transparentes y delegan el fondo al contexto de uso.
- Confirmada ausencia de `"Chicas"` hardcodeado en `.ts`/`.tsx`; terminología de personal proviene siempre de `config.terminology.staff`.

### Eliminado
- `docs/replit.md` — archivo heredado de ZM Lash & Nails; ya no relevante para SalonPro (backend 100% Supabase).

---

## [1.3.0] — 2026-03

### Añadido
- Módulo Clientes (mobile): `ClientsScreen` con hooks `useClientsData` / `useClientDetail`, KPIs globales, segmentos (VIP, regulares, en riesgo, nuevos) y detalle con historial de citas y métricas.
- Pantalla Más v1.7: badges para pagos pendientes y citas sin profesional asignado; terminología de personal dinámica desde `config.terminology.staff`.

### Cambiado
- Limpieza ZM: eliminadas todas las referencias directas a colores, moneda y nombre del salón original en código vivo.
- Defaults de `tenant_settings` y `TenantConfig` ahora genéricos (USD, es-VE, `"Profesionales"`).
- Helper `formatCurrency` en mobile; uso de `config.locale.language` para fechas/números.

---

## [1.2.0] — 2026-02

### Añadido
- Paquete `@salonpro/tenant-config`: `TenantConfig` interface + `defaultTenantConfig` + 4 presets (spa-nails, barbershop, hair-salon, full-aesthetic).
- `TenantProvider` en `App.tsx`; `useTenant()` y `createTheme(config, isDark)` en todos los screens.
- Onboarding de 5 pasos en `screens/onboarding/`; `AuthGate` orquesta el flujo; `isConfigured` + `markConfigured()` en `TenantContext`.
- Tabla `tenant_settings` en Supabase con RLS y sincronización desde el onboarding.
- Supabase full-mobile: todos los flujos usan Supabase directo; eliminado cliente Express (`apiRequest`, `/api/*`).
- Landing pública completa en `apps/web` (Next.js 15 App Router): Hero, Pain Points, Features, Social Proof, Pricing, FAQ, CTA, Footer.

### Cambiado
- Seeds renombrados a `*-example.sql`; nuevos `*-template.sql` genéricos para los 4 tipos de negocio.
- `queryKey` de React Query actualizadas (`employees`, `services`, `service_categories`, `appointments`, `payments`, `inventory_items`, `dashboard_stats`, `dashboard_revenue`).

---

## [1.1.0] — 2026-01

### Añadido
- Auth Supabase en mobile y web.
- Tab **Más** con `PersonalScreen` y `SettingsScreen`.
- Notificaciones push (Expo Notifications).
- UI tablet responsive (`useResponsive`, `isTablet ≥ 768px`).
- Panel `/finanzas` en web con Auth Supabase.

### Cambiado
- Eliminado servidor Express; backend 100% Supabase.
- `metro.config.js` corregido para monorepo.
- `expo-updates` movido a raíz del monorepo.

---

## [1.0.0] — 2025-12

### Añadido
- Proyecto inicial basado en ZM Lash & Nails Beauty.
- Monorepo Yarn Workspaces: `apps/mobile`, `apps/web`, `packages/shared-schema`.
- Schema Drizzle + Zod: `employees`, `service_categories`, `services`, `clients`, `appointments`, `inventory_items`, `payments`, `profiles`.
- App móvil Expo SDK 54 con React Navigation 7, TanStack Query v5, Reanimated 4.
- Dashboard, Agenda, Servicios, Finanzas, Inventario.
