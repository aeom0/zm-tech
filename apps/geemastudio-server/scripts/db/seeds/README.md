# Seeds — GeemaStudio Dev

## Usuarios de prueba

Contraseña universal: `Geema2025!`

| Email                         | Rol     | Negocio           | Tipo                    |
| ----------------------------- | ------- | ----------------- | ----------------------- |
| `dev@ejemplo.com`             | `dev`   | —                 | Siempre va a onboarding |
| `demo.salon@ejemplo.com`      | `owner` | Salón Glamour     | hair-salon              |
| `demo.nails@ejemplo.com`      | `owner` | Nail & Glow Spa   | spa-nails               |
| `demo.barberia@ejemplo.com`   | `owner` | The Sharp Cut     | barbershop              |
| `demo.estetica@ejemplo.com`   | `owner` | Aura Estética     | full-aesthetic          |
| `staff.salon1@ejemplo.com`    | `staff` | → Salón Glamour   |                         |
| `staff.salon2@ejemplo.com`    | `staff` | → Salón Glamour   |                         |
| `staff.nails1@ejemplo.com`    | `staff` | → Nail & Glow Spa |                         |
| `staff.nails2@ejemplo.com`    | `staff` | → Nail & Glow Spa |                         |
| `staff.barber1@ejemplo.com`   | `staff` | → The Sharp Cut   |                         |
| `staff.barber2@ejemplo.com`   | `staff` | → The Sharp Cut   |                         |
| `staff.estetica1@ejemplo.com` | `staff` | → Aura Estética   |                         |
| `staff.estetica2@ejemplo.com` | `staff` | → Aura Estética   |                         |

## Estructura de datos por negocio demo

Cada negocio demo tiene:

- 4 categorías de servicio + servicios específicos del rubro
- 4 empleados (1 owner + 3 staff, 2 con login)
- 10 clientes con datos LATAM realistas
- 6 items de inventario relevantes al negocio
- 13 citas (10 completadas pasadas + 3 futuras programadas)
- 10 pagos (1 por cita completada, mix de métodos)

## Modo demo (sandbox)

Los 4 tenants demo tienen `is_demo = true` en `tenant_settings`.

**Comportamiento:**

- El usuario puede crear, editar y eliminar datos libremente
- Al hacer logout, la Edge Function `reset-demo-tenant` restaura
  automáticamente el estado original del negocio
- Un `DemoBanner` visible en la app informa al usuario de este comportamiento
- Los `employees` NO se resetean (son datos estructurales del demo)

**Edge Function:** `supabase/functions/reset-demo-tenant/index.ts`  
**Stored procedure:** `public.seed_demo_tenant(p_tenant_id UUID)`  
**Migraciones relacionadas:**

- `20260403_add_is_demo_to_tenant_settings.sql`
- `20260403_create_seed_demo_tenant_function.sql`

## IDs de referencia (Supabase dev — udelxwwnyivknslueerr)

| Negocio         | tenant_settings.id (= auth uid del owner) |
| --------------- | ----------------------------------------- |
| Salón Glamour   | `725e6fcc-7372-4974-beea-7c78852ad609`    |
| Nail & Glow Spa | `700d07ae-da7c-4b36-8ad3-12c2a7b66f10`    |
| The Sharp Cut   | `bf5d84dd-a1b1-4fa4-9349-2c811fa269f0`    |
| Aura Estética   | `e6704e01-2f1a-4da1-8d6d-600a1c243d5a`    |

## Convención de IDs en seeds

Todos los IDs de seed siguen prefijos fijos para facilitar el reset:

| Entidad            | Prefijo          | Ejemplo         |
| ------------------ | ---------------- | --------------- |
| Employees          | `emp-{negocio}-` | `emp-salon-1`   |
| Service categories | `cat-{negocio}-` | `cat-nails-2`   |
| Services           | `svc-{negocio}-` | `svc-barber-10` |
| Clients            | `cli-{inicial}-` | `cli-s-03`      |
| Inventory          | `inv-{inicial}-` | `inv-e-05`      |
| Appointments       | `apt-{inicial}-` | `apt-b-07`      |
| Payments           | `pay-{inicial}-` | `pay-n-04`      |

Donde `{negocio}` = salon / nails / barber / est  
y `{inicial}` = s / n / b / e
