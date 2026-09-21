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

Migraciones:

1. `20260921211312_add_retail_product_orders`
2. `20260921212252_product_orders_add_pedido_status` — añade status `pedido` + RPC que baja stock solo si venía de `reserved`

### `inventory_items` (extendido)

| Columna | Tipo | Uso |
|---------|------|-----|
| `is_sellable` | boolean default false | Catálogo retail |
| `description` | text nullable | Ficha staff/bot |
| `price` | decimal | Precio de venta si `is_sellable` |

### `product_orders`

| Columna | Notas |
|---------|--------|
| `status` | `reserved` (hay stock) \| `pedido` (sin stock / preventa) \| `paid` \| `delivered` \| `cancelled` |
| `source` | `salon` \| `whatsapp` \| `promo` |
| `unit_price`, `quantity` | Total = unit × qty |
| `payment_id` | FK → `payments` al marcar pagado |
| `tenant_id` | default `zm-lash-nails` |

RLS: solo `is_admin()` (dev/owner), igual que payments/inventory.

### RPC `mark_product_order_paid(order_id, method, notes)`

Atómico:

1. Inserta `payments` (sin cita; notas “Venta retail: …” o “Pedido retail: …”)
2. Si status era `reserved`: baja `inventory_items.quantity` (exige stock ≥ qty)
3. Si status era `pedido`: **no** toca stock (preventa / llegada posterior)
4. Marca orden `paid` + `payment_id` + `paid_at`

## UI canónica (ZM)

**Ruta:** `/panel/productos` (`apps/web/src/app/panel/productos/`)

- Tab **Ventas**: apartados y pedidos abiertos; marcar pagado, entregar, cancelar  
- Tab **Catálogo**: productos `is_sellable` (precio, stock, descripción)  
- Al crear o cobrar: push FCM a perfiles `owner`/`dev` (`send-notification`, `data.type=retail`)  
- Nav: `AdminNav` + card en `/panel`

**Mobile Inventario:** fuera de alcance de este entregable (port posterior).

## Flujo operativo

```
Promo WA / salón → clienta dice sí
  → Vanessa crea orden en /panel/productos
       · stock OK → status=reserved (apartado)
       · sin stock → status=pedido (preventa)
  → Al cobrar: Marcar pagado → payments (+ stock− solo si reserved)
  → Opcional: Marcar entregado
```

Haiku (webhook):

- FAQ kit (qué es / cómo se usa / precio S/16) — `FORMAT_INSTRUCTION` CASO kit + bloque **PRODUCTOS RETAIL** en `waba_config.haiku_system_prompt` (override BD) y en CMS defaults
- Si dice sí: deriva a Vanessa 932; **no** crea `product_orders` solo
- `action:none`; prohibido `add_to_cart` / `show_category` en el CASO (prompt). **Pendiente:** guard duro en código si Haiku emite lista igual

## Seed / stock operativo

Ítem: **Kit cuidado pestañas** — S/16, categoría `pestanas_cejas`, `is_sellable=true`.  
Stock en prod al blast: **6** (ajustar en panel Catálogo).

## Checklist port Geema

### Schema / BD

- [ ] Confirmar migraciones retail ya aplicadas en el proyecto Supabase que use Geema (hoy = mismo `udelx…` vía bridge)
- [ ] Mirror Drizzle en `zm-tech` shared-schema si diverge del de ZM (`pedido` incluido)
- [ ] Exponer RPC `mark_product_order_paid` en tipos/client Geema

### Web (`geemastudio-web`)

- [ ] Ruta `/panel/productos` (mismo flujo Ventas + Catálogo; reserved vs pedido)
- [ ] Push retail opcional (mismo patrón `send-notification`)
- [ ] Link en `PanelShell` / dashboard
- [ ] Auth admin + `tenant_id` scoping (Plan 12 Fase T)
- [ ] Theming con `--tenant-primary`

### Mobile (`geemastudio-mobile`)

- [ ] Tabs en Inventario: Stock \| Productos \| Ventas (o pantalla aparte)
- [ ] Paridad acciones paid/delivered/cancel

### Bot

- [ ] Port CASO kit + bloque PRODUCTOS RETAIL a prompt Geema multi-tenant (copy por `tenant_settings` / `waba_config`)
- [ ] No meter productos en carrito `service|pack` hasta sprint retail-bot
- [ ] (Opcional) Guard duro: mensaje retail sin intención de agendar → suprimir `show_category` / `show_packs` / `add_to_cart`

### Docs Geema a actualizar al portar

- [ ] `docs/geemastudio/docs/plans/12-PLAN-panel-parity-zm-lash.md` — P5 inventario/retail
- [ ] `docs/geemastudio/CHANGELOG.md` + ROADMAP

## Fuera de alcance (ambos repos)

- Bot creando órdenes automáticamente  
- POS multi-línea / carrito retail en WABA  
- Historial genérico de movimientos de inventario  

## Referencias código ZM

- Schema: `packages/shared-schema/src/schema.ts` (`productOrders`, `inventoryItems.isSellable`)
- Migraciones: `supabase/migrations/20260921211312_add_retail_product_orders.sql`, `…_product_orders_add_pedido_status.sql`
- UI: `apps/web/src/app/panel/productos/`
- Haiku: `haiku-prompt.ts` CASO kit; `haiku-cms-defaults.ts` PRODUCTOS RETAIL; BD `waba_config.haiku_system_prompt`
