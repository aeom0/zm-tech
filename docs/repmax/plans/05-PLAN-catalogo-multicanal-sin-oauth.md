# 05 — Catálogo multicanal (sin OAuth ML)

> **Estado: EN CURSO — camino principal** (ago 2026). Mercado Libre confirmó (consulta **475453897**, 13-08-2026) que DevCenter/API MLV **no está operativo** en Venezuela. Este plan es la implementación vigente. Si ML habilita API en el futuro → activar track del [plan 04](./04-PLAN-catalogo-mercadolibre.md) sin rehacer catálogo (`ML_API_ENABLED`).

**Precondición:** Inventario + fotos ML-ready (fase A del plan 04) operativos en mobile. Vitrina pública `repmax-web` `/[slug]` con productos activos (RLS `anon`).

**Objetivo:** RepMAX es el **centro del catálogo** de la repuestería. MercadoLibre es **un canal opcional** (manual hoy, API cuando exista app). El negocio **vende fuera de ML** por mostrador (POS), vitrina web y enlaces compartidos — sin depender de OAuth ni de scraping.

**Hub:** `llacowjutjfefboqgfnj`. Prefijo `repmax_*`.

---

## Bloqueador externo (Mercado Libre) — resuelto

| Campo          | Valor                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------ |
| Consulta       | **475453897**                                                                              |
| Error original | `PSC01-EZGLT8IYDQ3Z` en `developers.mercadolibre.com.ve/devcenter/accountLink`             |
| Respuesta ML   | DevCenter/API de MLV **no habilitado ni operativo** en Venezuela (no es bloqueo de cuenta) |
| Estado         | **Cerrado — OAuth/API descartado**                                                         |

**Decisión:** seguir este plan como **camino principal**. El código OAuth del plan 04 queda en **feature flag** (`ML_API_ENABLED = false`) sin borrar.

**Si ML anuncia DevCenter MLV en el futuro:** aplicar ops del plan 04 (app, secrets, migración `repmax_ml_connections`, deploy Edge) y encender sync API (fases C–D del 04) **sobre el mismo inventario y `repmax_ml_listings`**.

---

## Modelo de producto: multicanal

La tienda no es “solo ML”. RepMAX cubre:

| Canal                | Qué es hoy                               | Rol en RepMAX                                                                        |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| **Mostrador (POS)**  | Venta física, caja, stock en tiempo real | Core — `repmax-mobile` POS + `repmax_create_sale_with_items`                         |
| **Vitrina web**      | Catálogo público por tienda              | `repmax-web` → `/[slug]` (productos activos, fotos, precio)                          |
| **WhatsApp / redes** | Cliente pide por chat                    | Compartir **link de vitrina** o **link de producto** (fase 2); sin WABA en este plan |
| **MercadoLibre**     | Marketplace opcional                     | **Puente manual** (export + publicador masivo ML) o **API** (futuro)                 |

Principio: **un inventario, varias salidas**. Fotos y ficha se preparan una vez; ML no es prerequisito para operar.

---

## Track sin OAuth — “Modo puente manual”

### Qué NO hacemos

- Scraping / Puppeteer del sitio ML.
- Prometer sync en vivo en UI si no hay API.
- Bloquear POS o vitrina por falta de ML.

### Qué SÍ hacemos

1. **Checklist “Listo para ML”** (y reusable para vitrina): portada, título, n. parte, precio, stock, descripción sin teléfono.
2. **Estados en `repmax_ml_listings`** (ampliar enum si hace falta migración):
   - `draft` → `ready` → `exported` → `published_manual` → `needs_update` (+ `error` existente).
   - Campo opcional: `ml_item_id` o URL de publicación (pegado tras publicar en ML).
3. **Categoría y atributos sin predictor API:** elección manual + mapper local (PART_NUMBER, BRAND, …) ya en código.
4. **Switch en ficha:** de “Publicar en ML” (OAuth) a **“Incluir en catálogo ML / export”** (`ml_publish_intent` persistido en `repmax_products`).
5. **Export “Paquete ML”:** CSV/Excel RepMAX + URLs públicas de fotos (Storage o vitrina) para copiar al **publicador masivo** de ML (planilla descargada por el vendedor en su cuenta ML).
6. **Badges en inventario:** Listo / Incompleto / Exportado / En ML (manual) / Actualizar en ML.
7. **UI MercadoLibre:** card honesta — MLV sin API activa; catálogo ML-ready + exportación. Sin botón “Conectar cuenta” mientras `ML_API_ENABLED = false`.

### Flujo del dueño (ML manual)

```
Inventario RepMAX (fotos + ficha)
  → Checklist OK → status ready
  → Export lote (CSV + URLs fotos)
  → En ML: Publicaciones → Publicar masivamente (planilla por categoría)
  → Marcar en RepMAX: published_manual (+ ml_item_id opcional)
  → Si vende en POS: alerta “revisa stock en ML” para ítems published_manual
```

Referencia ML: [Publicar muchos productos a la vez](https://www.mercadolibre.com.pe/l/publica-muchos-productos-a-la-vez) (misma herramienta en sitios ML; el vendedor VE usa su panel local).

---

## Track vitrina y venta fuera de ML

### Vitrina (`/[slug]`)

- Catálogo público ya existe: `StorefrontView`, `ProductCatalog`, RLS `anon` sobre productos activos.
- **Mejoras planificadas:**
  - Mostrar portada (`photos[0]`) en cards si no está ya.
  - Filtros por marca / condición / búsqueda (paridad con inventario mobile).
  - Página o query por producto: `/[slug]/p/[id]` o slug de pieza (SEO + link WhatsApp).
  - CTA WhatsApp con texto prellenado (n. parte + link) — sin WABA; `wa.me` + mensaje.
  - En panel dashboard: “Tu vitrina” con URL copiable y QR.

### POS (mostrador)

- Ya descuenta stock vía RPC; es el canal principal sin ML.
- **Mejoras planificadas:**
  - Miniatura y n. parte visibles (hecho en parte).
  - En recibo / post-venta: no depender de ML.

### Panel web inventario

- Paridad con mobile: grilla de fotos, edición básica, filtros “Listo vitrina / Listo ML”.
- Mismo `repmax_products` + `repmax_ml_listings`.

---

## Fases de implementación

| Fase    | Entregable                                                                  | Depende de ML API                      |
| ------- | --------------------------------------------------------------------------- | -------------------------------------- |
| **E1**  | Checklist + badges + `ml_publish_intent` (SQL + mobile)                     | No                                     |
| **E2**  | Categoría manual en ficha + título sugerido + color (SQL)                   | No                                     | **Hecho (código)** |
| **E3**  | Export CSV/Excel + URLs fotos; estados `exported` / `published_manual`      | No                                     | **Hecho (código)** |
| **E4**  | Vitrina: fotos en cards, búsqueda, link producto, CTA WhatsApp              | No                                     | **Hecho (código)** |
| **E5**  | Dashboard: copiar link vitrina, QR, filtros inventario web                  | No                                     | **Hecho (código)** |
| **E6**  | Alertas post-POS “actualiza stock en ML” (`published_manual` / `published`) | No                                     | **Hecho (código)** |
| **API** | OAuth + `POST /items` + sync (plan 04 C–D)                                  | Sí — solo si ML habilita DevCenter MLV |

---

## Criterio de listo (E1–E3 mínimo viable sin OAuth)

- [x] Dueño puede marcar productos para export ML sin OAuth.
- [x] Lista inventario filtra por Listo / Incompleto / Exportado / En ML manual.
- [x] Export genera archivo con columnas útiles + URLs de fotos accesibles públicamente.
- [x] Vitrina muestra catálogo con fotos; link de producto `/[slug]/p/[id]` + WhatsApp con ref.
- [x] URL vitrina copiable desde panel + QR (E5).
- [x] Tras venta POS, banner en recibo si el producto está en ML manual; listing → `needs_update` (E6).
- [x] Card ML en settings explica bloqueo VE + ticket, no muestra error OAuth falso.
- [x] Documentación y landing no prometen sync ML en vivo hasta `ml_api_enabled`.

---

## Relación con plan 04

| Plan 04                                                       | Plan 05                                               |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| OAuth, Edge, predictor API, `POST /items`, sync órdenes/stock | Catálogo ML-ready, export manual, multicanal, vitrina |
| **Descartado (ops)** — MLV sin DevCenter/API (#475453897)     | **Camino principal**                                  |
| Misma tabla `repmax_ml_listings`, mismo inventario            | Estados y UI ampliados para manual                    |

---

## Comandos

```bash
pnpm --filter @repmax/repmax-schema check:types
pnpm --filter repmax-mobile check:types
pnpm --filter repmax-web check:types
pnpm dev:repmax:web   # vitrina http://localhost:3003/[slug]  ·  http://{slug}.localhost:3003
pnpm dev:repmax:mobile
```
