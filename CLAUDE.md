# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) para trabajar en este repositorio.

## Descripción del Proyecto

**ZM Lash & Nails Beauty** es una aplicación de gestión integral para un salón de belleza ubicado en Perú. Construida como una app móvil multiplataforma con backend moderno, permite administrar citas, personal, servicios, inventario y finanzas desde una única interfaz elegante.

**Idioma**: Toda la interfaz, respuestas de API y documentación están en **español (es-PE)**.

## Stack Tecnológico

### Frontend
- **React Native 0.81** con **Expo SDK 54**
- **React 19** con React Compiler habilitado
- **React Navigation 7** (bottom tabs + native stacks)
- **TanStack React Query v5** para estado del servidor
- **React Native Reanimated 4** para animaciones

### Backend
- **Supabase** (PostgREST) — la app móvil se conecta directo, sin Express intermedio
- **Express 5** con TypeScript (solo para web/API legacy)
- **Node.js 22** (especificado en `.nvmrc`)

### Base de Datos
- **Supabase PostgreSQL** — Proyecto: `udelxwwnyivknslueerr`, Org: `ieuurcwqsaplycfufnmw`
- **Drizzle ORM** con validación Zod (para Express/migrations)
- Schema compartido en `packages/shared-schema/src/schema.ts`
- **IMPORTANTE**: Supabase retorna columnas en `snake_case` (e.g. `category_id`, `min_stock`). Las interfaces en los screens deben usar `snake_case` para las propiedades que vienen de la BD

## Estructura del Proyecto

```
├── apps/
│   ├── mobile/             # App React Native/Expo (gestión del salón)
│   │   ├── components/     # Componentes UI reutilizables
│   │   ├── screens/        # Dashboard, Agenda, Servicios, MoreHome, Personal, Settings, Finanzas, Inventory, etc.
│   │   ├── navigation/     # RootStackNavigator, MainTabNavigator, MoreStackNavigator, ProfileStackNavigator
│   │   ├── hooks/          # useTheme, useResponsive, useScreenOptions, useColorScheme
│   │   ├── metro.config.js # Configuración Metro para monorepo
│   │   └── constants/      # Theme centralizado
│   └── web/                # Landing pública + panel /finanzas (Next.js)
├── packages/
│   └── shared-schema/      # @zm/shared-schema — tablas Drizzle + schemas Zod
├── server/                 # Backend Express
│   ├── index.ts            # App Express + CORS + static serving
│   ├── routes.ts           # Definición de endpoints API
│   ├── storage.ts          # Operaciones de base de datos
│   ├── db.ts               # Conexión Drizzle + PostgreSQL
│   └── whatsapp.ts         # Servicio WhatsApp Business API
├── scripts/                # Scripts de utilidad
│   └── db/                 # Scripts SQL de base de datos
│       ├── seed-services.sql   # 58 servicios (LISTA DE PRECIOS ZM)
│       └── seed-employees.sql  # 4 chicas con comisiones
├── docs/                   # Documentación del proyecto
│   ├── INDEX.md            # Índice de documentación
│   ├── replit.md           # Arquitectura completa
│   └── design_guidelines.md # Sistema de diseño
└── .cursor/                # Reglas de desarrollo con Cursor AI
```

## Comandos de Desarrollo

```bash
# Desarrollo (backend + Expo en paralelo)
yarn dev

# Solo backend (puerto 5000)
yarn server:dev

# Solo Expo (apps/mobile)
yarn mobile:dev

# Solo web (Next.js, apps/web)
yarn web:dev

# Aplicar schema a PostgreSQL
yarn db:push

# Linting y formateo
yarn lint
yarn lint:fix
yarn format

# Type checking
yarn check:types

# Build producción
# Build web + server
yarn build

# Opcionales: solo server o solo mobile
yarn server:build
yarn mobile:build
```

## Configuración del Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/zm_lash_nails
PORT=5000
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Mobile usa Supabase directo (Auth + PostgREST); las variables `EXPO_PUBLIC_SUPABASE_*` en `.env` (raíz). Web (Next.js) usa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `apps/web/.env.local` (mismos valores que los EXPO_PUBLIC_*).

## Arquitectura de la Base de Datos

Tablas principales en `packages/shared-schema/src/schema.ts`:
- **profiles** - Perfiles de usuario (id = auth.users.id), rol (dev | owner | staff), employee_id opcional; RLS por rol
- **employees** - Chicas del salón: nombre, email, color, commission_percentage (%), notas, is_active
- **service_categories** - Agrupaciones de servicios
- **services** - Servicios ofrecidos (precio, duración)
- **clients** - Base de datos de clientes
- **appointments** - Citas programadas con verificación de disponibilidad
- **inventory_items** - Productos y suministros
- **payments** - Registros financieros

RLS en Supabase: profiles (lectura propia; admins ven/editan todos), employees (todos autenticados leen; solo admins escriben), appointments (staff/dev/owner leen y escriben), payments e inventory_items (solo dev/owner).

## API Endpoints Principales

| Recurso | Endpoints |
|---------|-----------|
| Dashboard | `GET /api/dashboard/stats`, `GET /api/dashboard/revenue` |
| Chicas (employees) | `GET/POST /api/employees`, `PUT/DELETE /api/employees/:id` |
| Servicios | `GET/POST /api/services`, `PUT/DELETE /api/services/:id` |
| Clientes | `GET/POST /api/clients`, `PUT /api/clients/:id` |
| Citas | `GET/POST /api/appointments`, `PUT/DELETE /api/appointments/:id` |
| Inventario | `GET/POST /api/inventory`, `PATCH /api/inventory/:id/quantity` |
| Pagos | `GET /api/payments` |

## Sistema de Diseño

**Paleta de colores** (tema Violeta + Oro de lujo):
- **Primario**: Violeta (#7B2D8E)
- **Acento**: Oro (#D4AF37)
- **Modo claro**: Fondos blancos con tonos violeta sutiles
- **Modo oscuro**: Gris oscuro (#1E1E1E)

**Sistema de espaciado**: xs (4px) → sm (8px) → md (12px) → lg (16px) → xl (20px) → 2xl (24px) → 3xl (32px)

## Patrones Importantes

### Frontend
- Componentes temáticos con soporte dark mode automático
- React Query para caching y sincronización
- Error Boundaries con UI de fallback
- Código específico por plataforma: `.web.ts`, `.ios.ts`

### Backend
- CORS dinámico (localhost en dev, Replit domains en prod)
- Drizzle ORM con inferencia TypeScript completa
- Verificación de disponibilidad para evitar doble reserva

### Compartido
- Schema único como fuente de verdad (Drizzle + Zod + TS)
- Type safety end-to-end

## Navegación

5 tabs: **Inicio** (Dashboard), **Agenda**, **Servicios**, **Más** (menú), **Perfil**.

- **Más** abre un stack con menú: Finanzas, Chicas (personal y comisiones %), Inventario, Mi perfil, Configuración, Cerrar sesión. Finanzas, Chicas e Inventario solo visibles para rol dev/owner.
- **Perfil**: pantalla de usuario y cierre de sesión (también accesible desde Más).

## Notas para Desarrollo

- **Autenticación**: Supabase Auth (email + contraseña). AuthContext con sesión, perfil (role, employee_id). Login en LoginScreen; logout en Perfil o en menú Más. Usuarios @zmlashnails.com; roles en tabla `profiles` (dev, owner, staff)
- **Moneda**: Soles peruanos (S/)
- **Horario del negocio**: L-S 10 AM - 7 PM, D previa cita 10:30 AM - 1 PM
- **Dirección**: Calle Artesanos 150, Local 205, CC. Las Plazuelas de Surco, Santiago de Surco
- **RRSS**: Instagram @zmlashandnails, Facebook "ZM Lash and Nails beauty", TikTok @zm.lash.and.nails
- **WhatsApp**: +51 932 535 512
- **Equipo**: Vanessa (Lashista), Stephani (Lashista - cejas, pestañas, microblading, depilación), Yosaida (Uñas + pedicure especial), Romina (Uñas)
- **Categorías de servicio**: Extensiones de Pestañas, Lifting, Cejas y Rostro, Uñas, Microblading, Depilación
- **Terminología**: En la UI y mensajes se usa "chicas" para el personal (employees)
- **Multiplataforma**: Un solo código para iOS, Android y Web
- **TypeScript**: `apps/mobile/tsconfig.json` usa `module: "esnext"` (sin extender expo/tsconfig.base.json para evitar conflictos con `module: "preserve"`)
- Usar `nvm use` para asegurar la versión correcta de Node

## Cambios Recientes (feb 2026 — v1.1.0)

- **Auth Supabase**: Login por email + contraseña; tabla `profiles` (rol dev/owner/staff, employee_id). RLS en profiles, employees, appointments, payments, inventory_items. Chicas (staff) ven solo Agenda + "Mis ganancias"; admins ven todo.
- **Tab Más**: Sustituye tabs Finanzas e Inventario por un menú (Más): Finanzas, Chicas, Inventario, Configuración, Perfil, Cerrar sesión. Pantallas nuevas: MoreHomeScreen, PersonalScreen (Chicas con comisión % editable), SettingsScreen.
- **Chicas y comisiones**: Empleadas con email @zmlashnails.com; comisión % configurable en Más → Chicas. Esquema estándar: 60% salón (Vanessa) / 40% chica (commission_percentage = 40) en esos servicios.
- **Terminología**: "Chicas" en toda la UI; mensajes API y flujo WhatsApp en español.
- **Servicios**: Catálogo ~58 servicios (LISTA DE PRECIOS ZM). **tsconfig** mobile: `module: "esnext"`.
- **Finanzas (mobile)**: Pagos vinculados a servicio y cliente; abono 20% visible; pendiente por pagar por cita; desglose por chica (generado/pagado/pendiente) para admin; staff ve "Mis ganancias" (solo sus citas). RLS: staff puede SELECT en payments de sus citas.
- **Web /finanzas**: Ruta zmlashnails.com/finanzas con Auth Supabase (misma cuenta que la app). Login en /finanzas/login; solo dev/owner acceden al panel; staff ve "Solo administración". Variables: NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local.
- **Supabase advisors**: RLS habilitado en clients, services, service_categories, whatsapp_sessions; índices en FKs; políticas RLS con auth initplan (select auth.uid()); políticas consolidadas (una por acción).
- **UI tablet**: `useResponsive()` hook activo en Dashboard, Agenda y Finanzas. En tablet (≥768px): Dashboard con stat cards 2×2 y citas en 2 columnas; Agenda con vista columnas por chica (hora × empleada); Finanzas con KPIs y lista en 2 columnas. Modales centrados en tablet.
- **Navegación web**: `RootStackNavigator` arranca siempre en `Auth` (Splash → Login → App). La `LandingScreen` fue eliminada — la landing pública vive en `apps/web` (Next.js). `metro.config.js` agregado para resolución correcta del monorepo en web.
- **drizzle-orm**: Movido a `peerDependencies` en `packages/shared-schema` para evitar instancias duplicadas. `@types/pg` agregado como devDependency en raíz.
- **Notificaciones push (v1.1.0)**: `expo-notifications` + `expo-device` integrados. Hook `useNotifications` guarda FCM token en `profiles.push_token`. Android: canal "ZM Lash & Nails" con color violeta. Configuración en `app.json` (plugin expo-notifications, googleServicesFile). Package Android cambiado a `com.zmlashandnails.beauty`.
- **Eliminación server Express (v1.1.0)**: `server/` eliminado completamente (index.ts, routes.ts, storage.ts, db.ts, whatsapp.ts, templates/). App móvil conecta directo a Supabase. Scripts `server:dev`, `server:build`, `server:prod` eliminados de `package.json`; `dev` apunta solo a Expo. Dependencias eliminadas: express, tsx, esbuild, pg, ws, http-proxy-middleware.
- **expo-updates en raíz (v1.1.0)**: `expo-updates ~29.0.16` movido a dependencias raíz del monorepo. `runtimeVersion: { policy: "appVersion" }` en app.json — versión app 1.1.0 genera nuevo runtime para EAS builds.
- **metro.config.js fix (v1.1.0)**: `watchFolders` hace merge de `workspaceRoot` con los defaults de Expo (`[workspaceRoot, ...(config.watchFolders ?? [])]`) para pasar expo-doctor 17/17 checks.
