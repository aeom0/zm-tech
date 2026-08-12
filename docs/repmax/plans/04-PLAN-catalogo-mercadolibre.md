# 04 — Catálogo + MercadoLibre

> **Estado: EN CURSO** (ago 2026). Fotos ML-ready en mobile (fase A) cableadas. OAuth / publicar ítem = siguiente.

**Precondición:** Preview Android en `@aeom0/repmax` (runtime SDK 56, channel `preview`). Storage `repmax-products` y RLS de miembros activos.

**Objetivo:** El inventario de RepMAX es la fuente de la publicación en MercadoLibre Venezuela: conectar la cuenta una vez, fotos que ML no pause, ficha con atributos de autopartes, stock en sync.

---

## Promesa de producto (landing)

Fuente: `apps/repmax-web` `MLSection` + Pricing.

1. Conectar ML **una vez** (OAuth).
2. Publicar desde el inventario (fotos, precio, descripción).
3. Venta en mostrador → stock baja en ML.
4. Pedidos ML entran al historial RepMAX.
5. Plan **Básico:** bloqueado. **Pro:** highlight. Enterprise: incluido.

No hay skill de GitHub usable para listings. Fuente de reglas: [Imágenes ML](https://developers.mercadolibre.com.ve/es_ar/trabajar-con-imagenes) y atributos por categoría (`GET /categories/:id/attributes`).

---

## Fases

| Fase | Qué | Estado |
|------|-----|--------|
| A | UI catálogo + captura/validación de fotos ML + persistir en Storage | **Hecho** (mobile) |
| B | Campos ficha alineados a atributos (COLOR, título predictor) + paridad web | Pendiente |
| C | OAuth ML + publicar/actualizar ítem + badges En ML / Desfasado | Pendiente |
| D | Sync stock bidireccional + órdenes ML → `repmax_sales` | Pendiente |

---

## Fase A — entregado

### Diseño

- Canvas: [`../design/catalog.pen`](../design/catalog.pen)
- Spec: [`../design/catalog-ux-spec.md`](../design/catalog-ux-spec.md)
- Reglas foto: [`../design/ml-fotos.md`](../design/ml-fotos.md)
- Logo oficial: `docs/repmax/design/assets/mercadolibre.png` (raster para Pencil) y `apps/repmax-web/public/brands/mercadolibre.svg` (mismo SVG que landing ZM Tech)

### Mobile (`apps/repmax-mobile`)

| Pieza | Path |
|-------|------|
| Slots | `src/components/inventory/PhotoSlotGrid.tsx` |
| Captura | `src/screens/inventory/PhotoCaptureScreen.tsx` |
| Revisión | `src/screens/inventory/PhotoReviewScreen.tsx` |
| Reglas | `src/utils/mlPhotoRules.ts` |
| Upload | `src/services/productPhotoService.ts` → bucket `repmax-products/{store_id}/drafts/` |
| Form | `ProductFormScreen` — fotos primero, hints ML, switch publicar (sin API) |
| Thumbs catálogo | `ProductThumb` en inventario / POS / carrito — `photos[0]` aunque no esté en ML |

`productService.create` ahora envía `storeId` (antes el insert salía sin tienda).

### Web

- `MercadoLibreLogo` sustituye el SVG “M” dibujado a mano en landing (`MLSection`, mockups).

### Fuera de A (a propósito)

- Detector de watermark/logo (API de diagnóstico ML).
- Columna `color` en `repmax_products`.
- OAuth, `ml_item_id`, webhooks.

---

## Fase B — ficha

- Campo color (migración SQL + schema TS) si la categoría lo exige.
- Título sugerido: `Producto + Marca + compatible con {modelo} {años}`.
- Misma grilla de fotos en `repmax-web` dashboard inventario.

## Fase C — OAuth y publicar

- App ML (site `MLV`), redirect, tokens cifrados por `store_id`.
- Mapear categoría con predictor.
- `pictures/items/upload` + `POST /items`.
- Badge por producto: Sin publicar / En ML / Error.

## Fase D — sync

- RPC o Edge: al vender POS, `PUT` stock ML.
- Webhook órdenes → `repmax_create_sale_with_items` con origen `ml`.

---

## Criterio de listo (fase A)

- [x] Foto &lt; 500 px no se sube a Storage.
- [x] Resize a 1200² JPEG si viene más grande.
- [x] Máx. 6 fotos; portada marcada.
- [x] Switch ML no llama API; lista huecos (portada, PART_NUMBER, título).
- [ ] Probar en APK preview vía OTA.

## Comandos

```bash
pnpm --filter repmax-mobile check:types
cd apps/repmax-mobile && eas update --channel preview --message "catálogo fotos ML-ready"
```
