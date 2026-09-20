# 05 — ADR: Modelo tenant unificado (bridge)

**Fecha:** 2026-08-29  
**Estado:** Aceptado  
**Sprint:** S2 (Plan 05)

---

## Contexto

ZM Lash (Plan 02) usa `tenants.id` **text** (`zm-lash-nails`) en 27 tablas operativas + JWT `tenant_id`.  
GeemaStudio usa `tenant_settings.id` **UUID** para onboarding, presets, landing `/s/[slug]` y config WABA futura.

Ambos repos comparten **una BD** (`udelxwwnyivknslueerr`). Sin puente, cada feature nueva duplica seeds o colisiona FKs.

---

## Decisión

**Mantener `tenants.id` (text slug) como PK de negocio canónica** para datos operativos (citas, clientes, WABA runtime ZM, RLS panel).

**Añadir `tenant_settings`** (UUID) como capa de **config extendida Geema**, enlazada por:

```sql
tenant_settings.tenant_slug text NOT NULL UNIQUE REFERENCES tenants(id)
```

| Rol                      | Tabla                         | PK                | Uso                                                                 |
| ------------------------ | ----------------------------- | ----------------- | ------------------------------------------------------------------- |
| Aislamiento operativo    | `tenants`                     | `text`            | `profiles.tenant_id`, `clients`, `appointments`, `waba_config`, JWT |
| Config SaaS / onboarding | `tenant_settings`             | `uuid`            | Horarios UI, terminología, landing, WABA tokens Geema (futuro)      |
| Puente                   | `tenant_settings.tenant_slug` | FK → `tenants.id` | 1:1 por negocio                                                     |

**Reglas:**

1. ZM sigue leyendo/escribiendo `tenant_id text` — sin cambio en webhook hasta S3.
2. Geema onboarding crea fila en `tenants` + `tenant_settings` con mismo slug.
3. Resolución WABA S3+: `phone_number_id → tenant_waba_numbers.tenant_id (text)`; opcional join a `tenant_settings` para presets L4.
4. No migrar columnas operativas de `text` a `UUID` — costo alto, cero beneficio corto plazo.

---

## Consecuencias

### Positivas

- ZM prod intacto; Geema puede onboardear con UUID sin romper Plan 02.
- Seed ZM: una fila `tenant_settings` mapeada a `zm-lash-nails`.
- Path claro a S3–S6 (webhook parametrizado + presets).

### Negativas / deuda

- Dos IDs por tenant (slug + UUID) — documentar en runbook onboarding S7.
- Geema mobile/web deben filtrar por JWT `tenant_id` (text) **o** resolver UUID vía `tenant_slug` (S2+ en zm-tech).
- `@zm/shared-schema` y `@geemastudio/shared-schema` convergen gradualmente (S2-4 largo plazo).

---

## Alternativas descartadas

| Opción                                          | Por qué no                                             |
| ----------------------------------------------- | ------------------------------------------------------ |
| Reemplazar `tenants.text` por UUID en 27 tablas | Migración masiva; riesgo prod Vanessa                  |
| Solo `tenant_settings` sin `tenants`            | Plan 02 A/B/C ya en prod con text PK                   |
| Status quo sin `tenant_settings` en BD ZM       | Geema no puede persistir onboarding en shared Supabase |

---

## Referencias

- [01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) §4
- [02-PLAN-retrofit-tenant-id.md](../02-PLAN-retrofit-tenant-id.md)
- Geema schema: `zm-tech/packages/shared-schema/src/schema.ts` → `tenantSettings`

---

## Addendum 30-ago 2026 — País y zona horaria

### País: sin tabla `countries` (por ahora)

**Decisión:** clasificar tenants con `tenant_settings.country` (ISO 3166-1 alpha-2, ej. `PE`). No crear catálogo `countries` hasta onboarding multi-país o defaults compartidos entre muchos tenants.

| Necesidad                                    | Dónde                                                       |
| -------------------------------------------- | ----------------------------------------------------------- |
| Etiqueta / filtro admin                      | `tenant_settings.country`                                   |
| TZ + moneda del local                        | `timezone`, `currency_code`, `currency_symbol` (misma fila) |
| Defaults al crear tenant                     | presets `@zmtech/tenant-config` + defaults de columna       |
| Reglas gordas (feriados, impuestos, RUC/RUT) | Futuro: pack por país en código/JSON — no bloquear hoy      |

**No** añadir `country_id` a `appointments` / `clients` (se deriva del tenant).  
**Diferido:** tabla `countries` + FK; particionamiento por país; `CHECK` ISO (opcional cuando haya 2.º país).

### Citas: wallclock del tenant ≠ “todo UTC”

| Columna / uso                                | Semántica                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `appointments.date`                          | `timestamp without time zone` = **hora de pared** en IANA del tenant (`America/Lima` para ZM). No interpretar como UTC. |
| `reference_received_at`, verifications, etc. | `timestamptz` → instante absoluto (UTC en almacenamiento).                                                              |

Al expandir a otro país: cada tenant escribe wallclock en **su** timezone configurado; el cliente convierte con `tenant_settings.timezone`, no con el TZ del teléfono del dueño.

Detalle operativo Geema: [07-PARIDAD-MOBILE-ZM.md](./07-PARIDAD-MOBILE-ZM.md) § Timezone / Schema canónico.
