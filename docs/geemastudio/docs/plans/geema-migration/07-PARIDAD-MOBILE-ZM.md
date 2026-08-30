# 07 — Paridad mobile Geema ↔ ZM (shadow test)

**Fecha:** 2026-08-29  
**Estado:** Planificado (track **S5-C**, post shadow APK preview SDK 56)  
**Repos:** `zm-tech` (`geemastudio-mobile`), referencia `ZM-Lash-and-Nails-Beauty/apps/mobile`  
**BD:** `udelxwwnyivknslueerr` — tenant #1 `zm-lash-nails`

---

## Contexto

Alberto probó **Geema mobile** (APK preview `exposdk:56.0.0`, build `34ec3bc3-5f08-41a9-9991-642489e044a7`) con login `alberto@zmlashnails.com` contra Supabase ZM prod (bridge S2).

**Resultado general:** login, datos core y navegación **funcionan**; la sensación de “pocos detalles” viene de **esquema incompatible** en catálogo avanzado y **features operativas ZM no portadas**, no de una app vacía.

| Área probada | Resultado |
|--------------|-----------|
| Login + tenant ZM | ✅ |
| Inicio (KPIs, próximas citas) | ✅ parcial |
| Agenda | ✅ básica — UI distinta a ZM |
| Servicios (catálogo base) | ✅ |
| Packs / Promos | ❌ pantallas existen, queries fallan vs esquema ZM |
| Clientes | ✅ |
| Pagos / Finanzas | ⚠️ no en tabs; **Más → Finanzas** (versión simple) |
| Inventario, personal | ✅ (admin) |
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

---

## Mapa de paridad (mobile)

| Módulo | Geema hoy | Objetivo S5-C |
|--------|-----------|---------------|
| Servicios individuales | ✅ | Mantener |
| Packs | ❌ esquema | Adaptador + UI ítems ZM |
| Promos + `promotion_items` | ❌ esquema | Adaptador + total desde ítems |
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

---

## Tareas (S5-C)

| ID | Tarea | Repo | Esfuerzo | Prioridad |
|----|-------|------|----------|-----------|
| S5C-1 | Adaptador `usePacksData`: `title`/`pack_price`/`category_id` ZM | zm-tech | M | P0 |
| S5C-2 | Adaptador `usePromosData` + `usePromotionItems` (total desde ítems) | zm-tech | M | P0 |
| S5C-3 | Validar `tenant_settings` ZM: timezone `America/Lima`, horarios | zm-tech + BD | S | P0 |
| S5C-4 | Agenda: cargar `appointment_services` + multi-servicio en detalle | zm-tech | L | P1 |
| S5C-5 | Portar referencias diseño + badge agenda (WABA) | zm-tech | L | P1 |
| S5C-6 | Portar `HolidayScreen` + reglas feriado/dom | zm-tech | M | P1 |
| S5C-7 | Finanzas: panel ejecutivo + `PricingBreakdownCard` (WABA) | zm-tech | L | P1 |
| S5C-8 | Dashboard: ranking top servicios + alertas feriado | zm-tech | S | P2 |
| S5C-9 | Documentar en UI dónde está Finanzas (onboarding admin) | zm-tech | S | P2 |
| S5C-10 | Tests smoke: packs/promos/agenda mismo día vs app ZM | zm-tech | S | P0 |

### DoD S5-C (shadow ZM en Geema)

- [ ] Servicios → tabs **Packs** y **Promos** muestran datos ZM prod (mismos conteos que app ZM)
- [ ] Agenda mismo día: mismas citas visibles que ZM (± filtro UI)
- [ ] **Más → Finanzas** lista pagos del tenant ZM
- [ ] `tenant_settings.timezone` = Lima; citas no “desaparecen” por offset
- [ ] ZM app legacy **sin cambio** (Geema es consumidor adaptador)

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
4. Más → Finanzas → al menos un pago visible si existen en ZM.
5. Clientes → muestra de teléfonos ZM.

Registrar hallazgos en este doc § **Notas de validación** (fecha + commit Geema).

### Notas de validación

| Fecha | Build / commit | Notas |
|-------|----------------|-------|
| 2026-08-29 | `34ec3bc3…` SDK 56 | Shadow OK core; packs/promos vacíos; finanzas no explorado en tabs; agenda distinta |

---

## Referencias

- Shadow APK: [Expo build 34ec3bc3](https://expo.dev/accounts/aeom0/projects/geemastudio-mobile/builds/34ec3bc3-5f08-41a9-9991-642489e044a7)
- Schema ZM: `packages/shared-schema/src/schema.ts` (`packs`, `promotions`, `promotion_items`)
- Geema servicios: `zm-tech/apps/geemastudio-mobile/screens/services/`
- Geema finanzas: `zm-tech/apps/geemastudio-mobile/screens/FinancesScreen.tsx`
- Audit previo: `zm-tech/docs/audit/03-AUDIT-*.md`
- [04-ROADMAP-SPRINTS.md](./04-ROADMAP-SPRINTS.md) § Sprint 5-C
