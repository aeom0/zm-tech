# 03-PLAN — OdentalPro: Apps Dedicadas + Supabase Nativo Multi-Tenant

> Continuación de `00-README-orden-ejecucion`, `01-PLAN-monorepo-estructura`, `02-PLAN-supabase-multitenant-retrofit`.
> Este plan **reemplaza** la sección 3 y 12 de `ODENTALPRO_KNOWLEDGE.md` (que proponía preset compartido).
> Decisión confirmada 23-jul-2026: OdentalPro corre en **apps dedicadas** dentro del monorepo `zm-tech`, con **Supabase propio** construido multi-tenant desde el día 0 (no hay retrofit que arrastrar — esa es la ventaja de empezar limpio).

---

## 0. Decisión de arquitectura — qué cambia vs el doc original

| | GeemaStudio (heredado) | OdentalPro (nuevo) |
|---|---|---|
| Apps | `apps/geemastudio-web`, `apps/geemastudio-mobile` | `apps/odentalpro-web`, `apps/odentalpro-mobile` |
| Supabase project | `udelxwwnyivknslueerr` (retrofit pendiente) | **Reutiliza el proyecto de ZM Tech landing** (`llacowjutjfefboqgfnj`) temporalmente — migración a proyecto propio antes de producción real (ver sección 2) |
| `tenant-config` preset | multi-businessType (`hair-salon`, `barbershop`, `spa-nails`) | un solo preset fijo: `dental-clinic` — no necesita switch de terminología |
| Server/Edge Functions | `apps/geemastudio-server` | `apps/odentalpro-server` (WABA bot, notif, cron) |

**Por qué apps dedicadas y no preset compartido:** un solo vertical dental no necesita el mecanismo de terminología dinámica (`staff→Especialistas`, `client→Paciente`, etc.) porque nunca cambia de tipo de negocio. Meterlo dentro de GeemaStudio-web hubiera significado cargar lógica condicional de un vertical ajeno en cada pantalla. Apps separadas = bundles más limpios, menos ramas condicionales, deploy independiente en Vercel/EAS.

**Qué SÍ se comparte** (vía `packages/`):
- `packages/ui` — Lunaris design tokens + primitivos (Button, Input, Card, BottomSheet) — visual DNA de marca ZM Tech, tema por vertical vía CSS vars/theme object.
- `packages/tenant-config` — el *mecanismo* de tenant isolation (`TenantContext`, `useTenant()`, RLS helpers) se reutiliza; el *preset* de Odental vive ahí pero es fijo.
- Convenciones: ESLint 9, TS strict, Turborepo pipeline, mismo patrón de Edge Functions.

**Qué NO se comparte:** schema de datos (Odental tiene su propio Supabase project → su propio `packages/dental-schema` con Drizzle+Zod, sin acoplarse al schema de belleza).

---

## 1. Estructura de carpetas nueva

```
zm-tech/
├── apps/
│   ├── landing/                    ← existente
│   ├── geemastudio-web/            ← existente
│   ├── geemastudio-mobile/         ← existente
│   ├── geemastudio-server/         ← existente
│   ├── odentalpro-web/             ← NUEVO (Next.js App Router, port 3002)
│   ├── odentalpro-mobile/          ← NUEVO (Expo SDK 56, RN 0.85.3, React 19.2.3)
│   └── odentalpro-server/          ← NUEVO (Supabase Edge Functions: WABA, notif, cron)
│
├── packages/
│   ├── ui/                         ← existente, EXTENDER con theme dental
│   ├── tenant-config/              ← existente, AGREGAR preset dental-clinic (fijo)
│   ├── shared-schema/              ← existente (GeemaStudio, no tocar)
│   └── dental-schema/              ← NUEVO — Drizzle + Zod, propio de OdentalPro
```

**Apps móvil — módulos exclusivos dentro de `apps/odentalpro-mobile`:**
```
apps/odentalpro-mobile/screens/
  ├── agenda/                     ← adaptado del patrón GeemaStudio (mismo componente base vía packages/ui)
  ├── patients/                   ← "clients" → "patients" nativo, sin capa de terminología dinámica
  ├── odontogram/
  │   ├── OdontogramView.tsx      ← SVG puro, RN + web share el mismo componente
  │   ├── ToothComponent.tsx
  │   └── types.ts
  ├── clinical-records/
  │   ├── ClinicalRecordScreen.tsx
  │   ├── ClinicalHistoryList.tsx
  │   └── hooks/useClinicalRecords.ts
  ├── treatment-plans/
  │   ├── TreatmentPlanScreen.tsx
  │   ├── TreatmentPlanCard.tsx
  │   └── hooks/useTreatmentPlans.ts
  └── consent-forms/
      ├── ConsentFormScreen.tsx
      └── templates/
```

---

## 2. Supabase — proyecto compartido (temporal) con la landing, schema nativo multi-tenant

**Corrección 23-jul-2026:** en vez de crear proyecto nuevo, OdentalPro corre por ahora dentro del proyecto **`llacowjutjfefboqgfnj`** (el mismo de ZM Tech landing, que hoy solo tiene la tabla `contacts` para el formulario de contacto). Esto reduce fricción y costo mientras OdentalPro está en fase de construcción/validación — no hay urgencia de pagar un proyecto Pro aparte para un producto que todavía no tiene tenant #1.

**Plan de migración futura (regístralo como deuda técnica, no lo olvides):**
- [ ] Antes de aceptar el primer cliente real (tenant #1 de Odental) pagando, migrar todas las tablas `odental_*` a un proyecto Supabase independiente.
- [ ] Migración vía `pg_dump`/`pg_restore` o Supabase's propio branching-to-new-project flow — nunca a mano.
- [ ] Razón: aislar blast radius (un incidente de RLS o performance en Odental no debe poder tocar el formulario de contacto de la landing, y viceversa), y porque facturación/billing de Supabase se vuelve más limpia por producto cuando factures a clientes.

**Convención de naming obligatoria mientras se comparte el proyecto:** todas las tablas de OdentalPro llevan el prefijo `odental_` para que no se puedan confundir con `contacts` ni con nada que agregues después a la landing. Ningún nombre de tabla sin prefijo en este proyecto a partir de ahora.

**Sobre branching:** verifica primero si `llacowjutjfefboqgfnj` está en un plan que soporte Supabase branching (Pro o superior). Si está en Free tier, no hay branching disponible — en ese caso, prueba las migraciones en una base de datos Supabase local (`supabase start` con Docker) antes de aplicar contra este proyecto, ya que es el mismo que sirve la landing en producción y no querrás tumbar el formulario de contacto por un `DROP` mal puesto.

### Schema base (tenant_id nativo desde migración 001, prefijo `odental_`, no hay legacy que arrastrar)

Ver SQL completo en el cuerpo original del plan (001_init_core.sql / 002_clinical.sql). Aplicar solo en Fase 1.

**Regla no negociable (aprendida en carne propia con GeemaStudio):** todo esto se prueba primero en un **branch de Supabase** antes de tocar main, aunque sea proyecto nuevo — el hábito se mantiene para cuando entre el tenant #1 real con datos de pacientes.

---

## 3. Odontograma — spec técnica (el módulo diferenciador)

- SVG puro, sin librerías externas (`react-native-svg` en mobile, SVG nativo en web) — mismo componente, mismo archivo de tipos.
- 32 dientes, numeración FDI: `11-18, 21-28, 31-38, 41-48`.
- Estados: `healthy | treated | to-treat | extracted | implant | crown | root-canal`.
- 5 superficies clickeables por diente: `mesial | distal | occlusal | buccal | palatal`.
- Persistencia: JSONB en `clinical_records.odontogram`, snapshot por visita.

Tipos en `packages/dental-schema/src/odontogram.ts`.

**Regla de ejecución:** render-first-then-push — aprueba visualmente el SVG del odontograma antes de integrarlo con `clinical_records`.

---

## 4. Fases de ejecución

### Fase 0 — Scaffold del monorepo
- [x] `apps/odentalpro-web`: Next.js App Router, TS strict, Tailwind v4, mobile-first (port 3002)
- [x] `apps/odentalpro-mobile`: Expo SDK 56, RN 0.85.3, React 19.2.3
- [x] `apps/odentalpro-server`: Edge Functions base (auth webhook, healthcheck)
- [x] `packages/dental-schema`: Drizzle + Zod + tipos odontograma
- [x] Turborepo pipeline / scripts root

### Fase 1 — Supabase + Auth
- [x] Verificar schema `odental_*` en `llacowjutjfefboqgfnj` + migraciones 003/004 (auth_user_id, RLS helper)
- [x] Auth: roles `dev | dentist-owner | assistant | specialist`, JWT/`app_metadata` + `odental_employees`
- [x] `TenantContext` + `useTenant()` en `packages/tenant-config/odental` (preset fijo dental-clinic)

### Fase 2 — Odontograma
- [x] `OdontogramView.tsx` + `ToothComponent.tsx` — render-first, sin persistencia
- [x] Modo solo-lectura vs editable — `PatientDetailScreen` (solo lectura por defecto, botón "Nueva consulta" habilita edición; editable automático si ya hay consulta abierta el mismo día)
- [x] Persistencia en `clinical_records.odontogram` — `useClinicalRecords().saveOdontogram` (insert si no hay consulta del día, update si ya existe; `activeRecordId` local evita doble insert antes del refetch)

### Fase 3 — Historia clínica
- [x] Navegación mínima: `RootNavigator` (AuthGate → `PatientsListScreen` → `PatientDetailScreen`), `QueryClientProvider` wireado en `App.tsx`
- [x] `useClinicalRecords` — primer hook de `odental_clinical_records`, listo para extenderse con motivo de consulta/diagnóstico
- [ ] `ClinicalRecordScreen` — nueva consulta (motivo, diagnóstico, tratamiento realizado)
- [ ] `ClinicalHistoryList` — listado de visitas en la ficha del paciente
### Fase 4 — Planes de tratamiento
### Fase 5 — Consentimientos + PDF
### Fase 6 — Beta con tenant #1

---

## 5. Deuda técnica (día 1)

| ID | Descripción | Prioridad |
|---|---|---|
| DT-OD01 | Facturación electrónica por país (SUNAT, SAT, DIAN, SRI) — NO en fase 1 | Media, v1.1 |
| DT-OD02 | DICOM básico para radiografías digitales | Baja, post-beta |
| DT-OD03 | Periodontograma (complemento al odontograma) | Media, v1.1 |
| DT-OD04 | Portal del paciente web (ver su propio historial) | Alta, v1.2 |
| DT-OD05 | Migrar tablas `odental_*` a proyecto Supabase independiente antes del tenant #1 pagando | Alta, pre-prod |

---

*ZM Tech · Alberto Ortas · 2026 — documento vivo. Fase 0 marcada [x] el 23-jul-2026.*
