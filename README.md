# SalonPro

Sistema de gestión integral para salones de belleza, barberías y peluquerías en LATAM.
Construido como SaaS multi-tenant sobre React Native + Expo + Supabase.

> Basado en [ZM Lash & Nails Beauty](https://www.instagram.com/zmlashandnails) — salón en Lima, Perú.

---

## Tipos de negocio soportados

| Tipo | Terminología | Ejemplo |
|------|-------------|---------|
| 💅 Spa / Uñas (`spa-nails`) | chicas / especialista / cita | Spa Bella |
| ✂️ Barbería (`barbershop`) | barberos / barbero / turno | Barbería Clásica |
| 💇 Peluquería (`hair-salon`) | estilistas / estilista / cita | Salón de Estilo |
| 🌿 Estética Integral (`full-aesthetic`) | especialistas / especialista / cita | Centro Estético |

---

## Inicio Rápido

```bash
# Requisitos: Node 22, Yarn 4
nvm use

# Instalar dependencias
yarn install

# Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales Supabase

# Iniciar app mobile (Expo)
yarn mobile:dev

# Iniciar web (Next.js)
yarn web:dev
```

---

## Configuración del Tenant

Al iniciar la app por primera vez (sin config guardada), se muestra el **onboarding de 4 pasos**:

1. **Tipo de negocio** — elige entre los 4 tipos; aplica el preset correspondiente
2. **Nombre y colores** — personaliza nombre, color primario y de acento
3. **Primer empleado** — agrega al primer miembro del equipo (opcional)
4. **Categorías de servicios** — confirma las categorías sugeridas por tipo

La configuración se guarda en `AsyncStorage` (`@salonpro/tenant_config`) y es editable después desde Configuración.

Para configurar manualmente, edita los seeds antes de ejecutarlos:

```bash
# Editar con los datos de tu negocio:
scripts/db/seed-services-template.sql
scripts/db/seed-employees-template.sql
scripts/seed-auth-users.mjs

# Aplicar schema
yarn db:push

# Cargar datos de ejemplo
yarn db:seed
```

---

## Stack Tecnológico

- **App móvil**: React Native 0.81 + Expo SDK 54 + React 19
- **Navegación**: React Navigation 7 (bottom tabs + native stacks)
- **Estado servidor**: TanStack React Query v5
- **Animaciones**: React Native Reanimated 4
- **Backend**: Supabase (Auth + PostgREST) — sin servidor Express
- **Schema compartido**: Drizzle ORM + Zod (`packages/shared-schema`)
- **Config de tenant**: `packages/tenant-config` (`@salonpro/tenant-config`)
- **Web**: Next.js (`apps/web`) — landing pública + panel `/finanzas`
- **Monorepo**: Yarn Workspaces

---

## Estructura del Proyecto

```
├── apps/
│   ├── mobile/               # App React Native/Expo
│   │   ├── contexts/         # AuthContext, TenantContext
│   │   ├── screens/
│   │   │   └── onboarding/   # Flujo de configuración inicial
│   │   ├── navigation/       # RootStack, MainTabs, MoreStack
│   │   ├── hooks/            # useTheme, useResponsive, useTenant…
│   │   └── constants/        # theme.ts con createTheme(config)
│   └── web/                  # Landing pública + panel /finanzas
├── packages/
│   ├── shared-schema/        # @zm/shared-schema — Drizzle + Zod
│   └── tenant-config/        # @salonpro/tenant-config — TenantConfig + presets
├── scripts/
│   ├── seed-auth-users.mjs   # Crea usuarios en Supabase Auth
│   └── db/
│       ├── seed-services-template.sql   # Servicios genéricos (editar antes de usar)
│       ├── seed-services-example.sql    # Referencia: servicios de ZM Lash & Nails
│       ├── seed-employees-template.sql  # Empleados genéricos (editar antes de usar)
│       └── seed-employees-example.sql   # Referencia: equipo de ZM Lash & Nails
└── docs/
    ├── SALONPRO_MIGRATION_GUIDE.md  # Plan de migración ZM → SalonPro
    └── design_guidelines.md         # Sistema de diseño
```

---

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `yarn mobile:dev` | Inicia Expo (app móvil) |
| `yarn web:dev` | Inicia Next.js (web) |
| `yarn db:push` | Aplica schema a PostgreSQL vía Drizzle |
| `yarn db:seed` | Carga datos de ejemplo (templates) |
| `yarn check:types` | Type checking TypeScript |
| `yarn lint` | Verifica código con ESLint |
| `yarn format` | Formatea con Prettier |

---

## Variables de Entorno

```bash
# Supabase (app móvil)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase (web Next.js) — en apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Seeds (opcional)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SEED_AUTH_PASSWORD=TuPasswordSeguro123!

# Base de datos (Drizzle migrations)
DATABASE_URL=postgresql://user:pass@host:5432/nombre_bd
```

---

## Roles de Usuario

| Rol | Acceso |
|-----|--------|
| `dev` | Total — administrador técnico |
| `owner` | Total — dueño/a del negocio |
| `staff` | Limitado — Agenda + Mis ganancias |

---

## Documentación

- [Guía de migración ZM → SalonPro](docs/SALONPRO_MIGRATION_GUIDE.md)
- [Lineamientos de diseño](docs/design_guidelines.md)
- [CLAUDE.md](CLAUDE.md) — instrucciones para Claude Code

---

**Versión**: 1.1.0 · **Licencia**: Privado · **Plataformas**: iOS · Android · Web
