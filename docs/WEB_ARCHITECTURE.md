# GeemaStudio — Arquitectura Web

> **Fecha**: abril 2026  
> **Estado**: documento de referencia permanente · actualizar ante cualquier cambio estructural en `apps/web`

---

## Principio fundamental

`apps/web` contiene **dos productos distintos** que comparten infraestructura (Next.js, Supabase, Vercel) pero sirven audiencias completamente diferentes. Confundirlos genera decisiones de routing, auth y pricing incorrectas.

---

## Producto 1 — Panel de gestión (privado)

**Qué es**: La interfaz web de administración del negocio. Es el equivalente web de la app móvil, con acciones que por form factor solo tienen sentido en desktop/tablet.

**Audiencia**: el dueño (`owner`) y su equipo (`staff`, `dev`). Siempre autenticados con Supabase Auth.

**Disponibilidad**: **siempre activo para todo tenant**, sin importar si el negocio tiene dominio propio, subpath en GeemaStudio, o ninguna web pública. Es independiente del `web_mode` del tenant.

**URL base**: `geemastudio.app` (o el dominio definitivo de la plataforma)

### Rutas implementadas

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/finanzas` | Dashboard financiero: ingresos, pagos, validación | ✅ Implementado |
| `/finanzas/login` | Auth de acceso al panel (ruta real, no `/login`) | ✅ Implementado |
| `/dashboard` | KPIs del día/mes, gráfico 7 días, top servicios, próximas citas | ✅ Implementado |
| `/panel/servicios` | CRUD categorías, servicios, packs, promos (`?tab=`) | ✅ Implementado |
| `/panel/horarios` | Zona horaria IANA + `business_hours` por día | ✅ Implementado |

### Rutas pendientes (panel de gestión)

| Ruta | Descripción | Prioridad | PR |
|------|-------------|-----------|----|
| `/panel/clientes` | Lista de clientes, detalle, métricas (VIP / nuevo / en riesgo) | P1 — bloquea Vanessa en web | — |
| `/panel/personal` | CRUD del equipo: foto, color, comisiones, horario | P1 — bloquea Vanessa en web | — |
| `/panel/agenda` | Vista agenda en web (grilla día + columnas por profesional) | P1 | — |
| `/panel/waba` | CMS WABA: historial de chats, editor system prompt, analytics | P1 — solo viable en web | — |
| `/panel/waba/campanas` | Campañas masivas WA: stepper, segmentación, envío | P2 | — |
| `/panel/inventario` | Gestión de inventario y stock | P2 | — |
| `/panel/configuracion` | Configuración general del tenant: logo, moneda, terminología | P1 | — |
| `/panel/configuracion/web` | Modo de presencia web + `web_mode` + slug + dominio propio | P2 | — |

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

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/s/[slug]` | Landing pública del tenant con SSG + revalidación 5 min | ✅ Implementado (3 templates: Elegant Dark, Warm & Organic, Modern Minimal) |
| `/` | Landing de la plataforma GeemaStudio (conversión B2B) | ✅ Implementado |

### Tres modos de presencia web (`web_mode`)

Configurado en `tenant_settings.web_mode`. Determina cómo (o si) el tenant tiene presencia web pública.

#### Modo A — Dominio propio

El tenant tiene su propio dominio (ej: `zmlashnails.com`). GeemaStudio **no controla ese dominio**.

- `web_mode = 'own_domain'`
- `custom_domain = 'zmlashnails.com'` (informativo, no hay routing automático)
- GeemaStudio puede ofrecer como **add-on de plan** el servicio de mantenimiento de esa landing: actualización de catálogo, precios, horarios. Es trabajo manual o mediante un subrepositorio independiente.
- El `middleware.ts` de GeemaStudio **no interviene** en ese dominio.
- **Ejemplo**: ZM Lash & Nails Beauty (Vanessa) — Tenant #1.

#### Modo B — Bajo el paraguas GeemaStudio

El tenant no tiene dominio propio o prefiere no gestionarlo. Su landing vive en:
`geemastudio.app/s/[slug]` (ej: `geemastudio.app/s/salón-glamour`)

- `web_mode = 'geema_hosted'`
- `slug` único en `tenant_settings` (ej: `'salón-glamour'`)
- GeemaStudio controla el routing, el deploy y el contenido via SSG.
- El `middleware.ts` dirige `/s/[slug]` al tenant correcto.
- Incluido en el plan Estándar o superior (sin costo extra de hosting).

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
│  Todo tenant   │   │  A / B / C      │
│  Auth required │   │  Sin auth       │
└────────────────┘   └─────────────────┘
```

**Regla clave**: el Panel de gestión (Producto 1) **nunca** depende del `web_mode` del tenant. Vanessa entra a `geemastudio.app/finanzas` el día 1 de la migración, independientemente de qué pasa con `zmlashnails.com`.

---

## RRSS y dominio de la plataforma

**GeemaStudio** tiene sus propias RRSS (`@geemastudio` en Instagram, Facebook) y su propio dominio de plataforma (pendiente: `geemastudio.app` o similar). Estas son las RRSS de la **plataforma B2B**, no de los tenants.

Cada tenant tiene **sus propias RRSS establecidas** (ej: Vanessa tiene `@zmlashandnails`). GeemaStudio no gestiona ni requiere esas RRSS.

- TikTok `@geemastudio` → pendiente de registro (RRSS de la plataforma, no requisito de ningún tenant)
- Dominio de la plataforma → pendiente de decisión (no bloquea migración Tenant #1)

---

## Estado de Vanessa (Tenant #1) en contexto web

| Aspecto | Estado | Detalle |
|---------|--------|----------|
| Panel de gestión | Listo en cuanto migre la DB | Accede a `geemastudio.app/finanzas` etc. |
| `web_mode` inicial | `'none'` | No necesita landing pública al day-1 |
| `zmlashnails.com` | Independiente | Su dominio propio, no lo toca GeemaStudio |
| Add-on landing | Futuro | Si quieren, GeemaStudio ofrece servicio Modo A |
| Rutas panel pendientes | `/panel/clientes`, `/panel/personal`, `/panel/agenda`, `/panel/waba` | P1 — necesarias para que el panel web sea útil |

---

## Checklist de rutas para completar el Panel de gestión

Antes de declarar el panel web completo para Tenant #1, deben estar implementadas:

- [ ] `/panel/clientes` — con detalle de cliente, historial de citas, métricas VIP/nuevo/en riesgo
- [ ] `/panel/personal` — CRUD equipo: foto, color, comisiones, estado activo/inactivo
- [ ] `/panel/agenda` — vista de grilla día + columnas por profesional (port de la vista owner mobile)
- [ ] `/panel/waba` — historial chats, editor system prompt Haiku, analytics (A-1 a A-5 portados a web)
- [ ] `/panel/configuracion` — logo, nombre, moneda, terminología, `web_mode`

Prioridad de implementación recomendada: `clientes` → `personal` → `waba` → `agenda` → `configuracion`.

---

*Documento creado: abril 2026 · Actualizar ante cambios en routing, `web_mode`, o nuevas rutas de panel.*
