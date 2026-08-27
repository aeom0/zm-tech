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

Guía de migración ZM → GeemaStudio: fases, tenant_config, onboarding, tenant_settings.

### [WEB_ARCHITECTURE.md](WEB_ARCHITECTURE.md) ← nuevo

Arquitectura web: dos productos (panel de gestión vs landing pública), modos `web_mode` (A/B/C), rutas implementadas y pendientes del panel, relación con RRSS y dominio de la plataforma.

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

### [01-PLAN-monorepo-estructura.md](01-PLAN-monorepo-estructura.md)

Plan 01 — draft jul-2026 (recuperado/espejado 27-ago-2026, fuente canónica en `ZM-Lash-and-Nails-Beauty`) de la fusión `ZMTech` (landing) + `geemastudio` en este monorepo. Ya ejecutada; registro histórico.

### [02-PLAN-retrofit-tenant-id.md](02-PLAN-retrofit-tenant-id.md)

Plan 02 — retrofit `tenant_id` en `udelxwwnyivknslueerr` (ZM Lash = tenant #1 → GeemaStudio multi-tenant). **Fase A/B ✅ prod**; **Fase C RLS pendiente**. Leer antes de tocar migraciones o código de `tenant_id`.

### [03-PLAN-audit-paridad-zmlash-geema.md](03-PLAN-audit-paridad-zmlash-geema.md)

Plan 03 — brief del audit de paridad (solo lectura): ZM Lash = referencia funcional → GeemaStudio.

### [Audit 03 — paridad](../../audit/03-AUDIT-paridad-zmlash-geema.md)

Resultado del audit: matriz feature × superficie, gaps críticos P0–P2, sección “No portar”.

### [Inventario features ZM → Geema](../../audit/04-INVENTARIO-features-zm-lash-para-geema.md)

Backlog accionable: ~50 capacidades de ZM Lash (mobile, web, WABA, Edge Functions) con estado en Geema, rutas de referencia y oleadas de implementación.

### [tech-debt/](tech-debt/) (deuda técnica)

Seguimiento puntual (p. ej. [TD-001 — tokens onboarding](tech-debt/TD-001-onboarding-tokens.md)).

## Organización de archivos

```
docs/
├── INDEX.md                        # Este archivo
├── README.md                       # Setup inicial
├── DESARROLLO_LOCAL.md             # Migraciones, seeds, WSL
├── GEEMASTUDIO_MIGRATION_GUIDE.md  # Fases de migración ZM → GeemaStudio
├── WEB_ARCHITECTURE.md             # Arquitectura web: dos productos, web_mode, rutas
├── design_guidelines.md            # Diseño UI/UX
├── DEPLOYMENT.md                   # Deploy Supabase / Vercel / EAS
├── MONOREPO_MIGRACION.md           # Monorepo, comandos
├── INSTALACION_BETA.md             # Beta / instalación
├── GEEMASTUDIO_V1.3_PLAN.md        # Plan v1.3 (referencia)
├── 01-PLAN-monorepo-estructura.md          # Fusión ZMTech+geemastudio → monorepo (espejo)
├── 02-PLAN-retrofit-tenant-id.md           # Retrofit tenant_id (multi-tenant BD)
├── 03-PLAN-audit-paridad-zmlash-geema.md   # Brief audit paridad ZM ↔ Geema
└── tech-debt/                              # Deuda técnica (TD-xxx)

# (fuera de docs/geemastudio/docs/)
docs/audit/
├── 03-AUDIT-paridad-zmlash-geema.md              # Resultado audit
└── 04-INVENTARIO-features-zm-lash-para-geema.md  # Backlog features a portar

.cursor/
├── README.md                       # Reglas Cursor, MCP (dos proyectos Supabase)
└── rules/*.mdc
```

## Referencias rápidas

### Base de datos (Supabase)

- **Proyecto**: `udelxwwnyivknslueerr`
- **Schema**: `packages/shared-schema/src/schema.ts` (`yarn db:push`; opcional `yarn db:generate` / `yarn db:studio`)
- **Seeds**: `scripts/db/` (editar templates antes de `yarn db:seed`)
- **Migraciones**: `yarn db:push` o SQL Editor / MCP (ver DESARROLLO_LOCAL.md)
- **SQL de referencia RLS/advisors**: `scripts/db/migrations/20260324_advisor_rls_performance.sql`

### API

- No hay Express. Cliente usa **Supabase** (`supabase.from('tabla').select()`) desde `apps/mobile/lib/supabase.ts` y TanStack Query.

### Frontend web — dos productos

- **Panel de gestión** (privado, autenticado): `/finanzas`, `/dashboard`, `/panel/*` — siempre disponible para todo tenant.
- **Landing pública** (sin auth, opcional): `/s/[slug]` — controlada por `tenant_settings.web_mode` (`'own_domain'` / `'geema_hosted'` / `'none'`). Ver [WEB_ARCHITECTURE.md](WEB_ARCHITECTURE.md).

### Frontend mobile

- `apps/mobile/` — Expo SDK **56**, React Native **0.85**, React **19.2**, TypeScript **~6.0**
- components, screens, navigation, contexts, hooks, constants
- Pantallas modulares: `apps/mobile/screens/<feature>/` (agenda/, dashboard/, finances/, inventory/, ...)
- New Architecture + edge-to-edge Android son obligatorios (ya no se configuran en `app.json`)
- Dev: Expo Go SDK 56 o **dev client** reconstruido tras el upgrade (`eas build` / `expo run:android`)

### TypeScript (monorepo)

- **~6.0.3** en todos los workspaces; `resolutions.typescript` en `package.json` raíz
- Web: sin `baseUrl` (deprecado en TS 6); paths relativos al `tsconfig.json`

### Tema / marca

- Mobile: `apps/mobile/constants/theme.ts` + `Gradients.onboarding` (Lunaris turquesa)
- Web: `apps/web/src/lib/theme.ts` (`LUNARIS`)
- Tenant en runtime: `TenantContext` + `tenant_settings` + `@zmtech/tenant-config`

### MCP (Cursor)

- Dos servidores en `.cursor/mcp.json`: **supabase-geemastudio** (este proyecto) y **supabase-zm** (referencia). Para BD de GeemaStudio usar supabase-geemastudio.

### Assets de marca

- `apps/web/public/logo-diamondSparkle.svg` — símbolo principal
- `apps/web/public/logo-diamondSparkle-positive.svg` / `negative` — variantes

### EAS (build móvil)

- Configuración: `apps/mobile/eas.json` (ejecutar `eas build` desde `apps/mobile`)
- Tras SDK 56: rebuild nativo requerido (runtimeVersion por `sdkVersion`)

**Última actualización**: 2026-07-21 (Plan 01 agregado 2026-08-27, resto del contenido sin tocar — ver nota de estado stale de Fase C pendiente de corrección aparte)
