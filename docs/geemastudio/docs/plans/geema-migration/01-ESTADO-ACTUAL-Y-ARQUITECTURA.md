# 01 — Estado actual y arquitectura

**Fecha:** 2026-08-28

---

## 1. Contexto de negocio

| Concepto            | Realidad hoy                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| **ZM Lash & Nails** | Salón de Vanessa en producción; app + bot WABA v3.6; tenant `zm-lash-nails`  |
| **GeemaStudio**     | Producto SaaS para vender a salones, barberías, peluquerías (LATAM)          |
| **Base de datos**   | **Una sola:** Supabase `udelxwwnyivknslueerr` — no hay BD separada `geema_*` |
| **Código**          | **Dos repos:** `ZM-Lash-and-Nails-Beauty` (prod ZM) + `zm-tech` (Geema apps) |

ZM no es “cliente futuro de Geema” — **ya es tenant #1**. El trabajo es hacer que Geema sea la plataforma que escala sin romper Vanessa.

---

## 2. Diagrama de arquitectura actual

```
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase udelxwwnyivknslueerr                 │
│  tenants (zm-lash-nails) │ tenant_settings (UUID demos Geema)   │
│  27 tablas tenant_id     │ waba_config (UNIQUE global ⚠️)        │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
    ┌───────────▼──────────┐      ┌───────────▼──────────┐
    │ ZM-Lash-and-Nails      │      │ zm-tech / GeemaStudio │
    │ apps/mobile + web      │      │ geemastudio-*         │
    │ ~20 Edge Functions     │      │ 2 Edge Functions      │
    │ WABA v3.6 completo     │      │ WABA ~30% + routing ✅ │
    │ tenant_id hardcode bot │      │ 0 tenant_id en UI ⚠️  │
    └───────────────────────┘      └───────────────────────┘
```

---

## 3. Plan 02 — qué ya está hecho

| Fase  | Entregable                                                             | Estado             |
| ----- | ---------------------------------------------------------------------- | ------------------ |
| **A** | `tenant_id` en 27 tablas + backfill                                    | ✅ Prod 2026-08-07 |
| **B** | PK `(tenant_id, phone)` en `whatsapp_sessions` + upserts Edge          | ✅                 |
| **C** | Tabla `tenants`, `current_tenant_id()`, Auth Hook JWT, 66 RLS policies | ✅                 |

**Efecto:** el **panel** (mobile/web ZM con JWT) ya aísla por tenant. El **bot WABA** usa `service_role` y **bypassea RLS** — sigue operando como single-tenant en código.

Detalle: [02-PLAN-retrofit-tenant-id.md](../../02-PLAN-retrofit-tenant-id.md)

---

## 4. Dos modelos de tenant (tensión #1)

| Aspecto                 | ZM (Plan 02)                                 | Geema                                                                   |
| ----------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| **ID de negocio**       | `text` → `tenants.id` (`zm-lash-nails`)      | `UUID` → `tenant_settings.id`                                           |
| **Config**              | `waba_config` key-value + hardcode en código | Columnas en `tenant_settings` (token WABA, horarios, colores)           |
| **Staff**               | Varios `profiles` con mismo `tenant_id`      | 1 owner auth user = 1 fila `tenant_settings`                            |
| **Aislamiento en apps** | RLS + JWT `tenant_id`                        | Solo webhook scopea; **grep `tenant_id` en geemastudio-web/mobile = 0** |
| **WABA routing**        | ❌ No implementado en repo ZM                | ✅ `resolveTenantFromPhoneNumberId()` en geemastudio-server             |

**Sin puente** entre modelos, cada feature nueva se duplica o colisiona en la misma BD.

**Propuesta (pendiente decisión):** `tenants` (slug text) como PK de negocio + `tenant_settings.tenant_slug → tenants.id` para config extendida.

---

## 5. Paridad funcional (Audit 03 — ago 2026)

Fuente: `zm-tech/docs/audit/03-AUDIT-paridad-zmlash-geema.md`

| Módulo                     | ZM                        | Geema                          |
| -------------------------- | ------------------------- | ------------------------------ |
| Agenda mobile              | ✅ grid 30 min, capacidad | ✅ sin capacidad global WABA   |
| Servicios / packs / promos | ✅                        | ✅                             |
| Inventario                 | ✅                        | ✅ mobile; ❌ web              |
| Finanzas                   | 🟡 (+ ejecutivo ZM)       | 🟡 web = copia ZM hardcodeada  |
| WABA bot                   | ✅ v3.6                   | 🟡 webhook básico multi-tenant |
| Crons WABA (11 jobs)       | ✅                        | ❌                             |
| Panel `/panel/waba/*`      | ✅ 6 rutas                | ❌                             |
| Promo masiva WA            | ✅                        | ❌                             |
| Portafolio + Vision pago   | ✅                        | ❌                             |
| Push FCM E2E               | ✅                        | 🟡 token descartado en mobile  |
| Onboarding self-service    | ❌                        | ✅ 6 pasos                     |
| Landings `/s/[slug]`       | ❌                        | ✅                             |
| `@zmtech/tenant-config`    | ❌                        | ✅ 4 `businessType`            |

---

## 6. GeemaStudio — stack por app

| App        | Path                              | Stack                       | Rol                          |
| ---------- | --------------------------------- | --------------------------- | ---------------------------- |
| **mobile** | `zm-tech/apps/geemastudio-mobile` | Expo ~56, RN 0.85, React 19 | Gestión salón + onboarding   |
| **web**    | `zm-tech/apps/geemastudio-web`    | Next 15, Tailwind           | SaaS landing + panel parcial |
| **server** | `zm-tech/apps/geemastudio-server` | Drizzle, 2 Edge Functions   | DB ops + webhook WABA        |

**ZM monorepo:** Expo ~54, RN 0.81; Yarn 4; schema `@zm/shared-schema` (~8× más grande que `@geemastudio/shared-schema`).

---

## 7. Presets multi-vertical (ya existentes)

Paquete: `zm-tech/packages/tenant-config`

```typescript
businessType: 'spa-nails' | 'barbershop' | 'hair-salon' | 'full-aesthetic'
```

Incluye: terminología (`chicas` / `barberos` / `estilistas`), horarios default, categorías de servicio, tema, comisiones.

**Gap:** el webhook WABA **no lee** `tenant-config` — solo Geema mobile UI.

---

## 8. Opciones de convergencia

| Opción | Descripción                                     | Pros                         | Contras                            |
| ------ | ----------------------------------------------- | ---------------------------- | ---------------------------------- |
| **A**  | ZM canónico WABA → portar a Geema parametrizado | No rompe prod Vanessa        | Trabajo grande en webhook ZM       |
| **B**  | Geema canónico; ZM → apps zm-tech               | Un solo monorepo largo plazo | Alto riesgo corto plazo            |
| **C**  | Status quo dual                                 | Cero esfuerzo inmediato      | Migraciones divergentes, data leak |

**Recomendación:** Opción A (ver [00-RESUMEN-EJECUTIVO.md](./00-RESUMEN-EJECUTIVO.md)).

---

## Siguiente documento

[02-BLOQUEADORES-MULTI-TENANT.md](./02-BLOQUEADORES-MULTI-TENANT.md)
