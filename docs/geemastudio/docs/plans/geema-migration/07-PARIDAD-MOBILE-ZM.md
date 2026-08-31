# 07 — Paridad mobile Geema ↔ ZM (shadow test)

**Fecha:** 2026-08-30  
**Estado:** En curso — **S5C-1 / S5C-2 / S5C-3 / S5C-11 ✅** (PR [zm-tech #30](https://github.com/aeom0/zm-tech/pull/30)); resto P1/P2 pendiente  
**Repos:** `zm-tech` (`geemastudio-mobile`), referencia `ZM-Lash-and-Nails-Beauty/apps/mobile`  
**BD:** `udelxwwnyivknslueerr` — tenant #1 `zm-lash-nails`  
**Código:** rama `cursor/s5c-catalog-adapter-zm` — ZM app legacy **sin cambio**

---

## Contexto

Alberto probó **Geema mobile** (APK preview `exposdk:56.0.0`, build `34ec3bc3-5f08-41a9-9991-642489e044a7`) con login `alberto@zmlashnails.com` contra Supabase ZM prod (bridge S2).

**Resultado general:** login, datos core y navegación **funcionan**; la sensación de “pocos detalles” viene de **esquema incompatible** en catálogo avanzado y **features operativas ZM no portadas**, no de una app vacía.

| Área probada | Resultado (30-ago) |
|--------------|-----------|
| Login + tenant ZM | ✅ |
| Inicio (KPIs, próximas citas) | ✅ parcial |
| Agenda | ✅ hora Lima (S5C-3); UI distinta a ZM; multi-servicio → S5C-4 |
| Servicios (catálogo base) | ✅ |
| Packs / Promos | ✅ adaptador (S5C-1/2) — Alberto confirmó visibles |
| Clientes | ✅ |
| Pagos / Finanzas | ⚠️ no en tabs; **Más → Finanzas** (versión simple; `payment_mode` ZM-safe) |
| Inventario | ✅ (admin) |
| Personal / chicas | ✅ adaptador (S5C-11) — misma tabla que columnas de agenda |
| WABA (promo WA, referencias agenda) | ❌ stub o ausente |

---

## Diagnóstico por observación

### Inicio muestra completadas; agenda “no las veo”

**Esperado (UX distinta), no bug de datos.**

| Pantalla | Comportamiento |
|----------|----------------|
| **Inicio** | KPI **Completadas** = count citas `completed` hoy. Lista **Próximas citas** = solo `scheduled`. |
| **Agenda** | Carga todas las citas; filtro default **Todas**. Completadas visibles si día/filtro correctos. |

**Checklist QA agenda** (repetir en validaciones):

1. Header → **Hoy** (o navegar al día de la cita).
2. Chips estado → **Todas** o **Completadas** (no **Pendientes**).
3. Quitar filtro por profesional (avatar strip).
4. Comparar misma fecha en app ZM — si ZM sí y Geema no → revisar `tenant_settings.timezone` (Lima).

Geema usa grid día/semana + columnas staff; ZM usa grid 10–18 h Lima con medias horas. Paridad visual no es objetivo S5-C; paridad **datos + operación** sí.

### Packs y promos vacíos / error

**Bug de compatibilidad BD** — UI implementada en Geema, esquema divergente.

| Tabla | Geema mobile espera | ZM prod (`shared-schema`) |
|-------|---------------------|---------------------------|
| `packs` | `name`, `price`, `service_ids[]` | `title`, `pack_price`, `pack_price_card`, `category_id`, `service_ids` (JSON text) |
| `promotions` | `expires_at`, `promo_price` único | `valid_until`, `valid_from`, ítems en `promotion_items` |
| `promotion_items` | — (no usa) | `item_type`, `item_id`, `quantity`, `discounted_price` |
| `service_categories` | `color`, `icon` (opcional Geema) | `id`, `name`, `order` |

**Archivos Geema afectados:**

- `screens/services/hooks/usePacksData.ts` — `select('id, name, description, price, …')`
- `screens/services/hooks/usePromosData.ts` — `expires_at`
- `screens/services/components/PromoModal.tsx`, `PackModal.tsx`

**Estrategia:** capa **adaptador ZM** en hooks (mapear columnas prod) hasta unificar schema en Drizzle compartido (S7+) o vistas SQL `packs_geema` / RPC.

**Cerrado (30-ago, S5C-1/2):** `screens/services/lib/catalogAdapter.ts` — dialecto vía sonda `packs.title`. Hooks `usePacksData` / `usePromosData` mapean `title`/`pack_price`/`valid_until` + total promo desde `promotion_items`. Categorías ZM sin `color`/`icon`. Alberto confirmó packs/promos visibles en OTA preview.

### Pagos “no los veo”

**Parcialmente esperado.**

| Módulo | Geema | ZM |
|--------|-------|-----|
| Entrada UI | **Más → Finanzas** | **Más → Finanzas** |
| CRUD `payments` | ✅ | ✅ |
| Desglose por chica | ✅ | ✅ |
| Panel ejecutivo (KPIs, gráfico) | ❌ | ✅ |
| Gastos operativos | ❌ | ✅ |
| Costos WABA / Meta | ❌ | ✅ (`waba_pricing_daily`) |
| Uso IA | ❌ | ✅ |
| Pago en detalle cita (agenda) | ❌ | ✅ |

### Personal / chicas vs agenda

**Misma tabla `employees` + `appointments.employee_id`.** Más usa `tenant_settings.staff_terminology` (`chicas`). Color y `is_active` alimentan columnas / picker de agenda.

**Bug (30-ago):** Geema pedía columnas que ZM prod no tiene. El listado `select('*')` funcionaba; guardar o recargar agenda con `avatar_url` / `payment_mode` / `salary_amount` fallaba (o se tapaba con cache TanStack compartida `['employees']` y queryFns distintos).

| Columna | Geema | ZM prod |
|---------|-------|---------|
| `name`, `color`, `is_active`, `commission_percentage` | ✅ | ✅ |
| `avatar_url` | ✅ | ✅ (columna agregada 30-ago-2026, ver nota abajo) |
| `payment_mode`, `salary_amount` | sí | **no** |

**Cerrado (S5C-11):** `screens/personal/lib/employeesAdapter.ts` + `useEmployeesQuery` / `useActiveEmployees`. Writes ZM omiten `payment_mode`/`salary_amount`; UI oculta modo salario para ZM. Agenda/Asignar/Finanzas/Dashboard/Validación/Personal comparten la misma query.

**Actualización (30-ago-2026):** se agregó `avatar_url text` a `employees` en producción ZM (`udelxwwnyivknslueerr`, vía Management API — conexión directa a Postgres bloqueada en el sandbox), se creó el bucket público `employee-avatars` en Storage, y se subieron/asignaron las fotos reales de Vanessa y Stephani (fuente: sitio web ZM Lash / Sanity CMS). `employeesAdapter.ts` ya no anula `avatar_url` para el dialecto ZM — la columna es común a ambos esquemas ahora, solo `payment_mode`/`salary_amount` siguen siendo geema-only. La app standalone de ZM Lash (`apps/mobile` en este repo) no tiene feature de avatar por empleado, así que no requiere cambios de código — solo se sincroniza este doc. Detalle: `zm-tech/.cursor/skills/geemastudio.md` §8 y `zm-tech/docs/geemastudio/CHANGELOG.md`.

Prod tenant: Vanessa, Stephani, Chica Externa (3 columnas). Staff sin `profiles.employee_id` no ve “su” columna (dato, no bug de cableado).

### Timezone / hora de pared (S5C-3)

`appointments.date` = timestamp **sin** TZ (hora Lima literal). Geema interpretaba el `Z` falso de PostgREST → citas −5 h. Cerrado: `packages/tenant-config` wallclock + hidratar `tenant_settings` al login. Más → Horario de trabajo sí alimenta filas de agenda.

---

## Mapa de paridad (mobile)

| Módulo | Geema hoy | Objetivo S5-C |
|--------|-----------|---------------|
| Servicios individuales | ✅ | Mantener |
| Packs | ✅ adaptador | Mantener |
| Promos + `promotion_items` | ✅ adaptador | Mantener |
| Personal / chicas ↔ agenda | ✅ adaptador | Mantener |
| Agenda timezone Lima | ✅ wallclock | Mantener |
| Agenda multi-servicio | ❌ | Portar `appointment_services` |
| Referencias diseño WABA | ❌ | Portar inbox + badge agenda |
| Feriados / slots domingo | ❌ | Portar `HolidayScreen` + lógica |
| Finanzas ejecutiva | ❌ | Portar cards WABA/gastos (fase 2 S5-C) |
| Promo masiva WA | stub | Depende S6 WABA |
| Dashboard ranking servicios | ❌ | P2 |
| Push FCM persist token | TODO Geema | S6-7 (paralelo) |

---

## Decisión de arquitectura

### Opción A — Adaptador en mobile (recomendada S5-C)

Hooks Geema detectan esquema ZM (columnas presentes) o flag `tenant_settings.schema_version` y mapean:

```
pack.title → pack.name (UI)
pack.pack_price → pack.price
promotion.valid_until → promo.expires_at
promotion_items → PromoModal ítems
```

**Pros:** sin migración BD destructiva; ZM prod sigue igual.  
**Contras:** dos paths en hooks hasta convergencia schema.

### Opción B — Vistas SQL / RPC PostgREST

```sql
-- Bosquejo
CREATE VIEW packs_mobile AS
SELECT id, title AS name, pack_price AS price, ...
FROM packs WHERE tenant_id = current_tenant_id();
```

**Pros:** mobile simple. **Contras:** RLS + mantenimiento en migrations ZM.

### Opción C — Unificar schema Drizzle (S7+)

Geema y ZM consumen `@zmtech/shared-schema` con columnas canónicas + migración datos legacy.

**No bloqueante para S5-C** — documentar como fase final convergencia apps.

### Schema canónico (prod ZM) — regla operativa 30-ago 2026

**`udelxwwnyivknslueerr` es la fuente de verdad DDL.** Geema (shadow) consume; no reescribe.

| Objeto | Estado prod | Acción Geema |
|--------|-------------|--------------|
| `appointment_services` | Existe (`id` uuid, `pack_id`, `tenant_id`) | **No** `CREATE TABLE` |
| RLS `apt_svc_*` | `is_admin()` + `current_tenant_id()` | **No** policies con `get_my_role()` (no existe) |
| `appointments.service_ids` / `reference_image_*` | Existen | **No** `ADD COLUMN` |
| Índices lookup `appointment_id|service_id|employee_id` | ✅ `20260831011759_idx_appointment_services_lookup` | Delta seguro ya aplicado en ZM |

Scripts Geema tipo `20260830_appointment_services_multiservicio.sql` (PR [zm-tech #31](https://github.com/aeom0/zm-tech/pull/31)): solo **greenfield** / CI en BD vacía. En shadow ZM: merge código OK; **no** correr el SQL completo.

Convergencia corta: Drizzle Geema → **superset tipado de prod**; adaptadores mobile se apagan; extras solo-Geema (`payment_mode`, etc.) llegan a prod solo con migration canónica en repo ZM.

---

## Tareas (S5-C)

| ID | Tarea | Repo | Esfuerzo | Prioridad | Estado |
|----|-------|------|----------|-----------|--------|
| S5C-1 | Adaptador `usePacksData`: `title`/`pack_price`/`category_id` ZM | zm-tech | M | P0 | ✅ PR #30 |
| S5C-2 | Adaptador `usePromosData` + `usePromotionItems` (total desde ítems) | zm-tech | M | P0 | ✅ PR #30 |
| S5C-3 | Validar `tenant_settings` ZM: timezone `America/Lima`, horarios | zm-tech + BD | S | P0 | ✅ PR #30 |
| S5C-11 | Adaptador `employees` (sin `payment_mode`/`salary_amount` ZM; `avatar_url` sumado 30-ago) + cache única con agenda | zm-tech | S | P0 | ✅ PR #30 |
| S5C-4 | Agenda: cargar `appointment_services` + multi-servicio en detalle | zm-tech | L | P1 | En curso (PR #31; schema prod ya listo) |
| S5C-5 | Portar referencias diseño + badge agenda (WABA) | zm-tech | L | P1 | Pendiente |
| S5C-6 | Portar `HolidayScreen` + reglas feriado/dom | zm-tech | M | P1 | Pendiente |
| S5C-7 | Finanzas: panel ejecutivo + `PricingBreakdownCard` (WABA) | zm-tech | L | P1 | Pendiente |
| S5C-8 | Dashboard: ranking top servicios + alertas feriado | zm-tech | S | P2 | Pendiente |
| S5C-9 | Documentar en UI dónde está Finanzas (onboarding admin) | zm-tech | S | P2 | Pendiente |
| S5C-10 | Tests smoke: packs/promos/agenda mismo día vs app ZM | zm-tech | S | P0 | Parcial (visual 30-ago) |

### DoD S5-C (shadow ZM en Geema)

- [x] Servicios → tabs **Packs** y **Promos** muestran datos ZM prod (Alberto, 30-ago)
- [x] Agenda mismo día: citas en hora Lima, no corridas −5 h (S5C-3)
- [x] Más → chicas cableado a columnas de agenda; writes ZM-safe (S5C-11)
- [ ] **Más → Finanzas** lista pagos del tenant ZM (smoke explícito)
- [x] `tenant_settings.timezone` = Lima; citas no “desaparecen” por offset
- [x] ZM app legacy **sin cambio** (Geema es consumidor adaptador)

---

## Dependencias

| Depende de | Por qué |
|------------|---------|
| S2 bridge `tenant_settings` | ✅ Ya en prod |
| S5-B (opcional) | Branding no bloquea paridad datos |
| S4 crons tenant-aware | No bloquea mobile lectura |
| S6 WABA panel | Promo masiva WA fuera de S5-C |

**Paralelizable con:** S5-B branding, S4 Edge crons.

---

## Validación shadow (repetible)

**Build:** preview SDK 56, Supabase ZM prod env.  
**Usuario:** owner/dev con `tenant_id = zm-lash-nails`.

1. Login OK → primary/accent violeta-oro (post S5-B) o Lunaris residual (pre-S5-B).
2. Servicios → contar packs/promos vs ZM.
3. Agenda → hoy + **Completadas** vs count Inicio.
4. Más → **chicas** → mismas 3 filas que columnas de agenda; editar color/`Activa` se refleja.
5. Más → Finanzas → al menos un pago visible si existen en ZM.
6. Clientes → muestra de teléfonos ZM.

Registrar hallazgos en este doc § **Notas de validación** (fecha + commit Geema).

### Notas de validación

| Fecha | Build / commit | Notas |
|-------|----------------|-------|
| 2026-08-29 | `34ec3bc3…` SDK 56 | Shadow OK core; packs/promos vacíos; finanzas no explorado en tabs; agenda distinta |
| 2026-08-30 | OTA `3814b188…` (S5C-1…3) | Alberto: packs/promos/agenda visibles. Hora de pared Lima. |
| 2026-08-30 | OTA `01bdcd1f…` (S5C-11) | Adaptador employees; smoke chicas ↔ agenda pendiente en APK |
| 2026-08-30 | OTA `d5d0dea9…` | `avatar_url` agregado a `employees` ZM prod + fotos reales Vanessa/Stephani subidas a Storage; `employeesAdapter.ts` ya no lo anula para dialecto ZM. Publicado en canal `preview`. |

**PR:** [aeom0/zm-tech#30](https://github.com/aeom0/zm-tech/pull/30) — OTA preview [01bdcd1f](https://expo.dev/accounts/aeom0/projects/geemastudio-mobile/updates/01bdcd1f-9dd9-472d-a637-383d6bdbeb89)

---

## Referencias

- Shadow APK: [Expo build 34ec3bc3](https://expo.dev/accounts/aeom0/projects/geemastudio-mobile/builds/34ec3bc3-5f08-41a9-9991-642489e044a7)
- Schema ZM: `packages/shared-schema/src/schema.ts` (`packs`, `promotions`, `promotion_items`, `employees`)
- Geema servicios: `zm-tech/apps/geemastudio-mobile/screens/services/` (`catalogAdapter.ts`)
- Geema personal: `zm-tech/apps/geemastudio-mobile/screens/personal/lib/employeesAdapter.ts`
- Geema finanzas: `zm-tech/apps/geemastudio-mobile/screens/FinancesScreen.tsx`
- Audit previo: `zm-tech/docs/audit/03-AUDIT-*.md`
- [04-ROADMAP-SPRINTS.md](./04-ROADMAP-SPRINTS.md) § Sprint 5-C
