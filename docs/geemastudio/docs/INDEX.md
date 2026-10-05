# Índice de Documentación — GeemaStudio

Documentación del sistema GeemaStudio (SaaS multi-tenant para salones/barberías/peluquerías en LATAM).

## Documentación principal

### [README.md](README.md) (este directorio)

Setup inicial: requisitos, variables de entorno, scripts, estructura.

### [README.md](../README.md) (raíz)

Descripción del producto, tipos de negocio, inicio rápido, stack, variables de entorno, roles.

### [DESARROLLO_LOCAL.md](DESARROLLO_LOCAL.md)

Desarrollo local: WSL, migraciones sin TCP (SQL Editor), seeds, variables.

### [WEB_ARCHITECTURE.md](WEB_ARCHITECTURE.md) ← nuevo

Arquitectura web: dos productos (panel de gestión vs landing pública), modos `web_mode` (A/B/C), rutas implementadas y pendientes del panel, relación con RRSS y dominio de la plataforma.

### [design_guidelines.md](design_guidelines.md)

Sistema de diseño y especificaciones UI/UX (paleta, tipografía, componentes). Los colores reales vienen del preset del tenant.

### [DEPLOYMENT.md](DEPLOYMENT.md)

Despliegue: Supabase (backend), Vercel (web), EAS (móvil).

### [INSTALACION_BETA.md](INSTALACION_BETA.md)

Instalación / notas de beta (si aplica al flujo actual).

### [EDGE_FUNCTIONS.md](EDGE_FUNCTIONS.md)

Edge Function `whatsapp-webhook`: secrets, deploy, verificación GET del webhook, SQL de tenant de prueba.

### [WABA_MULTITENANT_ARCHITECTURE.md](WABA_MULTITENANT_ARCHITECTURE.md)

Arquitectura multi-tenant del bot WABA: dónde viven las credenciales por tenant, resolución en runtime, checklist de alta de un tenant nuevo.

### [ADB_CONEXION_MOVIL.md](ADB_CONEXION_MOVIL.md)

Guía de conexión ADB al dispositivo físico de pruebas (Moto G54) desde WSL2 — no específica de GeemaStudio, es tooling local del entorno de desarrollo.

### [CONSOLIDACION-DOCS-ZM-GEEMA.md](CONSOLIDACION-DOCS-ZM-GEEMA.md)

Estado de la consolidación documental ZM → Geema y tabla de equivalencias de numeración antigua.

### Planes 01–18

| Plan | Documento | Tema |
|---:|---|---|
| 01 | [01-PLAN-monorepo-estructura.md](plans/01-PLAN-monorepo-estructura.md) | Monorepo y estructura |
| 02 | [02-PLAN-retrofit-tenant-id.md](plans/02-PLAN-retrofit-tenant-id.md) | Multi-tenancy, `tenant_id` y RLS |
| 03 | [03-PLAN-audit-paridad-zmlash-geema.md](plans/03-PLAN-audit-paridad-zmlash-geema.md) | Auditoría de paridad ZM Lash → Geema |
| 04 | [04-geema-migration/](plans/04-geema-migration/README.md) | Migración y convergencia ZM → Geema |
| 05 | [05-PLAN-ctwa-collages-cierre-intencion.md](plans/05-PLAN-ctwa-collages-cierre-intencion.md) | CTWA y cierre por intención |
| 06 | [06-PLAN-preview-virtual-extensiones-ctwa.md](plans/06-PLAN-preview-virtual-extensiones-ctwa.md) | Spike y validación Vertex |
| 07 | [07-PLAN-look-preview-multi-servicio.md](plans/07-PLAN-look-preview-multi-servicio.md) | Look Preview multi-servicio |
| 08 | [08-PLAN-dispatcher-modular.md](plans/08-PLAN-dispatcher-modular.md) | Modularización del dispatcher WABA |
| 09 | [09-PLAN-comisiones-pagos.md](plans/09-PLAN-comisiones-pagos.md) | Comisiones y pagos |
| 10 | [10-PLAN-landing-multitenant-fase1.md](plans/10-PLAN-landing-multitenant-fase1.md) | Landing pública multi-tenant |
| 11 | [11-PLAN-mi-web-cms-fase2.md](plans/11-PLAN-mi-web-cms-fase2.md) | CMS Mi Web |
| 12 | [12-PLAN-waba-suite-parity.md](plans/12-PLAN-waba-suite-parity.md) | Suite WABA |
| 13 | [13-PLAN-panel-parity-zm-lash.md](plans/13-PLAN-panel-parity-zm-lash.md) | Paridad completa del panel |
| 14 | [14-PLAN-clientes-acciones-crm.md](plans/14-PLAN-clientes-acciones-crm.md) | CRM y acciones de clientes |
| 15 | [15-PLAN-retail-productos.md](plans/15-PLAN-retail-productos.md) | Retail y productos |
| 16 | [16-PLAN-multi-sucursal.md](plans/16-PLAN-multi-sucursal.md) | Multi-sucursal |
| 17 | [17-PLAN-planes-suscripcion-y-descarga-apk.md](plans/17-PLAN-planes-suscripcion-y-descarga-apk.md) | Planes de suscripción y descarga del APK |
| 18 | [18-PLAN-gestion-profesionales-disponibilidad.md](plans/18-PLAN-gestion-profesionales-disponibilidad.md) | Gestión de profesionales y disponibilidad |

La carpeta [04-geema-migration](plans/04-geema-migration/) es la única copia del detalle de migración (ya sin sync con ZM). Equivalencias de numeración antigua: [CONSOLIDACION-DOCS-ZM-GEEMA.md](CONSOLIDACION-DOCS-ZM-GEEMA.md).

Anexos Look Preview: [Vertex v1](plans/07-anexo-prompts-vertex-v1.md) · [Gemini original v1](plans/07-anexo-prompts-gemini-original-v1.md).

### [Audit 03 — paridad](../../audit/03-AUDIT-paridad-zmlash-geema.md)

Resultado del audit: matriz feature × superficie, gaps críticos P0–P2, sección “No portar”.

### [Inventario features ZM → Geema](../../audit/04-INVENTARIO-features-zm-lash-para-geema.md)

Backlog accionable: ~50 capacidades de ZM Lash (mobile, web, WABA, Edge Functions) con estado en Geema, rutas de referencia y oleadas de implementación.

## Organización de archivos

```
docs/
├── INDEX.md                        # Este archivo
├── README.md                       # Setup inicial
├── DESARROLLO_LOCAL.md             # Migraciones, seeds, WSL
├── WEB_ARCHITECTURE.md             # Arquitectura web: dos productos, web_mode, rutas
├── design_guidelines.md            # Diseño UI/UX
├── DEPLOYMENT.md                   # Deploy Supabase / Vercel / EAS
├── EDGE_FUNCTIONS.md               # Edge Function whatsapp-webhook: secrets, deploy
├── WABA_MULTITENANT_ARCHITECTURE.md # Bot WABA multi-tenant: credenciales, alta de tenant
├── ADB_CONEXION_MOVIL.md           # ADB al dispositivo físico (tooling, no específico GeemaStudio)
├── INSTALACION_BETA.md             # Beta / instalación
├── plans/
│   ├── 01–18-PLAN-*.md                     # Serie canónica consolidada
│   └── 04-geema-migration/                 # Detalle del Plan 04

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
- **Schema**: `packages/shared-schema/src/schema.ts` (`pnpm db:push`; opcional `pnpm db:generate` / `pnpm db:studio`)
- **Seeds**: `apps/geemastudio-server/scripts/db/` (editar templates SQL; no hay script `db:seed` a nivel raíz)
- **Migraciones**: `pnpm db:push` o SQL Editor / MCP (ver DESARROLLO_LOCAL.md)
- **SQL de referencia RLS/advisors**: `apps/geemastudio-server/supabase/migrations/00000000000000_baseline_full_schema.sql`

### API

- No hay Express. Cliente usa **Supabase** (`supabase.from('tabla').select()`) desde `apps/geemastudio-mobile/lib/supabase.ts` y TanStack Query.

### Frontend web — dos productos

- **Panel de gestión** (privado, autenticado): `/finanzas`, `/dashboard`, `/panel/*` — siempre disponible para todo tenant.
- **Landing pública** (sin auth, opcional): `/s/[slug]` — controlada por `tenant_settings.web_mode` (`'own_domain'` / `'geema_hosted'` / `'none'`). Ver [WEB_ARCHITECTURE.md](WEB_ARCHITECTURE.md).

### Frontend mobile

- `apps/geemastudio-mobile/` — Expo SDK **56**, React Native **0.85**, React **19.2**, TypeScript **~6.0**
- components, screens, navigation, contexts, hooks, constants
- Pantallas modulares: `apps/geemastudio-mobile/screens/<feature>/` (agenda/, dashboard/, finances/, inventory/, ...)
- New Architecture + edge-to-edge Android son obligatorios (ya no se configuran en `app.json`)
- Dev: Expo Go SDK 56 o **dev client** reconstruido tras el upgrade (`eas build` / `expo run:android`)

### TypeScript (monorepo)

- **~6.0.3** en todos los workspaces; `resolutions.typescript` en `package.json` raíz
- Web: sin `baseUrl` (deprecado en TS 6); paths relativos al `tsconfig.json`

### Tema / marca

- Mobile: `apps/geemastudio-mobile/constants/theme.ts` + `Gradients.onboarding` (Lunaris turquesa)
- Web: `apps/geemastudio-web/src/lib/theme.ts` (`LUNARIS`)
- Tenant en runtime: `TenantContext` + `tenant_settings` + `@zmtech/tenant-config`

### MCP (Cursor)

- Dos servidores en `.cursor/mcp.json`: **supabase-geemastudio** (este proyecto) y **supabase-zm** (referencia). Para BD de GeemaStudio usar supabase-geemastudio.

### Assets de marca

- `apps/geemastudio-web/public/logo-diamondSparkle.svg` — símbolo principal
- `apps/geemastudio-web/public/logo-diamondSparkle-positive.svg` / `negative` — variantes
- `apps/geemastudio-web/public/favicon.png`, `icon-192.png`, `icon-512.png` — desde `logo-diamondSparkle-icon.svg` (mobile `assets/`)
- `apps/geemastudio-mobile/assets/` — fuentes SVG (`NGlow`, `-icon`, `-adaptive`, `-adaptive-bg`) y PNG exportados

### EAS (build móvil)

- Configuración: `apps/geemastudio-mobile/eas.json` (ejecutar `eas build` desde `apps/geemastudio-mobile`)
- Tras SDK 56: rebuild nativo requerido (runtimeVersion por `sdkVersion`)
- **Versiones** (especificado):
  | Campo | Dónde | Quién lo mueve |
  |-------|--------|----------------|
  | `version` (user-facing, semver) | `app.json` + `package.json` | Manual en el PR (ej. `1.1.0` → `1.2.0`) |
  | `versionCode` Android | remoto EAS | Automático en profile `production` (`autoIncrement: true`, `appVersionSource: "remote"`) |
  | Runtime OTA | `runtimeVersion.policy: sdkVersion` | Cambia al subir SDK Expo |

  Historial reciente: preview `1.1.0`/code 1 · prod `1.1.0`/code **2** (20-sep) · prod **1.2.0**/code **3** (FCM + launcher) · fix icon capas pendiente rebuild (code **4** cancelado).

  **Adaptive icon (Android oficial)** — [icon_design_adaptive](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive):
  | Capa | Canvas | Contenido |
  |------|--------|-----------|
  | Background | 108×108 dp (full-bleed) | `adaptive-icon-background.png` — degradado índigo → cian |
  | Foreground | 108×108 dp, logo ≤ **66×66 dp** safe | `adaptive-icon.png` — diamante transparente |
  | Viewport OEM | ~72×72 dp (máscara) | outer 18 dp = mask / parallax |

  Expo: `android.adaptiveIcon.backgroundImage` + `foregroundImage` (+ `backgroundColor` fallback).
  **Notification small icon**: 96×96 blanco+alpha (~88 % fill); tint `#3949AB`.

**Última actualización**: 2026-09-03 — revisión/consolidación de `docs/geemastudio/docs/`: rutas `apps/mobile`→`apps/geemastudio-mobile` y `apps/web`→`apps/geemastudio-web` corregidas en todo el set (excepto donde el texto se refiere explícitamente al repo `ZM-Lash-and-Nails-Beauty`, que sí usa esos nombres); nota de Fase C (RLS `tenant_id`) actualizada a ✅ completada 2026-08-08; agregados `EDGE_FUNCTIONS.md`, `WABA_MULTITENANT_ARCHITECTURE.md`, `ADB_CONEXION_MOVIL.md` al índice (existían en el directorio pero no estaban listados); enlaces relativos rotos corregidos en `plans/06`, `plans/07` y `plans/geema-migration/*` (referencias a `02-PLAN-retrofit-tenant-id.md` / `03-PLAN-audit-paridad-zmlash-geema.md` con la profundidad `../` incorrecta); comandos `yarn *` desactualizados corregidos a `pnpm *` (mapeo real en `package.json` raíz) en README.md, MONOREPO_MIGRACION.md, DESARROLLO_LOCAL.md, DEPLOYMENT.md, INSTALACION_BETA.md, GEEMASTUDIO_MIGRATION_GUIDE.md (sección "Comandos útiles", no la narrativa histórica de FASE 1-6) y tech-debt/TD-001; rutas `scripts/db/` corregidas a `apps/geemastudio-server/scripts/db/` donde aplica (ubicación real tras la migración a monorepo). Queda pendiente de verificación humana: la ubicación correcta de `.env.example` (no existe en la raíz de `zm-tech`; ver nota en DESARROLLO_LOCAL.md) y el estado real de FASE 7C/7D en GEEMASTUDIO_MIGRATION_GUIDE.md.
