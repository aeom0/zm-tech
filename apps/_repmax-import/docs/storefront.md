# Storefront público (`/[slug]`)

Vitrina digital de cada tienda, **sin login**. Ejemplo de URL: `https://tudominio.com/repuestoselchamo`.

## Web (Next.js)

| Ruta / archivo | Rol |
|----------------|-----|
| `apps/web/src/app/[slug]/page.tsx` | Server Component: metadata, fetch tienda + productos, `notFound()` si no hay tienda |
| `apps/web/src/app/[slug]/loading.tsx` | Skeleton Industrial Dark |
| `apps/web/src/app/[slug]/not-found.tsx` | 404 de tienda |
| `apps/web/src/components/storefront/StorefrontView.tsx` | Orquesta header, catálogo y CTA |
| `StorefrontHeader.tsx` | Cabecera (avatar inicial, plan Pro/Enterprise, WhatsApp) |
| `ProductCatalog.tsx` | Client: búsqueda, filtros, paginación, fetch al API |
| `ProductCard.tsx` | Tarjeta de producto (precio USD/BS, stock, condición) |
| `ContactCTA.tsx` | Botón flotante WhatsApp |
| `apps/web/src/types/storefront.ts` | Tipos `StorePublic`, `ProductPublic` |

## API pública (Express)

Base: `GET {API}/api/public/:slug/...`

### `GET /api/public/:slug/store`

- Tienda con `slug` y `is_active = true`.
- Respuesta JSON (camelCase): `id`, `name`, `slug`, `logoUrl`, `phone`, `address`, `city`, `plan`, `usdBsRate`.
- **404** `{ "error": "Tienda no encontrada" }` si no existe o está inactiva.

### `GET /api/public/:slug/products`

Query opcionales:

- `brand`, `condition` (`NEW` | `USED`), `vehicleType` (`CAR` | `MOTO` | `TRUCK` | `SUV`)
- `q` — búsqueda ILIKE en `title`, `brand`, `model`, `part_number`
- `page` (default 1), `limit` (default 20, máx. 50)

Filtros de negocio: `stock > 0`, `is_active` en productos, tienda activa.

Respuesta:

```json
{
  "products": [ { "id", "title", "brand", "priceUsd", "usdBsRate", "photos", ... } ],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

## Implementación servidor

Código en `apps/server/src/routes.ts` (`registerRoutes`), base de datos vía Drizzle en `apps/server/src/db.ts`.

Las marcas del filtro en catálogo provienen de `POPULAR_BRANDS` en `@repmax/shared`.
