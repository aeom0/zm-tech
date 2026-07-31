# ROADMAP — OdentalPro

SaaS multi-tenant para **clínicas dentales** (apps dedicadas en el monorepo zm-tech).  
Apps: `odentalpro-web`, `odentalpro-mobile`, `odentalpro-server` · Package: `@odentalpro/dental-schema`

El detalle de cambios ya hechos vive en [CHANGELOG.md](./CHANGELOG.md). Plan de arquitectura: [03-PLAN-odentalpro-apps-dedicadas.md](./03-PLAN-odentalpro-apps-dedicadas.md).

---

## Objetivo

Llegar a una beta usable con **tenant #1**, con odontograma e historia clínica como diferenciadores, sin acoplar schema ni apps a GeemaStudio.

---

## Estado (jul 2026)

### Completado

| Fase                    | Qué                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| **0 — Scaffold**        | Apps web/mobile/server + `dental-schema` + pipeline Turborepo                                            |
| **1 — Supabase + Auth** | Tablas `odental_*` en proyecto compartido temporal (`llacowjutjfefboqgfnj`), roles, TenantContext dental |
| **2 — Odontograma**     | SVG FDI, modo lectura/edición, persistencia en `odental_clinical_records.odontogram`                     |
| **3 — parcial**         | Navegación pacientes + `useClinicalRecords`; falta pantalla de nueva consulta y listado de visitas       |

También: sistema visual Sterile Aqua, diseños `.pen` por flujo, lista/ficha de paciente en mobile.

### Deuda pre-producción (no olvidar)

- **DT-OD05:** migrar `odental_*` a proyecto Supabase propio **antes** del primer cliente pagando (aislar blast radius de la landing).

---

## Próximo (orden del plan 03)

1. **Fase 3 — Historia clínica (cerrar)**  
   `ClinicalRecordScreen` (motivo, diagnóstico, tratamiento) + `ClinicalHistoryList` en ficha del paciente.

2. **Fase 4 — Planes de tratamiento**

3. **Fase 5 — Consentimientos + PDF**

4. **Fase 6 — Beta tenant #1**  
   Incluye validación E2E auth/agenda clínica y migración Supabase (DT-OD05) si hay cliente real pagando.

### Backlog post-beta (deuda documentada)

| ID      | Tema                             | Cuándo    |
| ------- | -------------------------------- | --------- |
| DT-OD01 | Facturación electrónica por país | v1.1      |
| DT-OD02 | DICOM radiografías               | post-beta |
| DT-OD03 | Periodontograma                  | v1.1      |
| DT-OD04 | Portal del paciente web          | v1.2      |

---

## Enlaces

| Doc                                                                                    | Uso                                    |
| -------------------------------------------------------------------------------------- | -------------------------------------- |
| [CHANGELOG.md](./CHANGELOG.md)                                                         | Historial de cambios                   |
| [03-PLAN-odentalpro-apps-dedicadas.md](./03-PLAN-odentalpro-apps-dedicadas.md)         | Arquitectura y fases detalladas        |
| [ODENTALPRO_KNOWLEDGE.md](./ODENTALPRO_KNOWLEDGE.md)                                   | Conocimiento de producto               |
| [01-PLAN-monorepo-estructura.md](./01-PLAN-monorepo-estructura.md)                     | Estructura monorepo                    |
| [02-PLAN-supabase-multitenant-retrofit.md](./02-PLAN-supabase-multitenant-retrofit.md) | Contexto Supabase (legado de decisión) |
