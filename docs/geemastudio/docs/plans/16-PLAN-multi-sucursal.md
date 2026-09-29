# Plan 16 — Multi-sucursal (varios salones y franquicias por tenant)

**Fecha:** 2026-09-28
**Estado:** Borrador — sin implementar
**Repos afectados:** `zm-tech` (schema, web, mobile, server) y `ZM-Lash-and-Nails-Beauty` (Edge `whatsapp-webhook`, `send-whatsapp-notification`)

---

## Por qué existe

Hoy el modelo llega hasta el **tenant**. Un tenant (p. ej. `zm-lash-nails`) es un solo salón: una dirección, un horario, una agenda. Se necesita que un mismo tenant pueda tener:

- Varios salones propios (Lash Centro, Lash Norte).
- Franquicias con dueño operativo distinto pero misma marca, catálogo y bot.

Sin este plan, la única salida es un tenant por sucursal, lo que duplica catálogo, marca, número WABA, clientes y finanzas, y impide reportes consolidados.

## Estado actual (auditado 2026-09-28)

- No existe `branch_id` / `location_id` / tabla de sucursales en `packages/shared-schema` ni en las migraciones de `geemastudio-server`.
- `tenant_settings` guarda un único `business_hours`, `contact_info`, `web_address`, `web_city`, `web_map_embed_url`.
- `employees`, `appointments`, `payments`, `inventory_items`, `salon_holidays` cuelgan solo de `tenant_id` (o ni siquiera lo declaran en Drizzle, como `appointments`).
- `HoursLocationSection` (landing del tenant) asume una dirección.
- El bot responde ubicación y horario desde una sola fuente (`handleLocationQuestion`, Plan 08).

## Decisiones de diseño (propuestas)

1. **Sucursal = hija de tenant.** Nueva tabla `branches`; todo lo operativo referencia `branch_id`, el tenant sigue siendo el límite de aislamiento (RLS).
2. **Compatibilidad total:** cada tenant existente recibe una sucursal `principal` (`is_default = true`) y todas las filas actuales se backfillean a ella. Un tenant con una sola sucursal no ve ningún cambio de UI.
3. **Catálogo compartido por defecto**, con override opcional por sucursal (precio o disponibilidad de un servicio).
4. **Clientes a nivel tenant** (una clienta puede ir a cualquier sucursal); la cita registra dónde.
5. **Franquicias:** mismo modelo; el permiso se resuelve por rol + alcance de sucursal (ver Fase 5), no con un tenant aparte.

## Modelo de datos

### Tabla nueva `branches`

| Columna | Notas |
|---------|-------|
| `id` uuid PK | |
| `tenant_id` text | FK lógica a `tenant_settings`, indexada |
| `name` text | "Lash Centro" |
| `slug` text | único por tenant (para `/s/[slug]?sucursal=`) |
| `address`, `city`, `map_embed_url` | reemplazan `web_address`, `web_city`, `web_map_embed_url` a nivel sucursal |
| `phone`, `whatsapp` | opcional; si nulo, hereda del tenant |
| `business_hours` jsonb | mismo formato que `tenant_settings.business_hours` |
| `timezone` text nullable | hereda del tenant si nulo (sucursales en otra zona) |
| `is_default` boolean | una sola por tenant (índice único parcial) |
| `is_active` boolean | |
| `sort_order` int | |

### Columnas nuevas `branch_id` (FK → `branches.id`, NOT NULL tras backfill)

- `appointments`
- `payments` (heredado de la cita; obligatorio en ventas sin cita)
- `product_orders`
- `inventory_items` (stock por sucursal; ver nota abajo)
- `salon_holidays` (feriado global si `branch_id` es nulo, local si no)

### Tablas puente

- `employee_branches (employee_id, branch_id)` — una profesional puede rotar entre sucursales.
- `service_branches (service_id, branch_id, price_override, is_available)` — solo filas de excepción; sin fila = disponible al precio base.
- `profile_branches (profile_id, branch_id)` — alcance de staff/admin (Fase 5).

**Nota inventario:** hoy `inventory_items.quantity` es un número por tenant. Con varias sucursales hay dos caminos: (a) `branch_id` en `inventory_items` (una fila por sucursal, simple) o (b) tabla `inventory_stock (item_id, branch_id, quantity)`. Recomendado (b) si el catálogo retail se comparte; (a) si cada sucursal maneja su propio inventario. Decidir antes de la Fase 3.

## RLS

- Regla base intacta: `tenant_id = current_tenant()`.
- Se añade el filtro por alcance: un usuario con `profile_branches` solo ve filas de sus sucursales; el rol owner/admin de tenant ve todas.
- Toda RPC (`mark_product_order_paid`, etc.) debe recibir o inferir `branch_id` y validar que pertenece al tenant y al alcance del usuario.

## Fases

### Fase 0 — Decisiones (bloqueante)
- Inventario por sucursal: (a) o (b).
- ¿Un solo número WABA por tenant o uno por sucursal? (ver Bot).
- ¿Precios distintos por sucursal desde el día 1 o solo catálogo compartido?
- Franquicias: ¿finanzas separadas por dueño o solo reportes filtrables?

### Fase 1 — Base de datos (sin cambio visible)
1. Migración: crear `branches`, insertar la sucursal `principal` por tenant copiando `web_address`, `web_city`, `business_hours`, `timezone`.
2. Agregar `branch_id` nullable, backfill a la default, luego `NOT NULL` + índices `(tenant_id, branch_id, …)`.
3. Tablas puente; `employee_branches` backfilleada con todas las sucursales default.
4. Actualizar `packages/shared-schema` y tipos.
5. Probar con `supabase start` local antes de tocar `udelx…` (prod sin branching en la nube).

DDL en prod solo con confirmación explícita del usuario.

### Fase 2 — Panel web: gestión de sucursales
- `/panel/configuracion/sucursales`: CRUD (nombre, dirección, horarios, mapa, activa).
- Selector global de sucursal en el shell (oculto si el tenant tiene una sola).
- Agenda, Finanzas, Clientes y Productos filtran por la sucursal seleccionada; "Todas" para admin de tenant.
- Asignación de profesionales y servicios por sucursal.

### Fase 3 — Agenda, pagos e inventario
- Crear/editar cita exige sucursal (prefill desde el selector).
- Disponibilidad calculada con horario y feriados de la sucursal + profesionales asignadas a ella.
- Pagos y `product_orders` heredan `branch_id`; RPCs validadas.
- Stock por sucursal y transferencias entre sucursales (`inventory_movements` con `branch_id`).

### Fase 4 — Landing pública y mobile
- Landing del tenant: sección de sucursales (lista con dirección, horario y mapa por sucursal); `HoursLocationSection` pasa a iterar `branches`.
- Flujo de reserva pública: elegir sucursal antes del servicio.
- Mobile: selector de sucursal en agenda y en onboarding de staff.

### Fase 5 — Roles y franquicias
- `profile_branches` + RLS por alcance.
- Rol "encargada de sucursal": ve y opera solo la suya.
- Reportes consolidados por tenant y comparativos entre sucursales.
- Comisiones y corte fijo (Plan 09) evaluadas por sucursal.

### Fase 6 — Bot WhatsApp (repo `ZM-Lash-and-Nails-Beauty`)
- Si hay una sola sucursal: sin cambios.
- Con varias: el bot pregunta o infiere la sucursal (`whatsapp_sessions.branch_id`) antes de ofrecer horarios.
- `handleLocationQuestion` responde con la lista de sucursales o la de la sesión.
- Confirmaciones y recordatorios incluyen nombre y dirección de la sucursal.
- Opción B: un número WABA por sucursal (`branches.whatsapp_phone_number_id`) enruta directo, sin preguntar.
- Cambios en `whatsapp-webhook` respetan la regla de reconciliar prod/repo antes de desplegar (Plan 09 webhook reconcile).

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Backfill incorrecto rompe finanzas históricas | Migración en transacción, conteos antes/después, probar en local |
| Consultas sin filtro de sucursal mezclan datos | Helper único de scope en hooks; lint/grep de queries a tablas con `branch_id` |
| Bot desplegado antes que el schema | Fases 1 → 6 en orden; `branch_id` nullable con fallback a default hasta cerrar |
| Complejidad de UI para tenants de una sola sucursal | Todo el selector/filtros ocultos con `branches.count = 1` |
| Paridad con ZM Lash | ZM es el primer tenant multi-sucursal; validar ahí antes de exponerlo a otros |

## Criterios de aceptación

- Un tenant con una sola sucursal se comporta exactamente igual que hoy.
- Un tenant con 2+ sucursales puede agendar, cobrar y ver finanzas por sucursal y consolidado.
- Una profesional en dos sucursales no puede tener citas solapadas entre ellas.
- Ninguna consulta de un usuario con alcance limitado devuelve filas de otras sucursales.
- La landing y el bot muestran la dirección y el horario correctos de la sucursal.

## Fuera de alcance

- Marketplace o directorio multi-tenant.
- Pagos y facturación por sucursal con razón social distinta (revisar aparte para franquicias).
- Traspaso de clientes entre tenants.
