# Usuarios demo RepMAX

Proyecto Supabase: `llacowjutjfefboqgfnj`  
Tiendas: `repuestos-alfa` · `repuestos-beta`

Solo para desarrollo / staging. No usar en producción.

| Email                        | Password         | Role      | Store          | `user_id` (auth.users)                 | `store_user_id`                        |
| ---------------------------- | ---------------- | --------- | -------------- | -------------------------------------- | -------------------------------------- |
| `repmax-owner-a@test.local`  | `TestRepmax123!` | owner     | repuestos-alfa | `c65154c9-346d-474a-aff7-960aec38832a` | `271f62b9-adf6-4a8b-b1c0-741738b2c9bb` |
| `cashier.alfa@repmax.demo`   | `demo`           | cashier   | repuestos-alfa | `06d32214-8f6a-49e1-86a6-332e00c3bc00` | `bb7209fa-b81f-40d3-994c-d3aec17368ee` |
| `inventory.alfa@repmax.demo` | `demo`           | inventory | repuestos-alfa | `5203eac8-51f0-472b-bee9-6dd2d06026ef` | `66038802-5bcf-4e9d-aacd-b2e69b9972a1` |
| `repmax-owner-b@test.local`  | `TestRepmax123!` | owner     | repuestos-beta | `46c96263-f83b-4b88-81a3-1fdf2524967a` | `f4c29480-081a-4684-9bc9-1a3eecf702f7` |
| `cashier.beta@repmax.demo`   | `demo`           | cashier   | repuestos-beta | `487ce54e-a60a-4965-9b39-1230a3788b70` | `4796d655-3a29-4413-a5a6-89c47c7ab39f` |
| `inventory.beta@repmax.demo` | `demo`           | inventory | repuestos-beta | `c0ed182c-b365-4209-918f-402bacd07cd2` | `c0580bab-789f-4ca0-a126-c9919d3f4f3d` |

## Stores

| Slug             | `store_id`                             | Nombre         |
| ---------------- | -------------------------------------- | -------------- |
| `repuestos-alfa` | `ca6fff22-dba6-40d8-829f-987a097525db` | Repuestos Alfa |
| `repuestos-beta` | `b811436d-2d0e-4755-bcd9-09582fcdabbe` | Repuestos Beta |

## Notas

- Los 4 `@repmax.demo` se crearon con `supabase.auth.admin.createUser()` (email confirmado) y fila en `repmax_store_users`.
- Los owners `@test.local` vienen del seed inicial de tiendas (password `TestRepmax123!`).
- Catálogo de productos: [`demo_catalog.sql`](./demo_catalog.sql).
