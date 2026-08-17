# 06 — Dominio y vitrina por subdominio

> **Estado: EN CURSO** — `repmax-web` en prod. HTTPS wildcard `*.zmtechdev.com` live. Rewrite de hostname y `NEXT_PUBLIC_VITRINA_SUBDOMAINS=1` van con este deploy. Apex `zmtechdev.com` sigue en `zmtech`. Nameservers del registrador **sin cambiar** (MX ImprovMX).

**Objetivo:** vitrina pública por tenant en `{slug}.zmtechdev.com`, aditivo al `/{slug}` actual. El apex `zmtechdev.com` sigue en el proyecto landing (`zmtech`).

---

## 1. Situación actual

Todas las tiendas comparten un solo host de `repmax-web` y se distinguen
por slug en la ruta:

| Qué | URL |
|-----|-----|
| Catálogo de la tienda (vitrina pública) | `/{slug}` |
| Producto | `/{slug}/p/{id}` |
| Panel privado | `/login`, `/dashboard`, `/dashboard/inventory` (sin slug — la tienda sale de la sesión vía `repmax_store_users` → `repmax_stores`) |

El slug es único (`repmax_stores.slug`), generado del nombre al
registrar (`Repuestos Alfa` → `repuestos-alfa`).

Existe la columna `repmax_stores.custom_domain` pero no se usa todavía.
No hay `tienda.repmax.com` ni dominio propio por tenant. La URL absoluta
que se copia o sale en el QR es `NEXT_PUBLIC_SITE_URL` + `/{slug}`; en
local cae a `http://localhost:3003` si esa variable no está.

## 2. Estado confirmado en Vercel (verificado por MCP, 2026-08-16)

- Team: `alberto-ortas-projects` (`team_hqRgZ94hQneZo7zC9LHQ4Cp5`)
- `zmtechdev.com` (dominio apex) **ya está registrado y conectado** al
  proyecto `zmtech` (`prj_pjA1ye1RdiTl5arnLt262649OCQG`), sirviendo la
  landing de ZM Tech en producción ahora mismo. **No se toca.**
- `repmax-web` **no existe todavía como proyecto en Vercel** — el
  deploy está pendiente (coincide con el roadmap general).

**Nota de herramienta:** `Vercel:get_project` vía MCP no expone la
lista completa de dominios personalizados de un proyecto (solo
subdominios `*.vercel.app` autogenerados), y su campo
`latestDeployment` refleja el intento de deploy más reciente — no
necesariamente el que sirve tráfico en el dominio de producción. Para
confirmar "qué está corriendo dónde" hay que revisar el dashboard
directamente.

## 3. Arquitectura propuesta: subdominio por tenant

En vez de saltar directo a que cada tienda tenga su propio dominio
comprado (fricción alta para una repuestería promedio), se agrega un
escalón intermedio con subdominios wildcard sobre `zmtechdev.com`:

```
repuestos-alfa.zmtechdev.com   →  vitrina de Repuestos Alfa
repuestos-beta.zmtechdev.com   →  vitrina de Repuestos Beta
```

Un dominio apex y su wildcard pueden repartirse entre proyectos
distintos en Vercel:

```
zmtechdev.com       → proyecto "zmtech"       (landing — sin cambios)
*.zmtechdev.com      → proyecto "repmax-web"   (vitrinas por tenant — nuevo)
```

El `/{slug}` actual **sigue funcionando en paralelo** — no es un
reemplazo, es aditivo. Cero breaking changes para lo ya mergeado.

## 4. Implementación

### 4.1 Middleware (Next.js, `apps/repmax-web`)

Lee el `hostname` de cada request:

- `{slug}.zmtechdev.com` → rewrite interno a `/{slug}` (el usuario no ve
  el rewrite, la página física es la misma que ya existe).
- `zmtechdev.com` (apex, sin subdominio) → no aplica en este proyecto;
  ese dominio sigue apuntando al proyecto `zmtech`.
- `repmax-web-*.vercel.app/{slug}` (flujo actual de preview/dev) → sigue
  funcionando igual, sin rewrite.

### 4.2 Configuración en Vercel (manual, cuando exista el proyecto)

1. Deploy de `repmax-web` a Vercel (proyecto nuevo).
2. Dashboard → proyecto `repmax-web` → **Settings → Domains** → agregar
   `*.zmtechdev.com`.
3. Como el dominio ya vive en la cuenta de Vercel, debería
   auto-detectar la zona sin pedir cambios de DNS externos; si pide
   algo, mostrará el registro exacto.
4. SSL wildcard se emite automático.

Este paso es configuración de cuenta — no se automatiza por MCP, se
hace manual desde el dashboard con confirmación explícita.

### 4.3 `NEXT_PUBLIC_SITE_URL`

Deja de ser un valor único fijo. Pasa a construirse por tenant:

```
https://{slug}.zmtechdev.com
```

o el `custom_domain` del tenant si ya tiene uno propio configurado
(ver fase 2). Esto mejora automáticamente los QR y los links copiados
desde el dashboard.

## 5. Fase 2 (futura): dominio propio del cliente

Una vez el middleware ya resuelve por hostname, agregar soporte para
`repuestosalfa.com` (dominio propio del tenant) es casi gratis:

1. Tenant apunta un CNAME de su dominio hacia Vercel.
2. Se verifica el dominio (API de Domains de Vercel).
3. Se guarda en `repmax_stores.custom_domain`.
4. El middleware resuelve igual que resuelve el subdominio — mismo
   código, una tabla de lookup más.

**Cuidado técnico:** el middleware corre en el edge. Resolver
`custom_domain` contra Postgres en cada request agrega latencia —
cachear ese mapeo (Vercel Edge Config, KV, o similar) en vez de pegarle
a Supabase en cada hit.

## 6. Roadmap

1. [x] Middleware de resolución de hostname en `repmax-web` (aditivo,
   compatible con `/{slug}` actual). QR/links a subdominio gated por
   `NEXT_PUBLIC_VITRINA_SUBDOMAINS=1` (producción: encendido).
2. [x] Proyecto Vercel `repmax-web` (GitHub `aeom0/zm-tech`, root `apps/repmax-web`, framework Next.js).
3. [x] `*.zmtechdev.com` en el proyecto + CNAME `*` + cert wildcard (Let's Encrypt).
   Nameservers siguen en el registrador (MX ImprovMX). La CLI de Vercel puede
   marcar “invalid configuration” por eso; HTTPS de tenants ya funciona.
   Renovación ~90 días: si falla, repetir TXT ACME o mover NS a Vercel (con MX).
4. [x] URLs públicas por tenant (`urlVitrinaTienda` / QR / WhatsApp) cuando el flag está on.
5. [ ] (Fase 2) Soporte de `custom_domain` propio por tenant, con cache de
   lookup en el edge.

**Local:** `http://{slug}.localhost:3003` reescribe a `/{slug}` (p. ej.
`http://repuestos-alfa.localhost:3003`). `http://localhost:3003/{slug}` sigue.

## 7. Preguntas abiertas

- ¿El plan Pro/Turbo es el que desbloquea dominio propio (fase 2), o
  aplica a todos los planes desde el inicio?
- ¿Se necesita página de fallback para `zmtechdev.com` apex si alguien
  entra sin subdominio al proyecto `repmax-web` directamente vía su URL
  `.vercel.app`? (Redirigir a landing, o mostrar un selector de tienda.)
