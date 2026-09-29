# GeemaStudio — Arquitectura Web

> **Fecha**: abril 2026  
> **Estado**: documento de referencia permanente · actualizar ante cualquier cambio estructural en `apps/geemastudio-web`

---

## Principio fundamental

`apps/geemastudio-web` contiene **dos productos distintos** que comparten infraestructura (Next.js, Supabase, Vercel) pero sirven audiencias completamente diferentes. Confundirlos genera decisiones de routing, auth y pricing incorrectas.

---

## Producto 1 — Panel de gestión (privado)

**Qué es**: La interfaz web de administración del negocio. Es el equivalente web de la app móvil, con acciones que por form factor solo tienen sentido en desktop/tablet.

**Audiencia**: el dueño (`owner`) y su equipo (`staff`, `dev`). Siempre autenticados con Supabase Auth.

**Disponibilidad**: **siempre activo para todo tenant**, sin importar si el negocio tiene dominio propio, subpath en GeemaStudio, o ninguna web pública. Es independiente del `web_mode` del tenant.

**URL base (temporal)**: `https://geema.zmtechdev.com` — hasta dominio propio (`geemastudio.app` o similar). Env: `NEXT_PUBLIC_SITE_URL`.

### Rutas implementadas

| Ruta                   | Descripción                                                      | Estado                   |
| ---------------------- | ---------------------------------------------------------------- | ------------------------ |
| `/finanzas`            | Dashboard financiero: ingresos, pagos, validación                | ✅ Implementado          |
| `/finanzas/login`      | Auth de acceso al panel (ruta real, no `/login`)                 | ✅ Implementado          |
| `/dashboard`           | KPIs del día/mes, gráfico 7 días, top servicios, próximas citas  | ✅ Implementado          |
| `/panel/servicios`     | CRUD categorías, servicios, packs, promos (`?tab=`)              | ✅ Implementado          |
| `/panel/horarios`      | Zona horaria IANA + `business_hours` por día                     | ✅ Implementado          |
| `/panel/clientes`      | Lista, KPIs, segmentos VIP/nuevo/riesgo, detalle + historial     | ✅ Implementado (10-sep) |
| `/panel/personal`      | CRUD equipo: foto, color, comisiones, activo/inactivo            | ✅ Implementado (10-sep) |
| `/panel/configuracion` | Datos negocio, colores, logo, presencia web (`web_enabled`/slug) | ✅ Implementado (10-sep) |
| `/panel/agenda`        | Grilla día × profesionales, filtros status, drawer read-only     | ✅ Implementado (10-sep) |
| `/panel/waba`          | Estado WABA + subnav                                             | ✅ MVP (12-sep)          |
| `/panel/waba/mensajes` | Conversaciones + hilo (`wa_messages`)                            | ✅ MVP (12-sep)          |
| `/panel/waba/haiku`    | Editor system prompt (`waba_config.haiku_system_prompt`)         | ✅ MVP (12-sep)          |

### Rutas pendientes (panel de gestión)

| Ruta                                          | Descripción                                         | Prioridad                       | PR                                                                 |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `/panel/waba` historial/analytics / simulador | Analytics heatmap, simulador, portafolio (resto S6) | P2 post-MVP                     | —                                                                  |
| `/panel/waba/campanas`                        | Campañas masivas WA: stepper, segmentación, envío   | P2                              | —                                                                  |
| `/panel/inventario`                           | Gestión de inventario y stock                       | P2                              | —                                                                  |
| `/panel/configuracion/web`                    | CMS contenido landing (galería, team, etc.)         | P2 — mobile ✅ Fase 2; panel ❌ | [`10-PLAN-mi-web-cms-fase2.md`](plans/10-PLAN-mi-web-cms-fase2.md) |

### Estructura interna: route group `(shell)` compartido

`/panel/*`, `/finanzas` y `/dashboard` cuelgan de `src/app/(shell)/` (route group de Next.js — no aparece en la URL). Antes eran tres árboles de layout independientes (`app/panel/layout.tsx`, `app/finanzas/layout.tsx`, `app/dashboard/layout.tsx`), cada uno montando su propia instancia de `PanelShell` (sidebar), `QueryClientProvider` y `AuthProvider`; al navegar entre `/panel/*` y `/finanzas`/`/dashboard` Next.js desmontaba y remontaba el layout completo (parpadeo de página, sidebar incluido), porque no compartían el mismo nodo de layout en el árbol.

Estructura actual:

```
src/app/(shell)/
  layout.tsx           # único: fetch sesión + marca del tenant, monta ShellProviders
  ShellProviders.tsx    # 'use client': QueryClientProvider + AuthProvider + PanelShell (una sola instancia)
  finanzas-brand-context.tsx
  panel/                # layout.tsx solo hace el redirect a /login si no hay sesión
  finanzas/             # layout.tsx solo metadata; auth propia (login sin sidebar) vía useAuth()
  dashboard/            # layout.tsx solo el guard de rol staff
```

`ShellProviders` decide si envuelve `children` con `PanelShell` según la ruta (`/finanzas/login` queda sin sidebar). Cualquier sección nueva del panel de gestión debe vivir bajo `(shell)/` para no reintroducir el remount.

### Acciones exclusivas de web

Estas acciones **no existen en la app móvil** por limitaciones de form factor. Son parte central del valor del producto para el dueño del negocio:

- **Historial de chats WABA** — requiere layout de dos columnas (lista + conversación), tabla densa de mensajes, filtros por número/fecha
- **Editor de system prompt Haiku + simulador** — textarea grande + panel de respuesta side-by-side
- **Analytics WABA** — heatmap de actividad, gráficos de volumen, top flujos. No escalan a 390px
- **Dashboard financiero con gráficos** — Recharts/D3 necesita espacio horizontal real
- **CRUD masivo de servicios/packs/promos** — tablas editables, bulk actions, reordenamiento drag & drop
- **Exportar reportes** — CSV / PDF, acción típica de desktop
- **Gestión de equipo con foto** — upload de avatar, tabla de comisiones, asignación de horarios
- **Vista de agenda ampliada** — grilla multi-columna por profesional, sin truncamiento de datos

---

## Producto 2 — Landing pública del tenant (opcional)

**Qué es**: La página pública del negocio del tenant. La ven los clientes finales del salón/barbería, sin necesidad de autenticarse.

**Audiencia**: clientes del negocio (no dueños ni staff). Sin auth.

**Disponibilidad**: **opcional y configurable** por tenant mediante `tenant_settings.web_mode`.

**Contenido típico**: catálogo de servicios, info del negocio, horarios, CTA para reservar o contactar por WhatsApp.

### Rutas implementadas

| Ruta        | Descripción                                             | Estado                                                                      |
| ----------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `/s/[slug]`       | Landing pública del tenant con SSG + revalidación 5 min                    | ✅ Implementado (3 templates: Elegant Dark, Warm & Organic, Modern Minimal) |
| `/`               | Landing de la plataforma GeemaStudio (conversión B2B)                      | ✅ Implementado                                                             |
| `/_sites/[domain]`| Landing por `custom_domain` (Modo A) — target del rewrite de `middleware.ts`, no se navega directo | ✅ Implementado (20-sep-2026)                        |

### Tres modos de presencia web (`web_mode`)

Configurado en `tenant_settings.web_mode`. Determina cómo (o si) el tenant tiene presencia web pública.

#### Modo A — Dominio propio

El tenant tiene su propio dominio (ej: `zmlashnails.com`). GeemaStudio **no controla ese dominio**.

- `web_mode = 'own_domain'`
- `custom_domain = 'zmlashnails.com'` — **`middleware.ts` implementado (20-sep-2026)**: cuando el `Host` de la request no es un host de plataforma (`geema.zmtechdev.com`, `localhost`, `*.vercel.app`), la raíz (`/`) se reescribe hacia `/_sites/[domain]`, que resuelve el contenido vía `getTenantLandingByDomain(custom_domain)` — mismas columnas `web_*` de `tenant_settings` que usa `/s/[slug]` en Modo B. Cualquier otra ruta en ese host responde 404 (ver punto siguiente). Activar esto para ZM Lash real requiere además: (a) apuntar el DNS de `zmlashnails.com` al deploy de `geemastudio-web`, y (b) setear `custom_domain='zmlashnails.com'` + `web_enabled=true` en la fila `zm-lash-nails` — ninguno pasa como efecto secundario de tener el middleware, es un paso de "go live" explícito y separado, condicionado a OK de Vanessa/Alberto sobre el contenido migrado.
- GeemaStudio puede ofrecer como **add-on de plan** el servicio de mantenimiento de esa landing: actualización de catálogo, precios, horarios, vía el mismo CMS "Mi Web" (`/panel/configuracion/web` o mobile) que usa cualquier tenant. **No se crea un repositorio ni deploy aparte por tenant** — todo vive en `apps/geemastudio-web` de este monorepo; el único caso que justificaría un repo bespoke separado es un diseño 100% custom fuera de los 3 templates (excepción, no default).
- El Panel de gestión (Producto 1) **nunca** se sirve bajo el dominio propio del tenant, tenga o no `custom_domain` configurado: sigue siempre en el dominio de la plataforma (`geema.zmtechdev.com`, temporal). `middleware.ts` solo reescribe la raíz (`/`) hacia la landing para hosts que no son de plataforma; cualquier otra ruta (`/panel/*`, `/dashboard`, `/finanzas`, `/login`, `/api`, etc.) responde 404 explícitamente en esos hosts, aunque la ruta exista en la app — evita cookies/sesión cross-domain y que rutas de admin queden accesibles o indexables bajo el dominio del cliente.
- **Ejemplo**: ZM Lash & Nails Beauty (Vanessa) — Tenant #1. Su repo histórico `ZM-Lash-and-Nails-Beauty` es un caso legacy (predata GeemaStudio), no el patrón a replicar para tenants nuevos.

#### Modo B — Bajo el paraguas GeemaStudio

El tenant no tiene dominio propio o prefiere no gestionarlo. Su landing vive en:
`geema.zmtechdev.com/s/[slug]` (ej: `geema.zmtechdev.com/s/salon-glamour`) — host temporal; futuro `geemastudio.app/s/[slug]`.

- `web_mode = 'geema_hosted'`
- `slug` único en `tenant_settings` (ej: `'salón-glamour'`)
- GeemaStudio controla el routing, el deploy y el contenido via SSG.
- El `middleware.ts` dirige `/s/[slug]` al tenant correcto.
- Incluido en el plan Estándar o superior (sin costo extra de hosting).

#### Modo D — Landing propia que consume Mi Web (29-sep-2026)

El tenant conserva su dominio **y su propio sitio** (proyecto y deploy propios), pero el contenido se edita desde Mi Web. El sitio del tenant lee las columnas `web_*` de su fila. No pasa por `middleware.ts` ni por `/_sites/[domain]`: `custom_domain` puede quedar nulo, el DNS no cambia y las páginas legales y el panel propio del tenant no se tocan.

> En `plans/11-PLAN-mi-web-cms-fase2.md` este modo aparece como "Modo B" (landing propia). Aquí se nombra Modo D para no chocar con el Modo B de esta página (Geema-hosted).

- Primer caso: ZM Lash (`zmlashnails.com`, `apps/web` de `ZM-Lash-and-Nails-Beauty`). Plan de ejecución en Plan 11 § "Modo B — ejecución para ZM Lash".
- Lectura pública por la vista `public.tenant_landing_public` (solo columnas web, filtrada por `web_enabled = true`), no por acceso directo a `tenant_settings`. Motivo: `anon` tiene grants sobre todas las columnas de la tabla, incluidas las de WABA y comisiones (`waba_access_token`, `waba_verify_token`, `commission_*`); publicar la fila completa las expondría.
- Capacidad general para futuros tenants con landing propia: cada uno consume su fila con el mismo contrato (`WebGalleryItem`, `WebTeamMember`, `WebPromo`, `WebReview`), con respaldo local si la lectura falla.
- Las imágenes viven en `web-assets/{tenant_slug}/{gallery|team|promos|banner}/`; no depender de CDN externos (Sanity) una vez migrado.
- Con `web_enabled = true` la landing de Geema (`/s/[slug]`) también queda pública: aceptado en la fase de prueba, ambas conviven.

#### Modo C — Sin web pública

El tenant opera sin landing pública. Capta clientes 100% por WhatsApp o referidos.

- `web_mode = 'none'`
- No hay routing público para ese tenant.
- Válido especialmente en las primeras etapas de un negocio nuevo.
- **Default** al crear un nuevo tenant en el onboarding.

### Schema en `tenant_settings`

```sql
-- Migración a aplicar (SQL Editor o apply_migration MCP)
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS web_mode TEXT
    NOT NULL DEFAULT 'none'
    CHECK (web_mode IN ('own_domain', 'geema_hosted', 'none')),
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,         -- Modo B: identificador URL
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,       -- Modo A: dominio del tenant
  ADD COLUMN IF NOT EXISTS web_enabled BOOLEAN       -- deprecated: reemplazado por web_mode
    NOT NULL DEFAULT FALSE;
```

> **Nota**: `web_enabled` existía en el roadmap previo. Queda como columna legacy `FALSE` por compatibilidad. La lógica nueva usa exclusivamente `web_mode`.

---

## Separación conceptual: qué depende de qué

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase (Auth + DB + RLS)            │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  Panel gestión │   │ Landing pública │
│   (Producto 1) │   │  (Producto 2)   │
│                │   │                 │
│  Siempre ON    │   │  web_mode:      │
│  Todo tenant   │   │  A / B / C / D  │
│  Auth required │   │  Sin auth       │
└────────────────┘   └─────────────────┘
```

**Regla clave**: el Panel de gestión (Producto 1) **nunca** depende del `web_mode` del tenant. Vanessa entra a `geema.zmtechdev.com/finanzas` (host temporal) el día 1 de la migración, independientemente de qué pasa con `zmlashnails.com`.

---

## RRSS y dominio de la plataforma

**GeemaStudio** tiene sus propias RRSS (`@geemastudio` en Instagram, Facebook) y dominio de plataforma **temporal** `geema.zmtechdev.com` (hasta `geemastudio.app` o similar). Estas son las RRSS de la **plataforma B2B**, no de los tenants.

Cada tenant tiene **sus propias RRSS establecidas** (ej: Vanessa tiene `@zmlashandnails`). GeemaStudio no gestiona ni requiere esas RRSS.

- TikTok `@geemastudio` → pendiente de registro (RRSS de la plataforma, no requisito de ningún tenant)
- Dominio de la plataforma → pendiente de decisión (no bloquea migración Tenant #1)

---

## Estado de Vanessa (Tenant #1) en contexto web

| Aspecto                | Estado                               | Detalle                                                 |
| ---------------------- | ------------------------------------ | ------------------------------------------------------- |
| Panel de gestión       | Listo en cuanto migre la DB          | Accede a `geema.zmtechdev.com/finanzas` etc. (temporal) |
| `web_mode` inicial     | `'none'`                             | No necesita landing pública al day-1                    |
| `zmlashnails.com`      | Independiente hoy (Modo D en preparación) | Su dominio sigue en el proyecto de Lash (landing con Sanity + hardcode, páginas legales y `/panel`). Camino elegido: Modo D, la landing lee `tenant_settings.web_*` (contenido ya cargado en la fila; faltan imágenes a Storage, vista de lectura pública y cambios de código — ver Plan 11). El Modo A (DNS a Geema) queda descartado para ZM por el riesgo sobre legales y panel |
| Add-on landing         | Futuro                               | Si quieren, GeemaStudio ofrece servicio Modo A — sin repo aparte, panel sigue en `geema.zmtechdev.com` |
| Rutas panel pendientes | Campañas WABA / CMS web / inventario | P2                                                      |

---

## Checklist de rutas para completar el Panel de gestión

Antes de declarar el panel web completo para Tenant #1, deben estar implementadas:

- [x] `/panel/clientes` — con detalle de cliente, historial de citas, métricas VIP/nuevo/en riesgo (10-sep)
- [x] `/panel/personal` — CRUD equipo: foto, color, comisiones, estado activo/inactivo (10-sep)
- [x] `/panel/configuracion` — logo, nombre, moneda, terminología, presencia web (10-sep; `web_mode` UI mapeado a `web_enabled`)
- [x] `/panel/agenda` — vista de grilla día + columnas por profesional (10-sep, read-only; CRUD sigue en mobile)
- [x] `/panel/waba` — estado + mensajes + editor Haiku (12-sep MVP). Pendiente P2: analytics, campañas, simulador

Prioridad P1 cerrada: ~~`clientes` → `personal` → `configuracion` → `agenda` → `waba`~~.

---

_Documento creado: abril 2026 · Actualizar ante cambios en routing, `web_mode`, o nuevas rutas de panel._
