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
│   └── web/                # Landing pública + panel /finanzas (Next.js)
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

## Cambios Recientes (mar 2026 — v1.3.0)

- **Limpieza ZM**: eliminación de referencias directas a colores, moneda y nombres específicos del salón original en código vivo; defaults de `tenant_settings` y `TenantConfig` ahora son genéricos (USD, es-VE, `"Profesionales"` como terminología base).
- **Moneda y locale dinámicos**: helper `formatCurrency` en mobile y uso consistente de `config.locale.language` para fechas y números; se elimina cualquier dependencia de `es-PE`/moneda fija en UI.
- **Módulo Clientes (mobile)**: nuevo `ClientsScreen` con hooks (`useClientsData`, `useClientDetail`), KPIs globales, segmentos (VIP, regulares, en riesgo, nuevos) y detalle por cliente (historial de citas y métricas).
- **Pantalla Más v1.7**: menú de administración ampliado (Validación de Pagos, Asignar Profesionales, Finanzas, Profesionales, Clientes, Inventario, Enviar Promo WA) con badges para pagos pendientes y citas sin profesional, y terminología de personal siempre tomada de `config.terminology.staff`.

## Historial anterior (v1.1.0)

- Auth Supabase, tab Más, PersonalScreen, SettingsScreen, notificaciones push, eliminación server Express, expo-updates en raíz, metro.config.js fix, UI tablet responsive, web /finanzas con Auth Supabase.
