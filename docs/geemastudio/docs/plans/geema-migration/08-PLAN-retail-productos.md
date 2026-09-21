# 08 — Retail productos (ZM → Geema)

**Fecha:** 2026-09-21  
**Estado:** Implementado en ZM Lash (web); mobile Inventario diferido  
**Repo canónico ahora:** `ZM-Lash-and-Nails-Beauty`  
**Destino port:** `zm-tech` → `geemastudio-web` `/panel/productos` (+ mobile después)

---

## Por qué existe

Vanessa empieza a vender productos físicos en el salón (kit cuidado pestañas S/16 y siguientes). El sistema estaba modelado solo en **servicios/citas**. Este plan define el contrato de **retail** para ZM y el checklist de port a GeemaStudio.

## Estado Geema al documentar (21-sep-2026)

En `zm-tech` `main`:

- Campañas WA + promo broadcast mobile hechos
- Panel theming / dashboard / PWA por tenant hechos
- Inventario: solo mobile, **sin** venta retail (Plan 12 P5 = inventario web P2)
- Inbox WABA aún debajo de paridad ZM (Plan 11)

ZM sigue siendo fuente de verdad hasta cutover.

## Modelo de datos (prod `udelxwwnyivknslueerr`)

Migración: `20260921211312_add_retail_product_orders`

### `inventory_items` (extendido)

| Columna | Tipo | Uso |
|---------|------|-----|
| `is_sellable` | boolean default false | Catálogo retail |
| `description` | text nullable | Ficha staff/bot |
| `price` | decimal | Precio de venta si `is_sellable` |

### `product_orders`

| Columna | Notas |
|---------|--------|
| `status` | `reserved` \| `paid` \| `delivered` \| `cancelled` |
| `source` | `salon` \| `whatsapp` \| `promo` |
| `unit_price`, `quantity` | Total = unit × qty |
| `payment_id` | FK → `payments` al marcar pagado |
| `tenant_id` | default `zm-lash-nails` |

RLS: solo `is_admin()` (dev/owner), igual que payments/inventory.

### RPC `mark_product_order_paid(order_id, method, notes)`

Atómico:

1. Inserta `payments` (sin cita, notas “Venta retail: …”)
2. Baja `inventory_items.quantity`
3. Marca orden `paid` + `payment_id` + `paid_at`

## UI canónica (ZM)

**Ruta:** `/panel/productos` (`apps/web/src/app/panel/productos/`)

- Tab **Ventas**: apartados, marcar pagado, entregar, cancelar  
- Tab **Catálogo**: productos `is_sellable` (precio, stock, descripción)  
- Nav: `AdminNav` + card en `/panel`

**Mobile Inventario:** fuera de alcance de este entregable (port posterior).

## Flujo operativo

```
Promo WA / salón → clienta dice sí
  → Vanessa crea apartado (status=reserved) en /panel/productos
  → Al cobrar: Marcar pagado → payments + stock−
  → Opcional: Marcar entregado
```

Haiku (webhook):

- FAQ kit (qué es / cómo se usa / precio S/16)
- Si dice sí: deriva a Vanessa 932; **no** crea `product_orders` solo
- `action:none`, sin `add_to_cart`

## Seed

Ítem: **Kit cuidado pestañas** — S/16, categoría `pestanas_cejas`, stock 20, `is_sellable=true`.

## Checklist port Geema

### Schema / BD

- [ ] Confirmar migración ya aplicada en el proyecto Supabase que use Geema (hoy = mismo `udelx…` vía bridge)
- [ ] Mirror Drizzle en `zm-tech` shared-schema si diverge del de ZM
- [ ] Exponer RPC `mark_product_order_paid` en tipos/client Geema

### Web (`geemastudio-web`)

- [ ] Ruta `/panel/productos` (mismo flujo Ventas + Catálogo)
- [ ] Link en `PanelShell` / dashboard
- [ ] Auth admin + `tenant_id` scoping (Plan 12 Fase T)
- [ ] Theming con `--tenant-primary`

### Mobile (`geemastudio-mobile`)

- [ ] Tabs en Inventario: Stock \| Productos \| Ventas (o pantalla aparte)
- [ ] Paridad acciones paid/delivered/cancel

### Bot

- [ ] Port CASO kit + bloque PRODUCTOS RETAIL a prompt Geema multi-tenant (copy por `tenant_settings` / `waba_config`)
- [ ] No meter productos en carrito `service|pack` hasta sprint retail-bot

### Docs Geema a actualizar al portar

- [ ] `docs/geemastudio/docs/plans/12-PLAN-panel-parity-zm-lash.md` — P5 inventario/retail
- [ ] `docs/geemastudio/CHANGELOG.md` + ROADMAP

## Fuera de alcance (ambos repos)

- Bot creando órdenes automáticamente  
- POS multi-línea / carrito retail en WABA  
- Historial genérico de movimientos de inventario  

## Referencias código ZM

- Schema: `packages/shared-schema/src/schema.ts` (`productOrders`, `inventoryItems.isSellable`)
- Migración: `supabase/migrations/20260921211312_add_retail_product_orders.sql`
- UI: `apps/web/src/app/panel/productos/`
- Haiku: `haiku-prompt.ts` CASO kit; `haiku-cms-defaults.ts` PRODUCTOS RETAIL
