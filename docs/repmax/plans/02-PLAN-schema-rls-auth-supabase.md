# 02 — Schema `repmax_*`, RLS y Auth Provider aislado en `llacowjutjfefboqgfnj`

> **Estado: CERRADO** (ago 2026). Documento histórico. Migraciones vigentes: [../supabase/migrations/](../supabase/migrations/). Fuente de verdad: [../README.md](../README.md).

**Precondición:** Fase 01 cerrada — RepMAX compila dentro del monorepo en las versiones correctas.

**Objetivo:** las 8 tablas de RepMAX existen en la BD compartida con prefijo `repmax_` y RLS activo, y hay un Auth Provider aislado listo para usarse — pero `apps/repmax-web`/`apps/repmax-mobile` **todavía no lo consumen** (eso es la fase 03). Separar "la BD existe y es correcta" de "la app ya la usa" para poder validar cada pieza por separado.

---

## Paso 1 — Mapeo de tablas (prefijo `repmax_`)

Del `packages/repmax-schema/src/schema.ts` original:

| Original | Nueva (prefijo) | Nota |
|---|---|---|
| `users` | ~~`repmax_users`~~ → **no migrar tal cual** | Se reemplaza por `auth.users` de Supabase (ver Paso 3) |
| `stores` | `repmax_stores` | Raíz del tenant |
| `store_users` | `repmax_store_users` | `user_id` pasa a referenciar `auth.users.id` en vez de la tabla `users` local |
| `products` | `repmax_products` | |
| `customers` | `repmax_customers` | |
| `cash_sessions` | `repmax_cash_sessions` | |
| `sales` | `repmax_sales` | |
| `sale_items` | `repmax_sale_items` | |

Enums (`vehicle_type`, `part_condition`, `payment_method`, `sale_status`, `cash_session_status`, `store_user_role`, `subscription_plan`) → prefijarlos también: `repmax_vehicle_type`, etc. Postgres no namespacea enums por tabla, así que sin prefijo colisionarían nombre-a-nombre con enums futuros de otro vertical.

## Paso 2 — Migración SQL (probar local primero)

```bash
cd apps/repmax-server   # o donde quede el drizzle-kit config
supabase start          # instancia local, NUNCA directo contra llacowjutjfefboqgfnj
```

Traducir `schema.ts` a Drizzle con los nombres prefijados, generar migración:
```bash
pnpm drizzle-kit generate --name repmax_initial_schema
```

Revisar el SQL generado a mano antes de aplicar — verificar:
- Todas las tablas llevan `repmax_`
- Todos los índices/constraints llevan `idx_repmax_*` / `uniq_repmax_*`
- Ningún `DROP`, ningún `NOT NULL` sin default (mismo criterio que ZM Lash & Nails, aunque acá no haya data real — es más fácil mantener el hábito que aprenderlo dos veces)

Aplicar contra `llacowjutjfefboqgfnj` solo después de validar en local:
```bash
pnpm drizzle-kit push --config=<repmax-drizzle-config>
```

## Paso 3 — RLS

Reusar el patrón de `odental_*` (ya tienes el RLS helper de las migraciones 003/004 de OdentalPro — revisar si es reutilizable genérico o si hay que escribir uno análogo para `repmax_`).

Regla base por tabla: un usuario autenticado solo ve filas donde su `auth.uid()` aparece en `repmax_store_users` para el `store_id` correspondiente.

```sql
alter table repmax_products enable row level security;

create policy "repmax_store_members_select"
on repmax_products for select
using (
  exists (
    select 1 from repmax_store_users su
    where su.store_id = repmax_products.store_id
      and su.user_id = auth.uid()
      and su.is_active = true
  )
);
```

Replicar (select/insert/update/delete según corresponda) para las 8 tablas. `repmax_stores` necesita su propia policy (un owner ve su tienda; ver `repmax_store_users` para saber cuáles).

**Ojo con el storefront público** (`/[slug]` en `apps/repmax-web`, sin login): esa ruta necesita leer `repmax_products`/`repmax_stores` sin JWT de usuario — mismo patrón que ya resolviste en el cotizador ZM Tech (`quote_leads`: sin policies públicas, escritura solo vía service role). Para RepMAX es al revés — necesitas **lectura pública** del catálogo activo. Opción limpia: policy adicional de `select` con `using (is_active = true)` sin chequeo de `auth.uid()`, separada de la policy de miembros de tienda. No uses service role para esto — el catálogo público no debería tener el mismo nivel de acceso que el panel admin.

## Paso 4 — Storage

Si `products.photos` pasa de URLs sueltas a Supabase Storage: bucket `repmax-products` (con guión, no underscore — así nombra Supabase los buckets por convención), policies scoped por `store_id` en el path del archivo.

## Paso 5 — Auth Provider aislado

Mismo patrón que `@geemastudio/tenant-config/odental` (`OdentalAuthProvider`/`useAuth`, `OdentalTenantProvider`/`useTenant`):

```
packages/tenant-config/src/repmax/
  ├── auth-provider.tsx    # RepmaxAuthProvider, useAuth()
  ├── tenant-provider.tsx  # RepmaxTenantProvider, useTenant() — resuelve store activa
  └── index.ts
```

`useAuth()` envuelve `supabase.auth.signInWithPassword` / `onAuthStateChange`, no JWT propio. `useTenant()` reemplaza lo que hoy hace `AuthContext.tsx` de `apps/repmax-mobile` al resolver `storeUser`/`store` — pero consultando `repmax_store_users` vía RLS en vez de decodificar el JWT de Express.

**No conectar esto a `apps/repmax-web`/`mobile` todavía** — solo dejarlo listo y probado con un usuario de prueba creado a mano en `llacowjutjfefboqgfnj` (Auth → Add user), verificando que las policies filtran correcto.

---

## Checkpoint de cierre de fase

- [ ] 8 tablas `repmax_*` (7, sin contar `users` que se reemplaza) existen en `llacowjutjfefboqgfnj` con RLS `enabled`
- [ ] Verificado por MCP: `select` desde un usuario de prueba solo trae su propia tienda
- [ ] Verificado: `contacts`, `quote_leads`, `odental_*` — cero cambios, cero filas tocadas
- [ ] `RepmaxAuthProvider`/`useAuth`/`useTenant` compilan y funcionan contra un usuario de prueba, sin estar todavía cableados a las apps reales
