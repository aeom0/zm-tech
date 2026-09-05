# 02 — Bloqueadores multi-tenant

**Fecha:** 2026-08-28  
**Prioridad:** P0 — ninguno de estos puede posponerse si el 2.º tenant toca la misma BD.

---

## 1. Plan 02 §11 (obligatorios documentados)

| # | Bloqueador | Riesgo | Acción |
|---|-----------|--------|--------|
| **1** | Uniques `clients` sin `tenant_id` (`wa_user_id`, `phone_country+phone_normalized`, **`dni`**) | Dos tenants no pueden compartir teléfono/BSUID/DNI | Migración S1-1: UNIQUE compuesto `(tenant_id, …)` en los 3 índices |
| **2** | Auth Hook default `'zm-lash-nails'` si `profiles.tenant_id` NULL | Profile huérfano cae en tenant Vanessa | Quitar default; `profiles.tenant_id NOT NULL` |
| **3** | Webhook ZM sin `phone_number_id → tenant_id` | Bot `service_role` mezcla datos | Tabla `tenant_waba_numbers` + resolver al inicio del dispatch |

**Referencia:** [02-PLAN-retrofit-tenant-id.md](../02-PLAN-retrofit-tenant-id.md) §11

---

## 2. Bloqueadores adicionales (código / schema)

| # | Bloqueador | Riesgo | Archivos / tablas |
|---|-----------|--------|-------------------|
| **4** | `waba_config` UNIQUE global en `config_key` | 2.º tenant no puede tener mismas keys CMS; **rollback S3-8 sin S1-2 pisa fila ZM** | `waba_config`; migración S1-2 → `(tenant_id, config_key)`; seed `waba_tenant_routing_enabled` por tenant |
| **5** | `wa_action_debounce` PK `(phone, kind)` sin `tenant_id` | Locks/debounce colisionan | RPC `waba_claim_action_debounce`; `inbound-gate.ts` |
| **6** | RPCs WABA phone-only | Crons cruzan tenants | `waba_find_silent_phones`, `waba_find_quality_review_candidates`, … |
| **7** | ~20 Edge Functions sin filtro `tenant_id` | Nudges/recordatorios al tenant equivocado | `cart-nudge`, `silence-watchdog`, `ads-bounce-nudge`, `browse-reengage`, `appointment-reminders`, … |
| **8** | `tenant_id: "zm-lash-nails"` hardcodeado en inserts | Geema nunca recibe datos del bot | `whatsapp-webhook/lib/supabase.ts`, crons varios |
| **9** | Drizzle `@zm/shared-schema` desalineado | `db:push` puede romper prod | `packages/shared-schema/src/schema.ts` — falta `tenantId` en 23 tablas |
| **10** | Geema web/mobile sin `tenant_id` en queries | Owner tenant A ve datos de B | `geemastudio-web`, `geemastudio-mobile` — 0 usos grep |
| **11** | Modelo dual `tenants` vs `tenant_settings` | FKs incompatibles, doble seed | Ver [01-ESTADO-ACTUAL](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) §4 |
| **12** | `operational_expenses` RLS sin filtro tenant | Admin ZM ve gastos de otros tenants | Migración policies finanzas ejecutivas |
| **13** | Geema `/finanzas` web hardcode ZM | Marca ajena + datos mezclados | `geemastudio-web/src/app/finanzas/*` |

---

## 3. Riesgos si se conecta 2.º WABA sin cerrar P0

| Riesgo | Severidad |
|--------|-----------|
| Data leak cross-tenant vía webhook | 🔴 Crítico |
| INSERT `clients` falla por UNIQUE | 🔴 Crítico |
| `waba_config` conflict al seed Geema | 🟠 Alto |
| Crons envían nudge al teléfono/tenant equivocado | 🟠 Alto |
| Drizzle drift → migración accidental | 🟠 Alto |

---

## 4. Checklist pre–2.º tenant (DoD técnico)

- [x] Migración uniques `clients` + `waba_config` + `wa_action_debounce` (S1-1/S1-2/S1-3 prod)
- [x] Tabla `tenant_waba_numbers` + seed número ZM actual (S1-4 prod)
- [ ] Auth Hook endurecido + `profiles.tenant_id NOT NULL`
- [ ] Bridge `tenants` ↔ `tenant_settings` (decisión de modelo)
- [ ] `loadWabaConfig(supabase, tenantId)` + `loadCatalog` filtrado
- [ ] Thread `tenantId` en `whatsapp-webhook` (index → dispatcher → supabase)
- [ ] Crons actualizados con `tenant_id` o loop por tenant
- [ ] RPCs SQL tenant-aware
- [ ] Drizzle alineado con prod
- [ ] Geema mobile/web: queries con RLS o `.eq('tenant_id')` explícito
- [ ] Smoke QA: 2 tenants, mismo teléfono en tenants distintos OK
- [ ] Re-login staff tras cambio Auth Hook

---

## 5. Qué NO bloquea (pero es deuda)

- Portafolio visual Geema
- Promo broadcast masiva
- Panel web agenda/clientas (si mobile es canónico)
- Finanzas ejecutivas en Geema
- Expo 54 vs 56 gap

---

## Siguiente documento

[03-WABA-SUITE-ESTANDARIZACION.md](./03-WABA-SUITE-ESTANDARIZACION.md)
