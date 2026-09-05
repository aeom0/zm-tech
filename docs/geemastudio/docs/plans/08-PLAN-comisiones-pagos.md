# Comisiones por profesional + registro de pago (mobile + web)

> Estado: implementado en mobile + web (04-sep-2026). Pendiente: prueba manual en Expo Go y en `/finanzas` con datos reales.

## Contexto

Hoy Finanzas (mobile) ya calcula, por período (día/semana/mes), cuánto generó cada
profesional y cuánto le corresponde de comisión (`useFinancesData.ts` → `desglosePorChica`,
usando `calculateEmployeeEarnings` de `packages/shared-schema/src/utils/payroll.ts`). Pero
**no existe ningún mecanismo para registrar que el salón ya le pagó esa comisión al
profesional** — ni tabla, ni columna, ni UI. El Owner lo necesita para llevar control de
qué ya liquidó y qué le queda pendiente por pagar a cada chica/profesional.

Web (`apps/geemastudio-web/src/hooks/finanzas/useFinanzasData.ts`) está mucho más atrás:
es un portal legacy single-tenant (hardcoded a "ZM Lash & Nails Beauty", sin `useTenant()`,
sin la dependencia `@geemastudio/shared-schema`) que ni siquiera calcula comisión real
(solo generado/cobrado/pendiente por cita, sin `payment_mode`/`commission_percentage`).
El usuario pidió llevar ambos (mobile y web) al mismo nivel en este esfuerzo.

**Restricción crítica**: GeemaStudio comparte el proyecto Supabase de producción
`udelxwwnyivknslueerr` con la app real en producción de ZM Lash & Nails Beauty (repo
separado `aeom0/ZM-Lash-and-Nails-Beauty`). Esa app no necesita esta UI, pero el cambio de
BD debe ser 100% aditivo — una tabla nueva, cero `ALTER` sobre `employees`/`payments`/
`appointments`/`appointment_services`, para no arriesgar nada de esa app en producción.

## Schema nuevo (aditivo, vía MCP `apply_migration`)

Patrón de RLS ya existente en `operational_expenses` (tabla también creada fuera de
Drizzle): usa helpers ya definidos `is_admin()` y `current_tenant_id()`, y `tenant_id` es
`text` (no `uuid`). Se replica ese patrón exacto:

```sql
create table public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  employee_id varchar not null,
  period_start date not null,
  period_end date not null,
  amount numeric(10,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index idx_commission_payouts_lookup
  on public.commission_payouts (tenant_id, employee_id, period_start, period_end);

alter table public.commission_payouts enable row level security;

create policy commission_payouts_admin_select on public.commission_payouts
  for select using (is_admin() and tenant_id = current_tenant_id());
create policy commission_payouts_admin_insert on public.commission_payouts
  for insert with check (is_admin() and tenant_id = current_tenant_id());
create policy commission_payouts_admin_delete on public.commission_payouts
  for delete using (is_admin() and tenant_id = current_tenant_id());
```

Sin FK a `employees` (mismo criterio que `operational_expenses`: evita cualquier
constraint cruzado con tablas que la app legacy toca). Sin `update` policy — un pago mal
registrado se borra y se vuelve a crear, más simple que editar.

**Sin unique constraint**: se permiten múltiples filas por período+empleado (pagos
parciales, igual que `payments` permite múltiples filas por cita). "Pagado" en un período
= `SUM(amount)` de las filas cuyo rango solapa el rango filtrado (`period_start <= F_end
AND period_end >= F_start`). Limitación aceptada para el MVP: si se paga "el mes completo"
y luego se filtra por una semana dentro de ese mes, el pago del mes se refleja también ahí
(no hay prorrateo por día). Se comunica en la UI con un texto breve, sin lógica adicional.

**Pasos de migración** (vía `mcp__ClaudeSupabase__apply_migration` — la BD real de este
proyecto es accesible por ese servidor MCP, no por `SupabaseZMTech`):
1. `apply_migration` con el SQL de arriba, nombre `create_commission_payouts`.
2. `get_advisors` (security + performance) — confirmar 0 warnings nuevos.
3. `execute_sql`: `select count(*) from employees`, `payments`, `appointments` antes/después
   como smoke test de que nada existente se tocó.

## Mobile — archivos

- `apps/geemastudio-mobile/screens/finances/services/payouts.ts` (nuevo): `fetchPayoutsForRange(tenantId, start, end)`, `createPayout(input)`, `deletePayout(id)` — mismo estilo que `services/expenses.ts` (`requireTenantId` helper incluido).
- `apps/geemastudio-mobile/screens/finances/hooks/usePayouts.ts` (nuevo): `useQuery(['commission_payouts', tenantId, range.start, range.end])` + `useMutation` para crear/borrar, `invalidateQueries` + `onError: Alert.alert('Error', ...)` (mismo patrón que `useExpenses.ts`).
- `apps/geemastudio-mobile/screens/finances/types.ts` (editado): agregar `CommissionPayout` y, en `FinancesDesgloseRow`, `comisionPagada` / `comisionPendienteReal` (para no confundir con `pagado`/`pendiente` existentes, que son "cobrado al cliente").
- `apps/geemastudio-mobile/screens/finances/hooks/useFinancesData.ts` (editado): integrar `usePayouts`, agregando a cada fila de `desglosePorChica` el agregado por overlap del punto anterior.
- `apps/geemastudio-mobile/screens/finances/components/EmployeeBreakdown.tsx` (editado): mostrar comisión generada vs pagada vs pendiente real, y botón "Marcar pago" (visible solo si `isAdmin`, ya disponible en `FinancesScreen.tsx`).
- `apps/geemastudio-mobile/screens/finances/components/RegisterPayoutModal.tsx` (nuevo): form con monto (prellenado con pendiente calculado), fecha, método, notas — mismo patrón visual que `ExpenseModal.tsx`.
- `apps/geemastudio-mobile/screens/FinancesScreen.tsx` (editado): estado del modal + wiring a `EmployeeBreakdown`.

## Web — archivos

- `apps/geemastudio-web/package.json`: agregar `"@geemastudio/shared-schema": "workspace:*"`.
- `apps/geemastudio-web/src/hooks/finanzas/useFinanzasData.ts` (reescrito parcialmente, migrando a TanStack Query ya que el paquete lo tiene instalado): agregar selector de período (reusar `FinancesPeriod`/`buildFinancesDateRanges` si se puede compartir, o replicar localmente dado que web no importa hooks de mobile), traer `appointment_services` + `employees(payment_mode, commission_mode, commission_percentage, house_cut_fixed, salary_amount)`, aplicar `calculateEmployeeEarnings`. El resto del portal (tema, moneda, nombre fijo "ZM Lash") queda igual — no se multi-tenantiza todo el portal, solo esta sección.
- `apps/geemastudio-web/src/hooks/finanzas/usePayouts.ts` (nuevo): mismo query/mutación que mobile, contra el `tenant_id` fijo que ya usa el resto del portal.
- `apps/geemastudio-web/src/app/finanzas/page.tsx` (editado): selector de período sobre la tabla "Por chica", columnas comisión/pagado/pendiente real, modal simple para registrar pago.

## Verificación end-to-end

- `pnpm --filter geemastudio-mobile check:types` y `pnpm --filter geemastudio-mobile lint`.
- `pnpm --filter geemastudio-web check:types` y lint equivalente.
- Mobile: Expo Go — cambiar filtro día/semana/mes, registrar un pago parcial y luego el resto, confirmar que "pendiente real" llega a 0 sin bajar de ahí.
- Web: `pnpm --filter geemastudio-web dev` — mismo flujo en `/finanzas`, confirmar que el resto del portal sigue igual.
- Post-migración: confirmar vía `get_advisors` y conteos de filas que `employees`/`payments`/`appointments` no cambiaron, para dar por descartado cualquier impacto a ZM Lash en producción.
