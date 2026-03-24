# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) para trabajar en este repositorio.

## Descripción del Proyecto

**SalonPro** es una plataforma SaaS multi-tenant para gestión de salones de belleza, barberías y peluquerías en LATAM. Originada desde **ZM Lash & Nails Beauty** (Lima, Perú) y convertida en producto genérico y comercializable.

**Idioma**: Toda la interfaz, respuestas de API y documentación están en **español neutro LATAM (es-VE)**.

## Stack Tecnológico

### Frontend
- **React Native 0.81** con **Expo SDK 54**
- **React 19** con React Compiler habilitado
- **React Navigation 7** (bottom tabs + native stacks)
- **TanStack React Query v5** para estado del servidor
- **React Native Reanimated 4** para animaciones

### Backend
- **Supabase** (PostgREST) — la app móvil se conecta directo a todas las entidades de negocio (employees, service_categories, services, clients, appointments, inventory_items, payments, profiles, tenant_settings)
- **Node.js 22** (especificado en `.nvmrc`) para scripts y migrations (Drizzle), sin servidor Express activo para mobile

### Base de Datos
- **Supabase PostgreSQL** — crear proyecto nuevo por tenant; NO reutilizar `udelxwwnyivknslueerr` (es de ZM Lash & Nails)
- **Drizzle ORM** con validación Zod (para migrations)
- Schema compartido en `packages/shared-schema/src/schema.ts`
- **IMPORTANTE**: Supabase retorna columnas en `snake_case` (e.g. `category_id`, `min_stock`). Las interfaces en los screens deben usar `snake_case` para las propiedades que vienen de la BD

## Estructura del Proyecto

```
├── apps/
│   ├── mobile/             # App React Native/Expo
│   │   ├── components/     # Componentes UI reutilizables
│   │   ├── contexts/       # AuthContext, TenantContext
│   │   ├── screens/        # Dashboard, Agenda, Servicios, Finanzas, Inventario…
│   │   │   └── onboarding/ # Flujo de configuración inicial (wizard multi‑paso)
│   │   ├── navigation/     # RootStackNavigator, MainTabNavigator, MoreStackNavigator
│   │   ├── hooks/          # useTheme, useResponsive, useNotifications, useTenant
│   │   ├── metro.config.js # Configuración Metro para monorepo
│   │   └── constants/      # theme.ts con Colors + createTheme(config)
│   └── web/                # Landing + /dashboard + /finanzas (Next.js)
├── packages/
│   ├── shared-schema/      # @zm/shared-schema — tablas Drizzle + schemas Zod
│   └── tenant-config/      # @salonpro/tenant-config — TenantConfig + presets
├── scripts/
│   ├── seed-auth-users.mjs             # Crea usuarios en Supabase Auth
│   └── db/
│       ├── seed-services-template.sql  # Servicios genéricos (editar antes de usar)
│       ├── seed-services-example.sql   # Referencia: servicios ZM Lash & Nails
│       ├── seed-employees-template.sql # Empleados genéricos (editar antes de usar)
│       └── seed-employees-example.sql  # Referencia: equipo ZM Lash & Nails
├── docs/
│   ├── SALONPRO_MIGRATION_GUIDE.md # Plan de migración ZM → SalonPro
│   └── design_guidelines.md        # Sistema de diseño
└── .cursor/                # Reglas de desarrollo con Cursor AI
```

## Comandos de Desarrollo

```bash
# Solo Expo (apps/mobile)
yarn mobile:dev

# Solo web (Next.js, apps/web)
yarn web:dev

# Aplicar schema a PostgreSQL
yarn db:push

# Cargar datos de ejemplo (templates genéricos)
yarn db:seed

# Linting y formateo
yarn lint
yarn lint:fix
yarn format

# Type checking
yarn check:types

# Build web
yarn build
yarn web:build
yarn mobile:build
```

## Configuración del Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Seeds (opcional)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SEED_AUTH_PASSWORD=TuPasswordSeguro123!

# Drizzle migrations
DATABASE_URL=postgresql://user:pass@host:5432/nombre_bd
```

Web (Next.js) usa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `apps/web/.env.local`.

## Arquitectura de la Base de Datos

Tablas principales en `packages/shared-schema/src/schema.ts`:
- **profiles** - Perfiles de usuario (id = auth.users.id), rol (dev | owner | staff), employee_id opcional; RLS por rol
- **employees** - Personal del negocio: nombre, email, color, commission_percentage (%), notas, is_active
- **service_categories** - Agrupaciones de servicios
- **services** - Servicios ofrecidos (precio, duración)
- **clients** - Base de datos de clientes
- **appointments** - Citas programadas con verificación de disponibilidad
- **inventory_items** - Productos y suministros
- **payments** - Registros financieros

RLS en Supabase (mobile ya migrado 100% a estas tablas): profiles (lectura propia; admins ven/editan todos), employees (todos autenticados leen; solo admins escriben), appointments (staff/dev/owner leen y escriben), payments e inventory_items (solo dev/owner), tenant_settings (solo dev/owner).

## Sistema de Tenant (`@salonpro/tenant-config`)

El paquete `packages/tenant-config` define la interface `TenantConfig` y cuatro presets:

| Preset | Tipo | Color primario |
|--------|------|----------------|
| `spaNavilsPreset` | `spa-nails` | #E91E8C |
| `barbershopPreset` | `barbershop` | #1A237E |
| `hairSalonPreset` | `hair-salon` | #6A1B9A |
| `fullAestheticPreset` | `full-aesthetic` | #00695C |

### Hooks y contextos clave
- `useTenant()` — accede a `config`, `updateTenant`, `markConfigured`, `isConfigured`, `isLoading`
- `useTheme()` — retorna `createTheme(config, isDark)`: colores primary/accent dinámicos
- `config.locale.currency.symbol` — símbolo de moneda (reemplaza cualquier moneda hardcodeada)
- `config.terminology.staff` — terminología dinámica del personal por tipo de negocio (por defecto `"Profesionales"`)

### Flujo de onboarding (mobile)

Al primer inicio (sin `@salonpro/tenant_configured` en AsyncStorage) o cuando se fuerza en desarrollo:
0. **OnboardingEntryScreen** — pantalla de entrada:
   - "Crear nuevo negocio" (wizard completo)
   - "Ya tengo cuenta" (abre `LoginScreen` clásico; si el tenant ya está configurado → va directo al panel)
1. **OnboardingBusinessTypeScreen** — elige tipo → aplica preset
2. **OnboardingBasicInfoScreen** — nombre + colores con preview
3. **OnboardingTeamScreen** — primer empleado (guarda en Supabase, omitible)
4. **OnboardingServicesScreen** — categorías sugeridas (intenta insert en `service_categories`; en dev se toleran errores RLS y se continua)
5. **OnboardingAuthScreen** — registro/login final con el mismo look del onboarding; usa `AuthContext.login`
6. **OnboardingCompleteScreen** — éxito → llama `markConfigured()` → upsert en `tenant_settings` + marca local

En desarrollo se puede forzar siempre el onboarding con `EXPO_PUBLIC_FORCE_ONBOARDING=true` (aunque ya exista config remota).

## Sistema de Diseño

**Paleta de colores**: dinámica según `TenantConfig.theme` (primary + accent).
Valores por defecto (preset `spa-nails`):
- **Primario**: #E91E8C
- **Acento**: #D4AF37

`createTheme(config, isDark)` en `constants/theme.ts` sobreescribe `primary`, `accent`, `violet`, `gold`, `warning`, `link`, `tabIconSelected` e `info` con los colores del tenant.

**Sistema de espaciado**: xs (4px) → sm (8px) → md (12px) → lg (16px) → xl (20px) → 2xl (24px) → 3xl (32px)

## Patrones Importantes

### Frontend
- Componentes temáticos con soporte dark mode automático via `useTheme()`
- React Query para caching y sincronización con Supabase
- Error Boundaries con UI de fallback
- Código específico por plataforma: `.web.ts`, `.ios.ts`
- `snake_case` para propiedades de Supabase; `camelCase` en TypeScript
- Comentarios en español neutro LATAM (es-VE)
- `useResponsive()` hook para UI tablet (≥768px)

### Compartido
- Schema único como fuente de verdad (Drizzle + Zod + TS)
- Type safety end-to-end; sin `any`

## Navegación

5 tabs: **Inicio** (Dashboard), **Agenda**, **Servicios**, **Más** (menú), **Perfil**.

- **Más** abre un stack con menú (para rol dev/owner):
  1. Validación de Pagos
  2. Asignar Profesionales (terminología dinámica via `config.terminology.staff`)
  3. Finanzas
  4. Profesionales
  5. Clientes
  6. Inventario
  7. Enviar Promo WA (solo si `config.features.whatsapp` está activo)
  8. Configuración
  9. Mi Perfil
  10. Cerrar sesión
- Para rol staff se muestran solo las opciones relevantes de cuenta (Configuración, Mi Perfil, Cerrar sesión).

Flujo de arranque (mobile):
- `AuthGate` → Splash.
- Si **tenant no configurado** (o `EXPO_PUBLIC_FORCE_ONBOARDING=true` y aún no se completó el wizard en esta sesión):
  - `OnboardingEntryScreen` → (nuevo) wizard pasos 1–6 descritos arriba.
- Si **tenant configurado** pero sin sesión:
  - `LoginScreen` clásico.
- Si **tenant configurado + sesión**:
  - `MainTabNavigator`.

## Notas para Desarrollo

- **Autenticación (estado actual)**: `AuthContext` está en **modo desarrollo**, sin Supabase Auth real:
  - Acepta cualquier email/contraseña no vacíos y crea un perfil dev/owner con un UUID fijo.
  - Esto permite probar navegación, RLS y flujos de negocio sin montar aún Supabase Auth en mobile.
  - `LoginScreen` (clásico) se usa para "Ya tengo cuenta" y para re‑ingreso cuando el tenant ya está configurado.
  - `OnboardingAuthScreen` reutiliza `AuthContext.login` pero con UI alineada al onboarding.
- **Moneda (mobile)**: viene de `config.locale.currency.symbol` — NO hardcodear `S/`
- **Moneda (web/landing)**: usa `$` USD como símbolo estándar internacional — NO hardcodear `S/`
- **Terminología del personal**: viene de `config.terminology.staff` — NO hardcodear "chicas"
- **Nombre del negocio**: viene de `config.businessName` — NO hardcodear nombre específico
- **Colores**: vienen de `config.theme.primaryColor` / `accentColor` — NO hardcodear `#7B2D8E` ni `#D4AF37`
- **Multiplataforma**: Un solo código para iOS, Android y Web
- **TypeScript**: `apps/mobile/tsconfig.json` usa `module: "esnext"` (sin extender expo/tsconfig.base.json)
- Usar `nvm use` para asegurar la versión correcta de Node

## Cambios Recientes (feb 2026 — v1.2.0 — migración SalonPro)

- **Fase 2 — paquete `@salonpro/tenant-config`**: `TenantConfig` interface + `defaultTenantConfig` + 4 presets (spa-nails, barbershop, hair-salon, full-aesthetic). Registrado como workspace en `apps/mobile`.
- **Fase 3 — integración TenantContext**: `TenantProvider` en `App.tsx`; `useTenant()` en todos los screens; `createTheme(config, isDark)` en `constants/theme.ts`; `useTheme()` actualizado. Eliminadas todas las referencias hardcodeadas al salón original: nombre, colores, moneda local, canal de notificaciones Android.
- **Fase 4 — limpieza de seeds**: `seed-{services,employees}.sql` renombrados a `*-example.sql`; creados `*-template.sql` genéricos para los 4 tipos de negocio; `seed-auth-users.mjs` con emails `@ejemplo.com`; contraseña inicial `SalonPro2025!`.
- **Fase 5 — onboarding flow**: 5 pantallas en `screens/onboarding/`; `AuthGate` orquesta el flujo; `TenantContext` agrega `isConfigured` + `markConfigured()` con clave `@salonpro/tenant_configured` en AsyncStorage.
- **Fase 6 — tenant_settings**: tabla `tenant_settings` en Supabase con RLS y sincronización desde el onboarding (`tenantSettingsService` y `TenantContext`).
- **Fase 7 — Supabase full-mobile**: todos los flujos mobile (Onboarding, Dashboard, Agenda, Servicios, Personal, Finanzas, Inventario) usan Supabase directo; eliminado el cliente Express (`apiRequest`, `/api/*`) y actualizadas las `queryKey` de React Query (`employees`, `services`, `service_categories`, `appointments`, `payments`, `inventory_items`, `dashboard_stats`, `dashboard_revenue`).
- **Landing web**: landing pública completa en `apps/web` con Next.js 15 App Router; secciones Hero (mockup animado), Pain Points, Features, Social Proof, Pricing (toggle mensual/anual), FAQ, CTA, Footer; scroll reveal con IntersectionObserver; moneda `$` USD en toda la landing.

## Cambios Recientes (mar 2026 — v1.4.2 — Fase 13: Dashboard de métricas web)

- **Ruta `/dashboard`** (`apps/web/src/app/dashboard/`): panel de KPIs (citas e ingresos hoy/mes, sin asignar, gráfico ingresos 7 días en CSS, próximas citas, top 5 servicios del mes). Cliente `"use client"`; datos vía `useDashboardData.ts` — **queries Supabase separadas** y combinación en memoria (sin joins profundos PostgREST). Nombre del negocio desde `tenant_settings` (`business_name`, fila `id` = usuario Auth) y moneda `currency_symbol`; helper `formatCurrency` en `apps/web/src/lib/format.ts`.
- **Auth y roles**: layout con `FinanzasAuthWrapper`; sin sesión → `/finanzas/login`; `owner`/`dev` ven el panel; **staff** autenticado → `router.replace("/")` sin pantalla de error (no revelar la ruta). Enlace **Dashboard** en header de `/finanzas`.
- **Nota**: agrupación del gráfico por día usa calendario local del navegador; comentario TODO en código para alinear con timezone del tenant cuando exista.

## Cambios Recientes (mar 2026 — v1.4.4 — Marca diamante + EAS)

- **Marca (web/mobile)**: símbolo único **`/logo-diamondSparkle.svg`** (sin texto en el asset). Navbar (`next/image`): barra clara tras scroll en modo claro aplica **`invert`** al mismo SVG; en `dark:` sin invert. Footer y splash mobile solo el diamante (PNG `splash-icon.png` / `assets`). Eliminados `logo.svg`, `logo-light.svg`, `logo-icon.svg` y logos legacy en mobile.
- **EAS**: un solo **`apps/mobile/eas.json`** (eliminado `eas.json` en raíz). `app.json` mobile: `icon`, **`updates.url`** para canales (`preview` / `production`). Perfil `preview` con env de Supabase URL; `EXPO_PUBLIC_SUPABASE_ANON_KEY` (y demás) vía **entornos del proyecto en expo.dev**. Scripts `yarn build:preview:android|ios` en el workspace mobile.
- **Raíz `app.json` / `assets/images`**: íconos y splash alineados al diamante; adaptive Android usa `android-icon-foreground.png`.

## Cambios Recientes (mar 2026 — v1.4.3 — Modularización mobile + TenantConfig)

- **Pantallas en módulos** (`apps/mobile/screens/`): `agenda/`, `dashboard/`, `finances/`, `inventory/` con `types`, `hooks`, `components` y estilos; `AgendaScreen`, `DashboardScreen`, `FinancesScreen`, `InventoryScreen` como orquestadores finos. Queries de dashboard con `queryFn` para `dashboard_stats` y `appointments_today`.
- **`TenantConfig`**: campo opcional `features?.whatsapp` (default `whatsapp: false` en `defaultTenantConfig`) para UI de promo WA / ajustes.
- **`AuthContext`**: export de tipo `Role` para consumo en pantallas (p. ej. `MoreHomeScreen`).
- **Ajustes varios**: icono Feather válido en menú promo WA (`send`); formato Prettier en varios screens.

## Cambios Recientes (mar 2026 — v1.4.1 — Fase 12B: Bot WABA en Landing Web)

- **`WABAPreview` component** (`apps/web/src/components/ui/WABAPreview.tsx`): conversación animada tipo WhatsApp (4 mensajes, loop automático ~5s); header estilo WABA con avatar gradiente; badge "24/7".
- **`constants.ts`** — tipo `Plan` extendido con `wabaFeatures: string[]` y `wabaConversations: number | 'unlimited'`; `PLANS` actualizado con bundles por plan (50 / 300 / ∞ conv.); nueva constante `WABA_ADDON_TIERS` (3 packs extra); feature "Bot WhatsApp 24/7" al inicio de `FEATURES`; 5 filas WABA en `COMPARISON_FEATURES` (tipo `boolean | string`); 2 FAQs sobre WABA.
- **`PricingCard`**: badge WABA con conteo de conversaciones siempre visible; sección "WhatsApp Bot" con divisor y features en verde `#25D366`; features principales separadas de features WABA.
- **`PricingSection`**: estado `showAddon` + bloque desplegable con los 3 packs add-on (`WABA_ADDON_TIERS`); tabla comparativa actualizada para renderizar celdas `string`.
- **`FeaturesSection`**: card hero full-width oscura (bg `zinc-950`) con texto + `WABAPreview` a la derecha, insertada antes del grid de features.
- **`DemoSection`**: tab "💬 WhatsApp" agregado (5º tab) con `accent: "#25D366"` y mockup en fondo `#0B1418`.

## Cambios Recientes (mar 2026 — v1.4.0 — Fase 12: Landing Web Rediseño LATAM)

- **`GradientButton` component** (`apps/web/src/components/ui/GradientButton.tsx`): botón reutilizable con gradiente 135° `#E91E8C → #9C27B0 → #3D3D8F → #1565C0`; variante `outline` para CTAs secundarios; props `size` (sm/md/lg) y `className`.
- **`DemoSection`** (`apps/web/src/components/sections/DemoSection.tsx`): sección interactiva con 4 tabs (Agenda, Finanzas, Personal, Inventario); mockup de celular animado por tab con franja de color, badges de estado y glow; stats de impacto por módulo; CTA inline contextual.
- **Navbar**: ícono diamante `/logo-diamondSparkle.svg` (ver v1.4.4 para barra clara/`invert`); link "Demo"; CTA "Empezar gratis" con `GradientButton`; hamburger mobile con menú oscuro backdrop-blur.
- **HeroSection**: headline rediseñado para LATAM ("El software que tu salón merece / y que tus clientes van a notar.") con gradiente en texto; CTAs reemplazados por `GradientButton` + variante outline ("Ver demo en vivo →").
- **CtaSection**: CTA principal usa `GradientButton` en lugar de botón `bg-accent`.
- **PricingCard**: botón del plan destacado (Pro) usa gradiente via `style` inline.
- **Footer**: diamante con `next/image` (sin wordmark en el asset; ver v1.4.4).
- **page.tsx**: `<DemoSection />` insertada entre `<FeaturesSection />` y `<SocialProofSection />`.

## Cambios Recientes (mar 2026 — v1.3.3 — Fase 11: AsignarProfesionalesScreen)

- **AsignarProfesionalesScreen**: pantalla completa para asignar un profesional a citas sin `employee_id` en los próximos 7 días.
  - `screens/asignar/types.ts` — `UnassignedAppointment`, `RowAssignState`.
  - `screens/asignar/hooks/useAsignarData.ts` — citas sin asignar con rango 7 días (refetch 30s), empleados activos (`queryKey: ['employees', 'active']` para evitar colisión con query sin filtro), enriquecimiento de nombre de servicio en memoria, mutación que actualiza `appointments.employee_id` e invalida badges.
  - `screens/asignar/components/AsignarRow.tsx` — card con chips horizontales de color por empleado, botón confirmar con `ActivityIndicator` per-row; `EmptyState` extraído fuera del componente padre para evitar remount.
  - `screens/AsignarProfesionalesScreen.tsx` — orquestador con `FlatList`, `RefreshControl` y empty state con terminología dinámica (`config.terminology.appointment` / `staffSingular`).
- **Navegación**: `AsignarProfesionales: undefined` en `MoreStackParamList`; `Alert.alert` placeholder en `MoreHomeScreen` reemplazado por `navigation.navigate("AsignarProfesionales")`.

## Cambios Recientes (mar 2026 — v1.3.2 — Fase 10: ValidacionPagosScreen)

- **ValidacionPagosScreen**: pantalla completa de validación de pagos con spinner per-row independiente por fila.
  - `screens/validacion/types.ts` — `PendingAppointment`, `VerificationAction`, `RowLoadingState`.
  - `screens/validacion/hooks/useValidacionData.ts` — citas `payment_submitted`, enriquecimiento en memoria, mutación que inserta en `appointment_verifications` y actualiza `appointments.status`.
  - `screens/validacion/components/ValidacionRow.tsx` — card con franja de color del empleado, botones Aprobar/Rechazar con `ActivityIndicator` per-row.
  - `screens/ValidacionPagosScreen.tsx` — orquestador con `FlatList`, `RefreshControl` y empty state.
- **Tabla `appointment_verifications`**: registra cada acción de verificación (`approved`/`rejected`) con RLS para `owner`/`dev`; FK `appointment_id text` para compatibilidad con el esquema existente.
- **Navegación**: `ValidacionPagos` en `MoreStackParamList`; placeholder `Alert.alert` reemplazado por navegación real.

## Cambios Recientes (mar 2026 — v1.3.1 — correcciones post-verificación)

- **Histórico — logos horizontales** (`logo.svg`, `logo-light.svg`, `logo-icon.svg`): sin `<rect>` de fondo en horizontal/icon; **sustituidos en v1.4.4** por marca diamante (`logo-diamondSparkle*.svg`).
- **Auditoría "Chicas"**: confirmado que no existen referencias a `"Chicas"` hardcodeadas en `.ts`/`.tsx`; terminología de personal proviene siempre de `config.terminology.staff`.
- **`replit.md` eliminado**: archivo heredado de ZM Lash & Nails removido de `docs/`; `docs/INDEX.md` actualizado.

## Cambios Recientes (mar 2026 — v1.3.0)

- **Limpieza ZM**: eliminación de referencias directas a colores, moneda y nombres específicos del salón original en código vivo; defaults de `tenant_settings` y `TenantConfig` ahora son genéricos (USD, es-VE, `"Profesionales"` como terminología base).
- **Moneda y locale dinámicos**: helper `formatCurrency` en mobile y uso consistente de `config.locale.language` para fechas y números; se elimina cualquier dependencia de `es-PE`/moneda fija en UI.
- **Módulo Clientes (mobile)**: nuevo `ClientsScreen` con hooks (`useClientsData`, `useClientDetail`), KPIs globales, segmentos (VIP, regulares, en riesgo, nuevos) y detalle por cliente (historial de citas y métricas).
- **Pantalla Más v1.7**: menú de administración ampliado (Validación de Pagos, Asignar Profesionales, Finanzas, Profesionales, Clientes, Inventario, Enviar Promo WA) con badges para pagos pendientes y citas sin profesional, y terminología de personal siempre tomada de `config.terminology.staff`.

## Historial anterior (v1.1.0)

- Auth Supabase, tab Más, PersonalScreen, SettingsScreen, notificaciones push, eliminación server Express, expo-updates en raíz, metro.config.js fix, UI tablet responsive, web /finanzas con Auth Supabase.
