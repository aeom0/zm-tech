# 04 — Catálogo + MercadoLibre

> **Estado: DESCARTADO (ops MLV)** — ago 2026. Fotos (fase A) y contrato OAuth/categoría (impl. 1–2) quedan en código detrás de `ML_API_ENABLED`. **Mercado Libre confirmó (consulta 475453897, 13-08-2026):** DevCenter/API de MLV no está habilitado en Venezuela. **Camino de producto:** [plan 05 — multicanal sin OAuth](./05-PLAN-catalogo-multicanal-sin-oauth.md).

**Precondición:** Preview Android en `@aeom0/repmax` (runtime SDK 56, channel `preview`). Storage `repmax-products` y RLS de miembros activos.

**Objetivo (API):** Inventario RepMAX → publicación y sync en MercadoLibre Venezuela (OAuth, fotos, atributos autopartes, stock).

**Objetivo (sin API):** Ver plan 05 — catálogo ML-ready, export manual, vitrina y POS como canales principales.

**Hub:** `llacowjutjfefboqgfnj`. Prefijo `repmax_*`. Sin `repmax-server`.

---

## Promesa de producto (landing)

Fuente: `apps/repmax-web` `MLSection` + Pricing.

**Hoy (sin API ML):** inventario + POS + vitrina `/[slug]`; catálogo ML-ready y export manual ([plan 05](./05-PLAN-catalogo-multicanal-sin-oauth.md)). Copy landing y app alineados — no prometer sync en vivo ni OAuth en Venezuela.

**Con API (plan 04 C–D, solo si ML habilita DevCenter MLV en el futuro):**

1. Conectar ML **una vez** (OAuth).
2. Publicar desde el inventario (fotos, precio, descripción).
3. Venta en mostrador → stock baja en ML.
4. Pedidos ML entran al historial RepMAX.
5. Plan **Básico:** bloqueado. **Pro:** highlight. Enterprise: incluido.

Fuente de reglas: [Imágenes ML](https://developers.mercadolibre.com.ve/es_ar/trabajar-con-imagenes) y atributos por categoría (`GET /categories/:id/attributes`). Predictor: `GET /sites/$SITE_ID/domain_discovery/search`.

---

## Fases

| Fase | Qué | Estado |
|------|-----|--------|
| A | UI catálogo + captura/validación de fotos ML + persistir en Storage | **Hecho** (mobile) |
| B / impl. 1 | Contrato categoría + mapper PART_NUMBER + hook predicción | **Código listo.** Tabla `repmax_ml_listings` **aplicada** en el hub (`20260811222700`) |
| C / impl. 2 | OAuth por tienda + proxy predictor (Edge) + switch gated | **Código listo, ops descartada.** Tabla `repmax_ml_connections` **no aplicar.** Edge **no desplegar.** MLV sin DevCenter/API |
| B resto | COLOR, título sugerido, paridad web de la grilla | Pendiente |
| C resto | `POST /items`, upload pictures, badges En ML / Desfasado | Pendiente |
| D | Sync stock bidireccional + órdenes ML → `repmax_sales` | Pendiente |

Las “impl. 1 / 2” son los cortes de código (briefs Composer). No sustituyen A–D de producto: C no está cerrado hasta publicar el ítem de verdad.

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
| Form | `ProductFormScreen` — fotos primero, hints ML, switch publicar |
| Thumbs catálogo | `ProductThumb` en inventario / POS / carrito — `photos[0]` aunque no esté en ML |

`productService.create` envía `storeId`.

### Web

- `MercadoLibreLogo` sustituye el SVG “M” dibujado a mano en landing (`MLSection`, mockups).

### Fuera de A (a propósito)

- Detector de watermark/logo (API de diagnóstico ML).
- Columna `color` en `repmax_products`.

---

## Impl. 1 — Category mapping (código + SQL aplicados)

Contrato de datos para predecir categoría/atributos **antes** de publicar. OAuth no hace falta para el mapper local; el predictor sí (proxy fase 2).

| Pieza | Path |
|-------|------|
| DDL | `docs/repmax/supabase/migrations/20260811222700_repmax_ml_listings.sql` |
| Tipos | `packages/repmax-schema/src/mlListing.ts` + Drizzle `mlListings` en `schema.ts` |
| Servicio | `apps/repmax-mobile/src/services/mercadolibre/mlCategoryService.ts` |
| Hook | `apps/repmax-mobile/src/hooks/useMlCategoryPrediction.ts` |
| Persist draft→ready | `mlListingService.upsertFromPrediction` |

- Relación 1:1 opcional `product_id` UNIQUE. Status: `draft \| ready \| published \| paused \| error`.
- RLS: `store_id = ANY (repmax_user_store_ids())`, columnas calificadas.
- Mapper: `partNumber` → PART_NUMBER/MPN; también BRAND / MODEL / ITEM_CONDITION. `missing` = tags required / new_required / conditional_required.
- Hub: versión `20260811222700` / `repmax_ml_listings` registrada en `schema_migrations`.

---

## Impl. 2 — OAuth (código listo, ops pendiente)

Conexión **una vez por tienda**. Tokens solo los escribe `service_role` (Edge). El cliente SELECT omite `access_token` / `refresh_token`. INSERT/UPDATE sin policy para `authenticated`. DELETE solo owner.

| Pieza | Path |
|-------|------|
| DDL | `docs/repmax/supabase/migrations/20260812010000_repmax_ml_connections.sql` (**no aplicar** hasta confirmar) |
| Tipos | `packages/repmax-schema/src/mlConnection.ts` + Drizzle `mlConnections` |
| Edge | `docs/repmax/supabase/functions/` — ver tabla abajo |
| Auth mobile | `mlAuthService.ts` + `useMercadoLibreConnection.ts` |
| UI | Card en `StoreSettingsScreen`. Switch en `ProductFormScreen` gated a `connected` + plan ≠ basic |

### Edge Functions

| Función | JWT | Rol |
|---------|-----|-----|
| `ml-oauth-start` | sí | `state` HMAC (secret propio, 300s) + `authUrl` MLV (u otro site por `country_code`) |
| `ml-oauth-callback` | **no** | GET `code`+`state` → token → upsert → `repmax://ml-connected?status=` |
| `ml-token-refresh` | sí | Rota `refresh_token` (ML lo invalida en cada uso) |
| `ml-predict-category` | sí | Proxy `domain_discovery` + `/categories/:id/attributes` |

Redirect **exacto** (ML rechaza variación):

`https://llacowjutjfefboqgfnj.supabase.co/functions/v1/ml-oauth-callback`

Sites: `VE→MLV` (mínimo). Preparado: `MCO` `MPE` `MEC` `MDO` vía `repmax_stores.country_code`.

### Cuenta desarrollador ML

- Correo: **`alberto@zmtechdev.com`** (cuenta ZM Tech; no usar Gmail personal).
- Site al crear la app: **Venezuela / MLV**.
- Una sola aplicación **RepMAX** (no una por tienda). Alberto es dueño de la app; cada tienda autoriza por OAuth.
- Scopes: lectura + escritura + `offline_access`.

**Soporte ML — consulta cerrada (MLV sin API)** — 2026-08-13 / respuesta oficial 2026-08-17

| Campo | Valor |
|-------|--------|
| Consulta | **475453897** |
| Error original | `PSC01-EZGLT8IYDQ3Z` en `/devcenter/accountLink` |
| URL | `https://developers.mercadolibre.com.ve/devcenter/accountLink` |
| Respuesta ML (Briajhan Gonzalez) | DevCenter/API de **Mercado Libre Venezuela (MLV) no está habilitado ni operativo** en el país. No es bloqueo de cuenta ni validación pendiente. |
| Estado | **Cerrado — track API descartado** hasta anuncio oficial de ML |

Sin DevCenter MLV no hay app ni `ML_CLIENT_ID` / `ML_CLIENT_SECRET`. **Plan de producto vigente:** [05-PLAN-catalogo-multicanal-sin-oauth.md](./05-PLAN-catalogo-multicanal-sin-oauth.md). El código OAuth del impl. 2 permanece en repo con `ML_API_ENABLED = false`.

### Bloqueador para E2E (track API — descartado)

No ejecutar ops hasta que Mercado Libre anuncie DevCenter/API operativa en MLV. Referencia histórica de lo que haría falta **si** ML habilita la plataforma:

1. App en [developers.mercadolibre.com](https://developers.mercadolibre.com) con site **MLV**, logueado como `alberto@zmtechdev.com`.
2. `redirect_uri` idéntico a la URL de `ml-oauth-callback`.
3. Secrets en el hub (nunca `SUPABASE_JWT_SECRET` para el state):

```
ML_CLIENT_ID
ML_CLIENT_SECRET
ML_REDIRECT_URI=https://llacowjutjfefboqgfnj.supabase.co/functions/v1/ml-oauth-callback
ML_OAUTH_STATE_SECRET
```

4. Aplicar migración `20260812010000_repmax_ml_connections`.
5. Deploy de las 4 funciones (`config.toml` en `docs/repmax/supabase/`).

Helper RLS verificado: `repmax_user_role_in_store(p_store_id uuid) → repmax_store_user_role`.

---

## Fase B — ficha (resto)

- Campo color (migración SQL + schema TS) si la categoría lo exige.
- Título sugerido: `Producto + Marca + compatible con {modelo} {años}`.
- Misma grilla de fotos en `repmax-web` dashboard inventario.
- UI de elegir predicción 1/2/3 en `ProductFormScreen` (el hook ya expone `predictions` / `missingAttributes`).

## Fase C — publicar ítem (resto)

- `pictures/items/upload` + `POST /items` → llenar `repmax_ml_listings.ml_item_id`.
- Badge por producto: Sin publicar / En ML / Error / Desfasado.
- Persistir `ml_publish_intent` en producto (hoy el switch es estado local).

## Fase D — sync

- RPC o Edge: al vender POS, `PUT` stock ML.
- Webhook órdenes → `repmax_create_sale_with_items` con origen `ml`.

---

## Criterio de listo

### Fase A

- [x] Foto &lt; 500 px no se sube a Storage.
- [x] Resize a 1200² JPEG si viene más grande.
- [x] Máx. 6 fotos; portada marcada.
- [x] Switch ML lista huecos (portada, PART_NUMBER, título).
- [ ] Probar en APK preview vía OTA.

### Impl. 1

- [x] Tabla `repmax_ml_listings` + RLS + schema TS.
- [x] Mapper local sin `any`.
- [x] Versión remota `20260811222700` = filename local.

### Impl. 2

- [x] Código OAuth + proxy + UI connect/switch (congelado; no ops).
- [ ] ~~App ML + secrets~~ — **descartado:** MLV sin DevCenter/API (consulta **475453897**).
- [ ] ~~Migración `repmax_ml_connections`~~ — no aplicar.
- [ ] ~~Deploy Edge Functions~~ — no desplegar.
- [ ] ~~Probar deep link `repmax://ml-connected`~~ — solo si ML habilita API.

---

## Comandos

```bash
pnpm --filter @repmax/repmax-schema check:types
pnpm --filter repmax-mobile check:types

# Cuando Alberto confirme ops:
# supabase functions deploy ml-oauth-start --project-ref llacowjutjfefboqgfnj
# supabase functions deploy ml-oauth-callback --project-ref llacowjutjfefboqgfnj --no-verify-jwt
# supabase functions deploy ml-token-refresh --project-ref llacowjutjfefboqgfnj
# supabase functions deploy ml-predict-category --project-ref llacowjutjfefboqgfnj
```
