# Changelog — SalonPro

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

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
