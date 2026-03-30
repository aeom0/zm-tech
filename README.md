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

Al iniciar la app por primera vez (sin config guardada), se muestra el **onboarding de 5 pasos**:

1. **Tipo de negocio** — elige entre los 4 tipos; aplica el preset correspondiente
2. **Nombre y colores** — personaliza nombre, color primario y de acento
3. **Primer empleado** — agrega al primer miembro del equipo (opcional)
4. **Categorías de servicios** — confirma las categorías sugeridas por tipo
5. **Resumen** — revisión y confirmación; al terminar se persiste en `tenant_settings` (Supabase) y en AsyncStorage (`@salonpro/tenant_config`)

La configuración se sincroniza con la tabla `tenant_settings` en Supabase y es editable después desde Configuración (incluye **horario de trabajo**: zona horaria IANA + franja por día en `business_hours`, también en el panel web `/panel/horarios`). La **Agenda** móvil usa esa zona y franja para el calendario y las citas (`@salonpro/tenant-config`: Luxon + `working-schedule`).

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
- **Backend**: Supabase (Auth + PostgREST) — sin servidor Express. Proyecto: `xidjomlxpuosupymcsaj`
- **Schema compartido**: Drizzle ORM + Zod (`packages/shared-schema`) — índices FK y tabla `appointment_verifications` alineados con Supabase; RLS/funciones documentadas en `scripts/db/migrations/20260324_advisor_rls_performance.sql` (aplicación remota vía MCP o SQL Editor si aplica)
- **Config de tenant**: `packages/tenant-config` (`@salonpro/tenant-config`) — presets, `TenantConfig` (incluye `features?.whatsapp` para promo WA / ajustes)
- **Web**: Next.js (`apps/web`) — landing pública + paneles `/dashboard` (KPIs) y `/finanzas` (solo rol `owner`/`dev`; login en `/finanzas/login`)
- **Web (panel)**: área autenticada en `/panel` — primera sección **`/panel/servicios`**: CRUD categorías + servicios (PR-06), packs + promos con ítems (PR-06B); tab activo vía **`?tab=`**.
- **Monorepo**: Yarn Workspaces

---

## Estructura del Proyecto

Este monorepo usa la convención estándar `apps/` para aplicaciones y `packages/` para librerías compartidas.

> **Nota para Claude Chat (integración GitHub):** Las carpetas se muestran con su nombre técnico en el árbol de archivos. La siguiente tabla explica qué es cada una:

| Carpeta en GitHub | Qué contiene | Tecnología |
|-------------------|-------------|-----------|
| `apps/mobile/` | **App Móvil (Expo)** — la aplicación principal para iOS, Android y Web | React Native 0.81 + Expo SDK 54 |
| `apps/web/` | **Web (Next.js)** — landing + `/dashboard` + `/finanzas` (auth Supabase) | Next.js 15 + Tailwind CSS |
| `packages/shared-schema/` | **Schema Compartido** — tablas de base de datos y validaciones | Drizzle ORM + Zod |
| `packages/tenant-config/` | **Config de Tenant** — presets y configuración multi-tenant | TypeScript |
| `server/` | *(No usado)* — La app conecta directo a Supabase; no hay Express | — |
| `scripts/` | **Scripts de base de datos** — seeds y migraciones | SQL + Node.js |
| `docs/` | **Documentación** — guías de migración y diseño | Markdown |

```
├── apps/
│   ├── mobile/               # App Móvil (Expo) — iOS + Android + Web
│   │   ├── contexts/         # AuthContext, TenantContext
│   │   ├── screens/          # Pantallas orquestadoras + módulos por feature
│   │   │   ├── agenda/       # Tipos, hooks, componentes (AgendaScreen delgado)
│   │   │   ├── dashboard/    # KPIs, citas, modal — hooks + componentes
│   │   │   ├── finances/     # Estilos, tipos, constantes (FinancesScreen delgado)
│   │   │   ├── inventory/    # Inventario por tabs — hooks + componentes
│   │   │   ├── onboarding/ # Flujo de configuración inicial (5 pasos)
│   │   │   └── …           # validacion/, asignar/, clients/, settings/, etc.
│   │   ├── navigation/       # RootStack, MainTabs, MoreStack
│   │   ├── hooks/            # useTheme, useResponsive, useTenant…
│   │   └── constants/        # theme.ts con createTheme(config)
│   └── web/                  # Web (Next.js) — landing + /dashboard + /finanzas
├── packages/
│   ├── shared-schema/        # Schema Compartido — @zm/shared-schema (Drizzle + Zod)
│   └── tenant-config/        # Config de Tenant — @salonpro/tenant-config + 4 presets
├── (sin server/)             # Backend 100% Supabase; no hay Express
├── scripts/
│   ├── seed-auth-users.mjs   # Crea usuarios en Supabase Auth
│   └── db/
│       ├── migrations/                # SQL de referencia (p. ej. RLS / advisors ya aplicados en remoto)
│       ├── seed-services-template.sql   # Servicios genéricos (editar antes de usar)
│       ├── seed-services-example.sql    # Referencia: servicios de ZM Lash & Nails
│       ├── seed-employees-template.sql  # Empleados genéricos (editar antes de usar)
│       └── seed-employees-example.sql   # Referencia: equipo de ZM Lash & Nails
├── migrations/                        # Salida de `yarn db:generate` (Drizzle Kit)
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
| `yarn db:push` | Aplica schema a PostgreSQL vía Drizzle (`packages/shared-schema`) |
| `yarn db:generate` | Genera migraciones SQL versionadas en `./migrations/` (Drizzle Kit) |
| `yarn db:studio` | Abre Drizzle Studio contra `DATABASE_URL` |
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

# Webhook WABA (apps/web)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
META_WABA_VERIFY_TOKEN=token_de_verificacion_meta
```

---

## Webhook WABA (Meta)

SalonPro incluye un endpoint para recibir mensajes entrantes de WhatsApp Cloud API y almacenarlos en Supabase.

- Endpoint: `POST /api/waba/webhook` (recepción de eventos)
- Verificación Meta: `GET /api/waba/webhook` (challenge de `hub.*`)
- Tabla destino: `public.waba_inbound_messages`

Campos guardados por mensaje:

- `wa_message_id`
- `from_phone`
- `profile_name`
- `message_type`
- `message_text`
- `message_timestamp`
- `raw_payload`
- `created_at`

Pasos en Meta Developers:

1. Ir a tu app de Meta > Webhooks > seleccionar `whatsapp_business_account`.
2. Configurar callback URL: `https://tu-dominio.com/api/waba/webhook`.
3. Configurar verify token igual a `META_WABA_VERIFY_TOKEN`.
4. Suscribir al campo `messages`.

Consulta rápida de auditoría:

```sql
select
  created_at,
  from_phone,
  profile_name,
  message_type,
  message_text
from public.waba_inbound_messages
order by created_at desc
limit 20;
```

---

## Roles de Usuario

| Rol | Acceso |
|-----|--------|
| `dev` | Total — administrador técnico; web: `/dashboard`, `/finanzas` |
| `owner` | Total — dueño/a del negocio; web: `/dashboard`, `/finanzas` |
| `staff` | Limitado — Agenda + Mis ganancias; sin paneles web admin (redirige a `/` si intenta `/dashboard`) |

### Panel web `/panel`

- **Login**: `GET /login` (Supabase Auth email/password).
- **Guard SSR**: rutas bajo `/panel/*` validan sesión desde Server Components; sin sesión redirige a `/login`.
- **Servicios**: `GET /panel/servicios` — catálogo: `service_categories`, `services` (toggle `is_active`), `packs`, `promotions` + `promotion_items` (PostgREST desde el cliente; rol con RLS según políticas Supabase).

---

## Documentación

- [Índice de docs](docs/INDEX.md) — mapa de guías en `docs/`
- [Guía de migración ZM → SalonPro](docs/SALONPRO_MIGRATION_GUIDE.md)
- [Lineamientos de diseño](docs/design_guidelines.md)
- [Desarrollo local / migraciones](docs/DESARROLLO_LOCAL.md)
- [CLAUDE.md](CLAUDE.md) — instrucciones para Claude Code
- [.cursor/README.md](.cursor/README.md) — reglas Cursor y MCP (dos proyectos Supabase: ZM y SalonPro)

---

## Assets de Marca

Marca principal: solo el símbolo en `logo-diamondSparkle.svg` (sin texto en el asset). Navbar / footer / splash usan ese archivo; en barra clara (scroll, modo claro) el SVG se invierte con CSS para contraste.

| Archivo | Uso |
|---------|-----|
| `logo-diamondSparkle.svg` | **Principal** — diamante claro, fondos oscuros o transparentes |
| `logo-diamondSparkle-positive.svg` | Opcional — export con fondo claro (p. ej. materiales) |
| `logo-diamondSparkle-negative.svg` | Opcional — preview con fondo negro (redes) |
| `favicon.png` | Favicon (desde `logo-diamondSparkle.svg`) |

En `apps/mobile/assets/`: misma pieza + `splash-icon.png` raster del diamante.

---

**Versión**: 1.4.5 · **Licencia**: Privado · **Plataformas**: iOS · Android · Web
