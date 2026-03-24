# Índice de Documentación — SalonPro

Documentación del sistema SalonPro (SaaS multi-tenant para salones/barberías/peluquerías en LATAM).

## Documentación principal

### [README.md](README.md) (este directorio)
Setup inicial: requisitos, variables de entorno, scripts, estructura.

### [README.md](../README.md) (raíz)
Descripción del producto, tipos de negocio, inicio rápido, stack, variables de entorno, roles.

### [DESARROLLO_LOCAL.md](DESARROLLO_LOCAL.md)
Desarrollo local: WSL, migraciones sin TCP (SQL Editor), seeds, variables.

### [SALONPRO_MIGRATION_GUIDE.md](SALONPRO_MIGRATION_GUIDE.md)
Guía de migración ZM → SalonPro: fases, tenant_config, onboarding, tenant_settings.

### [design_guidelines.md](design_guidelines.md)
Sistema de diseño y especificaciones UI/UX (paleta, tipografía, componentes). Los colores reales vienen del preset del tenant.

### [DEPLOYMENT.md](DEPLOYMENT.md)
Despliegue: Supabase (backend), Vercel (web), EAS (móvil).

### [INSTALACION_BETA.md](INSTALACION_BETA.md)
Instalación / notas de beta (si aplica al flujo actual).

### [MONOREPO_MIGRACION.md](MONOREPO_MIGRACION.md)
Estructura del monorepo y comandos (sin servidor Express).

### [SALONPRO_V1.3_PLAN.md](SALONPRO_V1.3_PLAN.md)
Plan de funcionalidades v1.3 (referencia histórica / roadmap parcial).


## Organización de archivos

```
docs/
├── INDEX.md                    # Este archivo
├── README.md                   # Setup inicial
├── DESARROLLO_LOCAL.md         # Migraciones, seeds, WSL
├── SALONPRO_MIGRATION_GUIDE.md # Fases de migración
├── design_guidelines.md        # Diseño UI/UX
├── DEPLOYMENT.md               # Deploy Supabase / Vercel / EAS
├── MONOREPO_MIGRACION.md       # Monorepo, comandos
├── INSTALACION_BETA.md         # Beta / instalación
└── SALONPRO_V1.3_PLAN.md       # Plan v1.3 (referencia)

.cursor/
├── README.md                   # Reglas Cursor, MCP (dos proyectos Supabase)
└── rules/*.mdc
```

## Referencias rápidas

### Base de datos (Supabase)
- **Proyecto**: `xidjomlxpuosupymcsaj`
- **Schema**: `packages/shared-schema/src/schema.ts`
- **Seeds**: `scripts/db/` (editar templates antes de `yarn db:seed`)
- **Migraciones**: `yarn db:push` o SQL Editor (ver DESARROLLO_LOCAL.md)

### API
- No hay Express. Cliente usa **Supabase** (`supabase.from('tabla').select()`) desde `apps/mobile/lib/supabase.ts` y TanStack Query.

### Frontend
- **Mobile**: `apps/mobile/` — components, screens, navigation, contexts, hooks, constants
- **Pantallas modulares (mobile)**: varias rutas bajo `apps/mobile/screens/<feature>/` agrupan `types`, `hooks`, `components` y estilos; el archivo `*Screen.tsx` en `screens/` actúa como orquestador (p. ej. `agenda/`, `dashboard/`, `finances/`, `inventory/`).
- **Web**: `apps/web/` — Next.js App Router
- **Tema**: `apps/mobile/constants/theme.ts`; tenant: `TenantContext` + `tenant_settings`
- **TenantConfig** (`@salonpro/tenant-config`): incluye `features?.whatsapp` (promo WA en Más / ajustes cuando aplique)

### MCP (Cursor)
- Dos servidores en `.cursor/mcp.json`: **supabase-salonpro** (este proyecto) y **supabase-zm** (referencia). Para BD de SalonPro usar supabase-salonpro.

### Assets de marca
- `apps/web/public/logo-diamondSparkle.svg` — símbolo principal (sin texto en el SVG)
- `apps/web/public/logo-diamondSparkle-positive.svg` / `negative` — variantes para materiales o redes

### EAS (build móvil)
- Configuración única: `apps/mobile/eas.json` (ejecutar `eas build` desde `apps/mobile`)

**Última actualización**: 2026-03-24
