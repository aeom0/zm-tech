# Índice de Documentación — GeemaStudio

Documentación del sistema GeemaStudio (SaaS multi-tenant para salones/barberías/peluquerías en LATAM).

## Documentación principal

### [README.md](README.md) (este directorio)
Setup inicial: requisitos, variables de entorno, scripts, estructura.

### [README.md](../README.md) (raíz)
Descripción del producto, tipos de negocio, inicio rápido, stack, variables de entorno, roles.

### [DESARROLLO_LOCAL.md](DESARROLLO_LOCAL.md)
Desarrollo local: WSL, migraciones sin TCP (SQL Editor), seeds, variables.

### [GEEMASTUDIO_MIGRATION_GUIDE.md](GEEMASTUDIO_MIGRATION_GUIDE.md)
Guía de migración ZM → producto (monorepo GeemaStudio): fases, tenant_config, onboarding, tenant_settings.

### [design_guidelines.md](design_guidelines.md)
Sistema de diseño y especificaciones UI/UX (paleta, tipografía, componentes). Los colores reales vienen del preset del tenant.

### [DEPLOYMENT.md](DEPLOYMENT.md)
Despliegue: Supabase (backend), Vercel (web), EAS (móvil).

### [INSTALACION_BETA.md](INSTALACION_BETA.md)
Instalación / notas de beta (si aplica al flujo actual).

### [MONOREPO_MIGRACION.md](MONOREPO_MIGRACION.md)
Estructura del monorepo y comandos (sin servidor Express).

### [GEEMASTUDIO_V1.3_PLAN.md](GEEMASTUDIO_V1.3_PLAN.md)
Plan de funcionalidades v1.3 (referencia histórica / roadmap parcial).

### [tech-debt/](tech-debt/) (deuda técnica)
Seguimiento puntual (p. ej. [TD-001 — tokens onboarding](tech-debt/TD-001-onboarding-tokens.md)).


## Organización de archivos

```
docs/
├── INDEX.md                    # Este archivo
├── README.md                   # Setup inicial
├── DESARROLLO_LOCAL.md         # Migraciones, seeds, WSL
├── GEEMASTUDIO_MIGRATION_GUIDE.md # Fases de migración
├── design_guidelines.md        # Diseño UI/UX
├── DEPLOYMENT.md               # Deploy Supabase / Vercel / EAS
├── MONOREPO_MIGRACION.md       # Monorepo, comandos
├── INSTALACION_BETA.md         # Beta / instalación
├── GEEMASTUDIO_V1.3_PLAN.md    # Plan v1.3 (referencia)
└── tech-debt/                  # Deuda técnica (TD-xxx)

.cursor/
├── README.md                   # Reglas Cursor, MCP (dos proyectos Supabase)
└── rules/*.mdc
```

## Referencias rápidas

### Base de datos (Supabase)
- **Proyecto**: `xidjomlxpuosupymcsaj`
- **Schema**: `packages/shared-schema/src/schema.ts` (`yarn db:push`; opcional `yarn db:generate` / `yarn db:studio`)
- **Seeds**: `scripts/db/` (editar templates antes de `yarn db:seed`)
- **Migraciones**: `yarn db:push` o SQL Editor / MCP (ver DESARROLLO_LOCAL.md)
- **SQL de referencia RLS/advisors**: `scripts/db/migrations/20260324_advisor_rls_performance.sql`

### API
- No hay Express. Cliente usa **Supabase** (`supabase.from('tabla').select()`) desde `apps/mobile/lib/supabase.ts` y TanStack Query.

### Frontend
- **Mobile**: `apps/mobile/` — components, screens, navigation, contexts, hooks, constants
- **Pantallas modulares (mobile)**: varias rutas bajo `apps/mobile/screens/<feature>/` agrupan `types`, `hooks`, `components` y estilos; el archivo `*Screen.tsx` en `screens/` actúa como orquestador (p. ej. `agenda/`, `dashboard/`, `finances/`, `inventory/`).
- **Web**: `apps/web/` — Next.js App Router (landing pública + `/dashboard`, `/finanzas` y panel **`/panel`**: **`/panel/servicios`** (categorías, servicios, packs, promos; `?tab=`) y **`/panel/horarios`** (zona IANA + `business_hours`))
- **Tema / marca**: mobile — `apps/mobile/constants/theme.ts` + **`Gradients.onboarding`** (Lunaris) + **`Onboarding`** (tokens del canvas oscuro `#111318` en onboarding); web — **`apps/web/src/lib/theme.ts`** (`LUNARIS`, gradientes y primarios turquesa). Tenant en runtime: `TenantContext` + `tenant_settings` + `@geemastudio/tenant-config`
- **TenantConfig** (`@geemastudio/tenant-config`): presets, **`working-schedule`** (franja laboral), **`iana-timezone`** (Luxon: agenda y citas en `locale.timezone`); `features?.whatsapp` (promo WA cuando aplique)

### MCP (Cursor)
- Dos servidores en `.cursor/mcp.json`: **supabase-geemastudio** (este proyecto) y **supabase-zm** (referencia). Para BD de GeemaStudio usar supabase-geemastudio.

### Assets de marca
- `apps/web/public/logo-diamondSparkle.svg` — símbolo principal (sin texto en el SVG)
- `apps/web/public/logo-diamondSparkle-positive.svg` / `negative` — variantes para materiales o redes

### EAS (build móvil)
- Configuración única: `apps/mobile/eas.json` (ejecutar `eas build` desde `apps/mobile`)

**Última actualización**: 2026-04-03
