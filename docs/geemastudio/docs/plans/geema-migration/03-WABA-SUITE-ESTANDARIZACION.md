# 03 — Suite WABA: estandarización multi-vertical

**Fecha:** 2026-08-28  
**Alcance:** Barberías, peluquerías, spas, salones de belleza — reutilizar motor ZM sin copy/reglas de Vanessa.

---

## 1. Tesis

El WABA de ZM es **~80% motor genérico** (L1) y **~70% reglas ZM** (L3–L4). La suite productizable no requiere reescribir el dispatcher — requiere **cablear tenant** y **externalizar reglas** a config + presets.

---

## 2. Capas de abstracción

```
┌─────────────────────────────────────────────────────────────┐
│ L4 — Presets verticales                                      │
│ CTWA rubros, subcategorías virtuales, expertise Haiku        │
│ Fuente: @zmtech/tenant-config (businessType)                 │
└───────────────────────────┬─────────────────────────────────┘
┌───────────────────────────▼─────────────────────────────────┐
│ L3 — Reglas de negocio por tenant (JSON/BD)                  │
│ horarios, depósito, capacidad, staff↔categoría, feriados     │
└───────────────────────────┬─────────────────────────────────┘
┌───────────────────────────▼─────────────────────────────────┐
│ L2 — Contenido CMS                                           │
│ waba_config, catálogo, portafolio, plantillas Meta            │
└───────────────────────────┬─────────────────────────────────┘
┌───────────────────────────▼─────────────────────────────────┐
│ L1 — Motor WABA (código compartido)                          │
│ webhook, carrito, booking, payment, Haiku shell, crons, panel │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Matriz configurabilidad

### Ya configurable (L2 — con fix tenant)

| Dominio | Mecanismo | Panel |
|---------|-----------|-------|
| Copy campañas CTWA | `waba_config` | `/panel/waba/campanas` |
| Prompts Haiku | `haiku_system_prompt`, `haiku_settings` | `/panel/waba/haiku` |
| Depósito fijo / instrucciones | `deposit_fixed_*` | Contenido bot |
| Catálogo, precios, packs | Tablas `services`, `packs`, … | App + `/servicios` |
| Portafolio | `service_portfolio_images` | `/panel/waba/portafolio` |
| Bloqueados | `blocked_phone_numbers` | Haiku config |

**Bug actual:** `waba_config` UNIQUE global + `loadWabaConfig()` sin `tenant_id`.

### Hardcodeado hoy (mover a L3/L4)

| Dominio | Ubicación actual | Destino propuesto |
|---------|------------------|-------------------|
| `EMPLOYEE_CATEGORIES` | `constants.ts` | Tabla `employee_category_assignments` o JSON tenant |
| Horarios / slots | `constants.ts` | `tenant_settings.businessHours` + reglas slot |
| Capacidad (tope 1/2, carriles) | `agenda.ts`, `WABA_CAPACITY.md` | `tenant_waba_rules.capacity` |
| CTWA interés (Ext/Lift/Uñas/Otro) | `dispatcher.ts` | Preset L4 por `businessType` |
| Subcategorías virtuales uñas/ext | `menu.ts` | `service_categories.metadata` |
| Feriados PE seed | `peru-holidays.ts` | `salon_holidays` por tenant |
| Pagos / ubicación ZM | `constants.ts`, `salon-location.ts` | `tenant_settings.contact` + CMS |
| Expertise Haiku uñas/pestañas | `haiku-cms-defaults.ts` | Defaults por `businessType` |
| Plantillas Meta `*_zm` | varios handlers | `tenant_message_templates` |
| `ADMIN_PHONE`, secrets Meta | env + constants | `tenant_waba_numbers` + vault por tenant |

---

## 4. Presets por vertical (`tenant-config`)

| `businessType` | CTWA interés sugerido | Capacidad típica | Terminología |
|----------------|----------------------|------------------|--------------|
| `spa-nails` (ZM) | Extensiones / Lifting / Uñas / Otro | Tope 1–2, carriles especialistas | Srta., clienta |
| `barbershop` | Corte / Barba / Combo / Otro | Por silla o barbero | Cliente, turno |
| `hair-salon` | Corte / Color / Tratamiento / Otro | Por estilista | Clienta, cita |
| `full-aesthetic` | Servicios / Promos / Otro | Mixto configurable | Especialista |

Archivos: `zm-tech/packages/tenant-config/src/presets/{spa-nails,barbershop,hair-salon,full-aesthetic}.ts`

**Trabajo:** nuevo módulo `waba-preset-loader.ts` en webhook que merge preset L4 + overrides L2 CMS.

---

## 5. Interfaz propuesta `TenantWabaRules` (L3)

```typescript
interface TenantWabaRules {
  timezone: string;
  schedule: {
    weekday: { open: string; close: string };
    sunday?: { open: string; close: string };
    slotMinutes: number[];
  };
  deposit: {
    fixedAmount?: number;
    sundayRate?: number;
    requiresHistoryForRate: boolean;
  };
  capacity: {
    defaultCap: number;
    specialCap?: number;
    lanes?: Array<{
      employeeIds: string[];
      serviceIds?: string[];
      afterHour?: number;
    }>;
  };
  staffByCategory: Record<string, string[]>;
  ctwaInterestOptions?: Array<{
    id: string;
    label: string;
    categoryIds: string[];
  }>;
  coordinationPhone: string;
  paymentMethodsText: string;
}
```

Almacenamiento: columna JSONB en `tenant_settings` o keys estructuradas en `waba_config`.

---

## 6. Prioridades suite (orden de implementación)

| P | Item | Capa | Esfuerzo |
|---|------|------|----------|
| P0 | Routing `phone_number_id → tenant_id` | L1 | M |
| P0 | `waba_config` por tenant | L2 | M |
| P0 | Catálogo + sesiones filtradas | L1 | M |
| P1 | Externalizar `constants.ts` → `TenantWabaRules` | L3 | L |
| P1 | Capacidad genérica (sin UUIDs ZM) | L3 | M |
| P1 | CTWA interest desde preset | L4 | M |
| P1 | Haiku defaults por `businessType` | L4 | M |
| P2 | Subcategorías en BD | L4 | M |
| P2 | Plantillas Meta por tenant | L2 | M |
| P2 | Feature flags (`features.whatsapp`, depósito on/off) | L3 | S |

---

## 7. Qué queda scoped solo a ZM (tenant `zm-lash-nails`)

No eliminar — mover a **config del tenant**, no al código compartido:

- Número 932, cuentas BCP/CCI ZM
- Dirección Las Plazuelas Surco, landmarks Kennedy/Amistad
- Empleadas Vanessa/Stephani y carriles Karelis
- Creativos CTWA Extensiones/Lifting, pack Manos+Pies S/90
- Plantillas `*_zm`, políticas post-cita por `cat-*`
- Meta Ads `act_2097809460557755`

---

## 8. Geema vs ZM — WABA hoy

| Capacidad | ZM | Geema server |
|-----------|-----|--------------|
| Routing multi-tenant | ❌ | ✅ `tenant-resolver.ts` |
| Dispatcher completo | ✅ ~2665 líneas | 🟡 ~1170 líneas |
| Crons (11) | ✅ | ❌ |
| Panel operativo | ✅ | ❌ |
| Consume `tenant-config` | ❌ | ❌ (solo mobile UI) |

**Estrategia:** portar **código ZM** + **routing Geema** = suite base.

---

## Referencias

- `docs/waba/WABA_CAPACITY.md` — modelo capacidad ZM (generalizar)
- `zm-tech/docs/geemastudio/docs/WABA_MULTITENANT_ARCHITECTURE.md` — diseño Geema
- `docs/plans/04-PLAN-ctwa-collages-cierre-intencion.md` — CTWA belleza (preset `spa-nails`)

---

## Siguiente documento

[04-ROADMAP-SPRINTS.md](./04-ROADMAP-SPRINTS.md)
