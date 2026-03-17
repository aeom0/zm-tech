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

### [MONOREPO_MIGRACION.md](MONOREPO_MIGRACION.md)
Estructura del monorepo y comandos (sin servidor Express).

### [COMPARACION_PROYECTOS_Y_MEJORAS.md](COMPARACION_PROYECTOS_Y_MEJORAS.md)
Comparación con otros proyectos (ZM, Scout360); nota: SalonPro usa 100% Supabase.

### [replit.md](replit.md)
Documentación técnica heredada de ZM; en SalonPro el backend es Supabase (PostgREST + Auth), no Express.

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
├── COMPARACION_PROYECTOS_Y_MEJORAS.md
└── replit.md                   # Referencia técnica (origen ZM)

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
- **Web**: `apps/web/` — Next.js App Router
- **Tema**: `apps/mobile/constants/theme.ts`; tenant: `TenantContext` + `tenant_settings`

### MCP (Cursor)
- Dos servidores en `.cursor/mcp.json`: **supabase-salonpro** (este proyecto) y **supabase-zm** (referencia). Para BD de SalonPro usar supabase-salonpro.

**Última actualización**: 2026-03
