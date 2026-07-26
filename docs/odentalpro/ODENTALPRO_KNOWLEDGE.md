# OdentalPro — Knowledge Base & Launch Guide
> **Documento vivo** · Generado: abril 2026 · Autor: ZM Tech / Alberto Ortas  
> **Propósito**: Guía de referencia completa para lanzar OdentalPro después del beta de SalonPro.  
> Leer antes de escribir una sola línea de código del nuevo vertical.

> ⚠️ **Nota de alineación (23-jul-2026)**: las **secciones 3 y 12** de este documento (preset compartido `dental-clinic` dentro del monorepo de SalonPro, módulos dentro de `apps/mobile/screens/dental/`) están **reemplazadas** por [`03-PLAN-odentalpro-apps-dedicadas.md`](03-PLAN-odentalpro-apps-dedicadas.md): la decisión final fue **apps dedicadas** (`apps/odentalpro-*`) con Supabase propio, no un preset más de `tenant-config`. El resto del documento (visión, competencia, módulos clínicos, pricing, deuda técnica, KPIs) sigue vigente como referencia. También: **"SalonPro"** en este documento es el nombre antiguo del producto hoy llamado **GeemaStudio**.

---

## 1. Visión del producto

**OdentalPro** es el segundo vertical de la plataforma ZM Tech — un SaaS B2B mobile-first para odontólogos, ortodoncistas y clínicas dentales pequeñas y medianas en LATAM.

**Propuesta de valor central:**
> "El software dental que el odontólogo realmente usa — desde el celular, en 5 minutos, sin demos, sin vendedores."

**Problema real validado:** La mayoría de odontólogos y ortodoncistas en LATAM (especialmente en mercados como Venezuela, Ecuador, Bolivia, Paraguay) llevan pacientes en cuadernos o WhatsApp informal. Los softwares existentes son caros, requieren demos para ver precios, y sus apps móviles son versiones recortadas de su web.

---

## 2. Análisis competitivo — estado al 2025

### Jugadores principales en LATAM

| Producto | Origen | Fortaleza | Debilidad clave | Riesgo para nosotros |
|---|---|---|---|---|
| **Dentalink** | Chile | Odontograma + ortodoncia + seguros | Sin precio público, solo CL/CO/MX, requiere demo | Medio — mercado fragmentado |
| **Doctocliq** | Perú | Freemium, app existe, interfaz moderna | App mobile muy inferior a su web (queja real de usuarios) | Alto — el más parecido a nosotros |
| **Dentidesk** | LATAM | Historia clínica avanzada, LATAM multi-país | App limitada, interfaz envejecida | Bajo |
| **Akeito** | España | IA avanzada, multi-especialidad | Enfocado a clínicas medianas/grandes, caro | Bajo |
| **xDentalCloud** | España | Completo, HIPAA/RGPD | Complejo, orientado a España, curva alta | Bajo |
| **Open Dental** | USA | Open source | Alta curva técnica, sin soporte LATAM | Nulo |

### La brecha real (no cubierta por ninguno)
1. **Mobile-first genuino** — ninguno fue diseñado primero para celular.
2. **WABA nativo integrado** — todos cobran el WhatsApp como add-on o lo omiten.
3. **Onboarding sin fricción** — todos requieren vendedor, demo o registro largo.
4. **Precio transparente y accesible** para consultorios pequeños en mercados de bajo poder adquisitivo.
5. **Cobertura real de toda LATAM** — Dentalink funciona bien solo en 3 países.

---

## 3. Arquitectura: qué se hereda de SalonPro

### Regla de oro
OdentalPro **es un preset nuevo** dentro del mismo monorepo de SalonPro. No es un fork, no es un repo separado. Es `businessType: 'dental-clinic'` con su propio `tenant-config` preset y tablas adicionales en Supabase.

### Lo que se reutiliza al 100%
- Auth Supabase + roles (`dev | owner | staff`) → en dental: `dev | dentist-owner | assistant | specialist`
- `TenantContext` + `useTenant()` — sin cambios
- Agenda con vista día/semana + columnas por profesional
- Módulo de clientes (pacientes) — base idéntica, se extiende
- Cobros + validación de pagos
- Finanzas + reportes
- Inventario (insumos dentales en lugar de productos de belleza)
- WABA bot multi-tenant (Edge Function PR-10)
- Push notifications FCM
- Design system Lunaris (con nuevo preset de colores para dental)
- Onboarding wizard (5-6 pasos, mismo patrón)
- Landing web por tenant (`/s/[slug]`)
- Multi-tenant infrastructure (Supabase RLS, `tenant_settings`)
- Web panel `/panel/*`

### Lo que cambia (terminología vía TenantConfig)

```typescript
// packages/tenant-config/src/presets/dental-clinic.ts
export const dentalClinicPreset: TenantConfig = {
  businessType: 'dental-clinic',
  terminology: {
    staff: 'Especialistas',           // "Chicas" en ZM → "Especialistas" en dental
    appointment: 'Consulta',          // "Cita" → "Consulta"
    client: 'Paciente',               // "Cliente" → "Paciente"
    clients: 'Pacientes',
    service: 'Tratamiento',           // "Servicio" → "Tratamiento"
    services: 'Tratamientos',
    inventory: 'Insumos',
    payment: 'Honorario',
  },
  locale: {
    currency: { code: 'USD', symbol: '$' }, // default, override por país
    timezone: 'America/Caracas',            // default Venezuela
    language: 'es',
  },
  features: {
    clinicalHistory: true,            // NUEVO — historia clínica
    odontogram: true,                 // NUEVO — odontograma SVG interactivo
    treatmentPlans: true,             // NUEVO — planes multi-sesión
    consentForms: true,               // NUEVO — consentimientos PDF
    xrayStorage: true,                // NUEVO — radiografías en Storage
    waba: true,
    inventory: true,
    finances: true,
  },
  theme: {
    primaryColor: '#1565C0',          // Azul dental profesional
    secondaryColor: '#0288D1',
    accentColor: '#00ACC1',           // Turquesa como accent
  },
};
```

---

## 4. Módulos nuevos — lo que SalonPro no tiene

### 4.1 Odontograma interactivo

**El módulo más icónico y diferenciador del vertical dental.**

- Componente SVG React Native + web (mismo código base)
- 32 dientes adultos (numeración FDI internacional: 11-18, 21-28, 31-38, 41-48)
- Estados por diente: `healthy | treated | to-treat | extracted | implant | crown | root-canal`
- Cada diente tiene 5 superficies clickeables: mesial, distal, oclusal/incisal, vestibular, palatino/lingual
- Colores por estado (verde=sano, azul=tratado, rojo=pendiente, gris=extraído)
- Almacenado en `dental_records.odontogram` como JSONB

```typescript
// Estructura del odontogram en JSONB
type OdontogramState = {
  [toothNumber: string]: {  // "11" | "12" ... "48"
    status: ToothStatus;
    surfaces: {
      mesial?: SurfaceStatus;
      distal?: SurfaceStatus;
      occlusal?: SurfaceStatus;
      buccal?: SurfaceStatus;
      palatal?: SurfaceStatus;
    };
    notes?: string;
    lastUpdated: string; // ISO
  };
};
```

**No usar librerías externas** — SVG puro, compatible con React Native SVG y web.

### 4.2 Historia clínica (`clinical_records`)

Tabla nueva en Supabase. Una fila por visita/consulta.

```sql
CREATE TABLE clinical_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant_settings(id),
  patient_id  UUID NOT NULL REFERENCES clients(id),
  appointment_id UUID REFERENCES appointments(id),
  dentist_id  UUID REFERENCES employees(id),
  visit_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
  chief_complaint TEXT,            -- motivo de consulta
  diagnosis   TEXT,
  treatment_performed TEXT,
  treatment_plan TEXT,
  observations TEXT,
  odontogram  JSONB,               -- snapshot del odontograma en esa visita
  attachments JSONB DEFAULT '[]',  -- [{url, type, name, uploaded_at}]
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
-- RLS: tenant_id isolation, dentist-owner ve todo, specialist ve sus propios
```

### 4.3 Planes de tratamiento (`treatment_plans`)

El concepto clave de la ortodoncia: el mismo paciente vuelve N veces para completar un tratamiento.

```sql
CREATE TABLE treatment_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant_settings(id),
  patient_id      UUID NOT NULL REFERENCES clients(id),
  dentist_id      UUID REFERENCES employees(id),
  name            TEXT NOT NULL,          -- "Ortodoncia metálica" | "Implante #36"
  total_sessions  INT,                    -- sesiones estimadas
  total_cost      NUMERIC(10,2),          -- costo total del plan
  amount_paid     NUMERIC(10,2) DEFAULT 0,
  status          TEXT DEFAULT 'active',  -- active | completed | abandoned
  start_date      DATE,
  estimated_end   DATE,
  notes           TEXT,
  sessions        JSONB DEFAULT '[]',     -- [{session_num, date, appointment_id, notes}]
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

**UI:** Barra de progreso visual (sesiones completadas / total). Indicador de deuda pendiente (costo - pagado). Próxima cita estimada.

### 4.4 Consentimientos informados

- Plantillas predefinidas por tipo de tratamiento (extracción, implante, ortodoncia, blanqueamiento)
- PDF generado con datos del paciente + firma digital (canvas touch en mobile)
- Guardado en Storage bucket `consent-forms/{tenant_id}/{patient_id}/`
- Columna `consent_signed_at` en `clinical_records`

### 4.5 Storage de imágenes clínicas

Bucket `clinical-images/{tenant_id}/{patient_id}/`
- Radiografías (jpg/png/dicom básico)
- Fotos intraorales antes/después
- Modelos de estudio (fotos)
- Acceso vía signed URLs (privado por defecto)
- Visualizador en la ficha del paciente con grid tipo galería

---

## 5. Schema de BD — resumen de tablas nuevas

```
SalonPro (existente)          OdentalPro (agrega)
─────────────────────         ────────────────────
profiles           →          (sin cambios)
tenant_settings    →          + business_subtype: 'general | orthodontics | pediatric | implants'
employees          →          + specialty: TEXT (Odontología General, Ortodoncia, Endodoncia...)
service_categories →          (sin cambios — usar para: Preventivo, Restaurador, Ortodoncia, Cirugía)
services           →          + requires_plan: BOOLEAN (si genera un treatment_plan)
clients            →          + birth_date: DATE, blood_type: TEXT, allergies: TEXT, medical_notes: TEXT
appointments       →          + clinical_record_id: UUID FK, treatment_plan_id: UUID FK
payments           →          (sin cambios)
inventory_items    →          (sin cambios — insumos dentales)
─────────────────────         ────────────────────
                              clinical_records      (NUEVA)
                              treatment_plans       (NUEVA)
                              consent_templates     (NUEVA)
```

---

## 6. Flujo de pantallas nuevas (mobile)

```
PacienteDetailScreen
  ├── Tab: Información (datos personales + alergias + tipo sangre)
  ├── Tab: Odontograma (SVG interactivo, actualizable)
  ├── Tab: Historia clínica (lista de visitas → ClinicalRecordDetailScreen)
  ├── Tab: Planes de tratamiento (TreatmentPlanCard con progreso)
  └── Tab: Documentos (consentimientos + radiografías)

ClinicalRecordScreen (nueva consulta)
  ├── Motivo de consulta (TextInput)
  ├── Diagnóstico (TextInput)
  ├── Tratamiento realizado (TextInput)
  ├── Odontograma (snapshot del estado actual)
  ├── Adjuntar imágenes (expo-image-picker → Storage)
  └── Guardar / Generar PDF resumen

TreatmentPlanScreen
  ├── Nombre del plan + dentista asignado
  ├── Costo total + sesiones
  ├── Progreso visual (barra + contador sesiones)
  ├── Historial de pagos parciales
  └── Próxima cita (→ AgendaScreen)
```

---

## 7. Diseño — OdentalPro vs SalonPro Lunaris

### Preset de colores `dental-clinic`

```typescript
// Diferente al turquesa/magenta de SalonPro
// Paleta: azul profesional + blanco clínico + accent cian
export const DENTAL_COLORS = {
  primary:    '#1565C0',  // Azul profesional — confianza, salud
  secondary:  '#0288D1',  // Azul más claro
  accent:     '#00ACC1',  // Cian — moderno, limpio
  background: '#0A0F1E',  // Fondo oscuro (mismo patrón Lunaris)
  surface:    '#111827',
  gold:       '#D4AF37',  // Gold igual que SalonPro (herencia de marca ZM Tech)
};
```

### Logo / Branding
- Nombre: **OdentalPro** (no DentalPro — diferenciación)
- Tagline: *"Tu clínica, en tu bolsillo"*
- Ícono: diente estilizado + diamante sutil (herencia de la marca ZM Tech / DiamondSparkle family)
- Evitar: colores rojos (asociación con dolor/sangre), verde hospitalario cliché

---

## 8. Estrategia de lanzamiento

### Fase 0 — Validación (antes de código)
- [ ] Entrevistar 5-10 odontólogos en Venezuela/LATAM
- [ ] Confirmar: ¿usan cuaderno, Excel o ya tienen software?
- [ ] Confirmar: ¿cuánto pagan actualmente? ¿qué odian del software actual?
- [ ] Definir el "tenant #1 de OdentalPro" (igual que Vanessa fue tenant #1 de SalonPro)

### Fase 1 — Preset y core (2-3 semanas)
- [ ] Crear `dental-clinic` preset en `packages/tenant-config/src/presets/`
- [ ] Migración SQL: extensiones a `clients`, `employees`, `tenant_settings`
- [ ] Crear tablas `clinical_records` y `treatment_plans`
- [ ] Terminología dental en `terminology.*`
- [ ] Onboarding wizard con `businessType: 'dental-clinic'` (reutilizar 90%)

### Fase 2 — Odontograma (2 semanas)
- [ ] Componente SVG `OdontogramView` (React Native + web shared)
- [ ] Estados por diente + superficies
- [ ] Persistencia en `clinical_records.odontogram`
- [ ] Vista de solo lectura (ficha paciente) vs editable (nueva consulta)

### Fase 3 — Historia clínica (1-2 semanas)
- [ ] `ClinicalRecordScreen` — nueva consulta
- [ ] `ClinicalHistoryList` — listado en ficha de paciente
- [ ] Upload de imágenes clínicas (expo-image-picker → bucket `clinical-images`)
- [ ] Visor de galería en ficha

### Fase 4 — Planes de tratamiento (1-2 semanas)
- [ ] `TreatmentPlanScreen` — crear plan
- [ ] Barra de progreso sesiones
- [ ] Integración con cobros (pagos parciales del plan)
- [ ] Vinculación con citas en agenda

### Fase 5 — Consentimientos + PDF (1 semana)
- [ ] Plantillas predefinidas por tratamiento
- [ ] Generación PDF (misma lib que se use en SalonPro)
- [ ] Firma digital touch en mobile
- [ ] Storage `consent-forms/`

### Fase 6 — Beta con tenant #1
- [ ] Demo sandbox dental (mismo patrón que SalonPro demo)
- [ ] 4 perfiles demo: dentista general, ortodoncista, asistente, paciente power-user
- [ ] Landing web `/s/[slug]` con Template dental (nuevo template D)

---

## 9. Pricing sugerido (borrador)

| Plan | Target | USD/mes | Límites |
|---|---|---|---|
| **Básico** | Consultorio 1 dentista | $19 | 100 pacientes, 1 especialista, sin imágenes clínicas |
| **Pro** | Consultorio + asistente | $39 | Ilimitado, historia clínica completa, imágenes, WABA |
| **Clínica** | Multi-dentista, sucursales | $79 | Todo + multi-especialistas, reportes avanzados, API |

**Estrategia:** Freemium hasta 20 pacientes/mes (igual que Doctocliq) para reducir fricción de adopción en mercados pequeños.

---

## 10. Diferenciadores vs competencia — mensaje de marketing

| Competidor | Su debilidad | Nuestro mensaje |
|---|---|---|
| Dentalink | Sin precio público, solo 3 países | "Sin sorpresas. Precio claro desde el primer día." |
| Doctocliq | App mobile recortada | "La misma app completa, siempre. En tu celular o en tu computadora." |
| Dentidesk | Interfaz envejecida | "Diseñado en 2025, no en 2010." |
| Cuaderno | No escalable | "Tu cuaderno no recuerda las alergias de tus pacientes. Nosotros sí." |

---

## 11. Consideraciones técnicas y legales LATAM

### Privacidad y datos clínicos
- Historia clínica es dato sensible — RLS estricto por `tenant_id` + `patient_id`
- Encriptación en reposo: Supabase/AWS lo maneja por defecto
- **NO almacenar** datos que requieran HIPAA compliance para vender en USA (si el foco es LATAM, no aplica directamente, pero documentar)
- Mencionar en ToS que el dentista es responsable del respaldo y la confidencialidad ante su colegio profesional

### Facturación electrónica
- Perú (SUNAT), México (SAT), Colombia (DIAN), Ecuador (SRI): cada uno tiene su integración
- **Fase 1: NO incluir** — integrar con terceros (Facturama, Alegra) en fase post-lanzamiento
- Registrar como deuda técnica desde el inicio

### Consentimientos y normativa
- Venezuela: no requiere firma digital oficial para consentimientos médicos, basta el registro escrito
- Colombia/Perú: requieren consentimiento informado por escrito para procedimientos invasivos
- El PDF generado debe incluir: nombre paciente, documento de identidad, fecha, tipo de procedimiento, firma

---

## 12. Integración con SalonPro monorepo

### Estructura de carpetas nuevas
```
packages/tenant-config/src/presets/
  ├── hair-salon.ts          ← existente
  ├── barbershop.ts          ← existente
  ├── spa-nails.ts           ← existente
  └── dental-clinic.ts       ← NUEVO ← empezar aquí

apps/mobile/screens/
  ├── agenda/                ← reutilizar
  ├── clients/               ← extender con tabs dental
  ├── dental/                ← NUEVA carpeta (módulos exclusivos)
  │   ├── odontogram/
  │   │   ├── OdontogramView.tsx
  │   │   ├── ToothComponent.tsx
  │   │   └── types.ts
  │   ├── clinical-records/
  │   │   ├── ClinicalRecordScreen.tsx
  │   │   ├── ClinicalHistoryList.tsx
  │   │   └── hooks/useClinicalRecords.ts
  │   ├── treatment-plans/
  │   │   ├── TreatmentPlanScreen.tsx
  │   │   ├── TreatmentPlanCard.tsx
  │   │   └── hooks/useTreatmentPlans.ts
  │   └── consent-forms/
  │       ├── ConsentFormScreen.tsx
  │       └── templates/
```

### Condicional por businessType
Los módulos dentales solo se renderizan/habilitan cuando `config.businessType === 'dental-clinic'`:

```typescript
// En PacienteDetailScreen (extensión de ClientDetailScreen)
const { config } = useTenant();

{config.features.odontogram && (
  <OdontogramTab patientId={patient.id} />
)}
{config.features.clinicalHistory && (
  <ClinicalHistoryTab patientId={patient.id} />
)}
{config.features.treatmentPlans && (
  <TreatmentPlansTab patientId={patient.id} />
)}
```

---

## 13. Deuda técnica prevista (registrar desde el inicio)

| ID | Descripción | Prioridad | Fase |
|---|---|---|---|
| DT-D01 | Soporte DICOM básico para radiografías digitales | Baja | Post-beta |
| DT-D02 | Integración facturación electrónica por país | Media | v1.1 |
| DT-D03 | Periodontograma (complemento al odontograma) | Media | v1.1 |
| DT-D04 | Portal del paciente web (ver historial propio) | Alta | v1.2 |
| DT-D05 | Recordatorio vacunas/revisiones programadas | Media | v1.1 |
| DT-D06 | Interconsultas entre especialistas del mismo tenant | Baja | v2.0 |

---

## 14. Lo que aprendimos de SalonPro y NO repetir

- **Empezar multi-tenant desde el día 0** — nunca hardcodear nada, ya lo sabemos.
- **Tener el tenant #1 validando en producción antes del beta general** — Vanessa → modelo a replicar.
- **El demo sandbox desde el inicio** — no dejarlo para el final.
- **`yarn check:types` antes de cada commit** — disciplina desde el primer archivo.
- **Documentar en `docs/tech-debt/`** desde la primera semana — no acumular deuda sin registrar.
- **RLS desde la primera migración** — no dejarlo para "después".
- **Render-first-then-push para odontograma** — aprobar visualmente el SVG antes de integrar.

---

## 15. KPIs de éxito para OdentalPro

| Métrica | Target 3 meses | Target 6 meses |
|---|---|---|
| Tenants activos | 10 | 50 |
| Pacientes registrados | 500 | 5,000 |
| Retención mensual | >80% | >85% |
| Churn | <5% | <3% |
| NPS | >40 | >50 |
| MRR | $400 | $2,500 |

---

*Este documento se actualiza conforme evoluciona SalonPro y se obtiene validación de mercado dental.*  
*Próxima revisión: luego del beta gate de SalonPro (CI verde + push notifications).*

**ZM Tech · Alberto Ortas · 2026**
