# Plan 18 — Gestión de profesionales y disponibilidad

**Fecha:** 2026-10-03
**Estado:** Borrador — decisiones de alcance confirmadas, sin implementar
**Repos afectados:** `zm-tech` (schema, web, mobile) y `ZM-Lash-and-Nails-Beauty` (Edge `whatsapp-webhook`, que es la fuente real del webhook en prod)
**Relacionado:** Plan 08 (dispatcher), Plan 16 (multi-sucursal), Plan 12 (paridad panel)

---

## Por qué existe

ZM Lash pidió reglas que hoy no se pueden configurar ni en mobile ni en web:

- Stephani hace ciertos servicios, pero no extensiones anime, fox, hawaiana, wispy ni mega volumen.
- Karelis hace esas extensiones, pero no las de Stephani.
- Karelis solo atiende a partir de la 1 pm.
- Dos servicios de extensiones pueden coincidir en horario solo en la tarde, uno de cada profesional.
- Casos puntuales: el 24-oct y el 5-dic Stephani no va al salón y Karelis cubre sus servicios. Haiku debe seguir agendando todas las extensiones, pero solo con Karelis disponible.

Con muchos tenants y tipos de negocio, cada caso así no puede resolverse con código. Debe ser configuración: asignar servicios a profesionales, definir horarios, apagar un día o un turno, y que una profesional cubra a otra, todo entendido por el bot y por Haiku.

## Estado actual (auditado 2026-10-03)

- **Servicios por profesional:** solo a nivel de categoría, en la llave WABA `employee_categories_by_service_category` (`lib/waba-config.ts`, usada en `dispatcher.ts`). Solo la lee el bot; no hay tabla, ni UI, ni granularidad por servicio.
- **Horario por profesional:** no existe. `handlers/agenda.ts` usa `waba_business_hours` (lista de horas del negocio) para todas. Domingo y rango de horas son globales.
- **Ausencias y coberturas:** no existen. Solo `salon_holidays` (a nivel salón). El bot no consulta `salon_holidays`.
- **Citas del bot sin profesional:** `handlers/payment.ts` inserta `appointments` y `appointment_services` con `employee_id: null`. La asignación ocurre después a mano (pantalla "Asignar profesionales"). Por eso `checkAvailability` por `employee_id` casi nunca ve conflictos reales: hoy el bot puede ofrecer un horario ya comprometido.
- **Lógica duplicada:** disponibilidad calculada en TypeScript por separado en el bot (`agenda.ts`) y en mobile (`useAvailabilityCheck.ts`). Web usa otra variante en `useAgendaData`.
- **Haiku:** solo recibe un contexto de horario genérico; no conoce quién hace qué ni cuándo.
- **Tipos:** `employees.id` y `services.id` son `varchar`; `tenant_id` es `text`.

## Hallazgos de la fase 0 (prod `udelx…`, 2026-10-03, solo lectura)

- **Migraciones alineadas:** las versiones remotas coinciden con los archivos locales (última: `20261003021154_waba_pricing_sync_daily`). Se puede migrar.
- **Webhook en prod = v708, desplegado desde el repo ZM** (`ZM-Lash-and-Nails-Beauty`). La copia de `zm-tech` difiere en `agenda.ts`, `payment.ts`, `dispatcher.ts` y `waba-config.ts`, y le faltan archivos como `booking-flow.ts` y `party-booking.ts`. **Los cambios del bot (Fase 5) se hacen sobre el repo ZM**, que es el que llega a prod. La copia de `zm-tech` no se toca hasta reconciliarla.
- **No hay mapa de categorías cargado:** no existe `employee_categories_by_service_category` en `waba_config`. Hoy el bot ofrece todas las profesionales activas para cualquier servicio, incluida la dueña. El backfill es simple: todas con `does_all_services = true`; la configuración de Stephani y Karelis se carga desde la UI.
- **Profesionales de ZM:** Alejandra, Karelis, Stephani Manrique (ids `emp-*`) y Vanessa Douglas (`owner`, también atiende). Catálogo: 62 servicios activos en 6 categorías (Extensiones de Pestañas tiene 15).
- **La asignación llega después de crear la cita:** el bot guarda `employee_id: null`, pero las citas de prod terminan con profesional (`appointments.employee_id` casi siempre lleno) y `appointment_services.employee_id` a veces queda en null aunque la cita ya esté asignada (por ejemplo `NULL,NULL` con la cita asignada a Stephani). **El motor debe mirar `appointments.employee_id` y, si es null, `appointment_services.employee_id`**, y tratar como "sin asignar" solo cuando ambos faltan.
- **Volumen bajo:** 233 citas en total, 2 sin profesional, 3 futuras. La migración y el backfill son de bajo riesgo.

## Decisiones confirmadas

1. **Entrega completa en una pasada:** modelo, motor, bot/Haiku y UI web (ficha de profesional); mobile después, sobre el mismo motor.
2. **Cobertura hereda todo:** durante el rango, la cubridora suma todos los servicios de la cubierta y esta queda ausente todo el día.
3. **Sin tope simultáneo extra:** cada profesional atiende una cita a la vez. La regla "dos extensiones solo en la tarde" no es una regla propia, sale de los horarios (en la mañana solo hay una profesional de extensiones; desde la 1 pm hay dos).
4. **Sin lógica específica de ZM en el código.** Los nombres y reglas de Stephani y Karelis entran solo como datos del tenant.

## Modelo de datos

Todas las tablas llevan `tenant_id text`, RLS por `current_tenant_id()` y escritura solo `is_admin()`, igual que `salon_holidays`. Sin privilegios para `anon`.

### `employees` (columna nueva)

| Columna | Notas |
|---------|-------|
| `does_all_services boolean not null default true` | Si es `true`, hace todos los servicios, incluidos los nuevos. Es el comportamiento actual y el default de cualquier tenant. Si es `false`, solo los de `employee_services`. |

### `employee_services`

| Columna | Notas |
|---------|-------|
| `employee_id varchar`, `service_id varchar` | PK compuesta |
| `tenant_id text` | |

La UI permite marcar una categoría completa y luego quitar servicios sueltos; se guarda siempre por servicio.

### `employee_work_hours`

| Columna | Notas |
|---------|-------|
| `id uuid` PK, `tenant_id`, `employee_id` | |
| `weekday smallint` | 0–6 (0 = domingo) |
| `start_time time`, `end_time time` | Varias filas por día = turno partido |

Sin filas para la profesional: hereda el horario del negocio. Con filas: solo trabaja en esos turnos, siempre acotados al horario del negocio.

### `employee_time_off`

| Columna | Notas |
|---------|-------|
| `id uuid` PK, `tenant_id`, `employee_id` | |
| `date_from date`, `date_to date` | Rango (vacaciones) o un solo día |
| `start_time time null`, `end_time time null` | Ambos nulos = día completo; si no, solo ese turno |
| `kind text not null` | Tipo de ausencia (ver abajo) |
| `reason text null` | Nota libre opcional ("cita médica", "trámite") |
| `is_paid boolean null` | Informativo para quien lleva pagos; no calcula nómina en esta fase |

Tipos (`kind`), con etiqueta en la UI y editables a futuro por tenant sin tocar el motor, que solo distingue "ausente" de "presente":

| `kind` | Etiqueta |
|--------|----------|
| `vacation` | Vacaciones |
| `permission` | Permiso |
| `sick_leave` | Enfermedad / reposo |
| `personal` | Asunto personal |
| `training` | Capacitación |
| `day_off` | Día libre / compensatorio |
| `other` | Otro |

Todos tienen el mismo efecto en la disponibilidad. El tipo sirve para la agenda (color e ícono distintos), para el historial de la profesional y para reportes.

Ausencias abiertas: una enfermedad puede no tener fecha de regreso. Se permite `date_to` nulo ("hasta nuevo aviso"), que bloquea desde `date_from` hasta que se edite o se cierre con la fecha real.

#### Qué pasa con las citas ya agendadas

Al crear o extender una ausencia (o una cobertura), se consultan las citas futuras de esa profesional que caen en el rango y se muestran antes de confirmar:

- Lista de citas afectadas (clienta, servicio, hora).
- Por cada una, sugerencia de profesional elegible libre en ese horario (la cubridora, si hay cobertura).
- Acciones: reasignar, dejar como está o avisar a la clienta por WhatsApp para reprogramar. El mensaje usa una plantilla WABA aprobada; el envío es manual, nunca automático.
- La ausencia se puede guardar sin resolver las citas, pero quedan marcadas como "requieren atención" en la agenda y en el contador de pendientes de Equipo.

Esto cubre el caso más común: alguien avisa a las 8 am que está enferma.

### `employee_coverages`

| Columna | Notas |
|---------|-------|
| `id uuid` PK, `tenant_id` | |
| `covered_employee_id`, `covering_employee_id` | |
| `date_from date`, `date_to date` | |
| `note text null` | |

Efecto: en el rango, la cubierta queda ausente todo el día y la cubridora hereda sus servicios, pero siempre dentro de su propio horario y agenda.

Constraint: la cubridora no puede ser la misma cubierta; rango válido (`date_from <= date_to`).

## Motor de disponibilidad

Una sola función SQL, fuente de verdad para todos los canales:

```
get_available_slots(
  p_tenant_id text,
  p_service_ids text[],        -- en el orden del carrito
  p_from date,
  p_to date,
  p_step_minutes int default 60,
  p_now timestamp default null -- hora local del tenant; null = ahora (útil para pruebas)
) returns table (
  slot_start timestamp,        -- hora local del tenant
  assignments jsonb            -- [{ service_id, employee_id, starts_at, duration }] en orden del carrito
)
```

Reglas, en orden:

1. Día abierto: horario del negocio (`waba_business_hours` / `business_hours`) y `salon_holidays` (`is_closed`, `open_until_hour`).
2. Elegibles por servicio: profesionales activas con `does_all_services` o fila en `employee_services`, más las que cubren a una elegible ese día.
3. Disponible a esa hora: sin `employee_time_off` ni cobertura que la saque, dentro de su `employee_work_hours` (o el del negocio), y sin cita solapada.
4. Multi-servicio en secuencia: cada servicio ocupa su segmento (`inicio + duración acumulada`); se asigna la primera elegible libre en ese segmento. Si algún servicio queda sin asignar, el horario no se ofrece.
5. Devuelve la asignación completa para que la cita se cree **ya con** `employee_id`.

Prevención de conflictos con citas históricas sin profesional: cada cita con `employee_id null` solapada consume a **una candidata elegible para alguno de sus servicios** (la menos preferida), no a cualquiera. Así una clásica sin asignar a las 14:00 no le quita cupo a Karelis para una extensión anime, pero sí bloquea a Stephani. La elegibilidad vive en `employee_eligible_for_service(tenant, employee, service, day)` (propio o heredado por cobertura).

Para el bot existe `get_day_slots_for_bot(tenant, service_ids, day, step=15, now=null) → { configured, slots: ["HH:MM"] }` (solo `service_role`). `configured = false` si el negocio no usa ninguna regla (nadie con `does_all_services = false` y sin horarios, ausencias ni coberturas): el bot conserva entonces su lógica actual.

Semántica de horario: un inicio es válido si `inicio < cierre` (no se exige que el servicio termine antes del cierre, como ocurre hoy con las citas reales de ZM). En `salon_holidays`, `open_until_hour` es el último inicio permitido (inclusive). Rango máximo 31 días por llamada. La función es `STABLE`, con `EXECUTE` solo para `authenticated` y `service_role`.

Todas las comparaciones se hacen en hora local del tenant (`appointments.date` es `timestamp without time zone`); la zona sale de `tenant_settings.timezone`.

## Bot WABA y Haiku

- `agenda.ts` (`sendDateSelector` / `sendTimeSelector`) deja de calcular y llama a `get_available_slots`.
- **Decidido:** el bot no guarda `employee_id` (queda null y Vanessa asigna desde AsignarChicas), porque `trg_notify_appointment_assigned` avisaría a la profesional al insertar. Revisar si se quiere asignación automática más adelante (requeriría suprimir ese aviso en citas del bot).
- Se retira `employee_categories_by_service_category` de `dispatcher.ts` cuando el backfill esté verificado.
- **Haiku** no recibe reglas en bruto, sino el resultado ya calculado: los `CUPOS REALES` que arma `formatAvailableHours` pasan por el mismo filtro del motor, así que no hace falta cambiar su prompt. Idea original: "para anime el 24-oct solo hay desde la 1 pm con Karelis", y para fechas sin cupo, la alternativa más cercana. Nunca inventa disponibilidad: si el motor devuelve vacío, lo dice y propone otra fecha.
- Respetar la regla de reconciliar prod/repo del webhook antes de desplegar (el repo ya difiere de prod en v655).

## UI web (`/panel/personal`)

Ficha de profesional con tres pestañas, con `config.terminology.staff` / `staffSingular` en toda la copy y sin emojis (Lucide):

- **Servicios:** interruptor "hace todos los servicios" y árbol de categorías con casillas (marcar categoría completa, quitar servicios sueltos).
- **Horario:** semana con turnos por día (agregar turno partido, copiar a otros días, "usa horario del negocio").
- **Ausencias y coberturas:** alta de ausencias por tipo (vacaciones, permiso, enfermedad, asunto personal, capacitación, día libre, otro) para un día, un rango, un turno o "hasta nuevo aviso", y de coberturas ("X cubre a Y del … al …"). Al guardar muestra las citas afectadas con sugerencia de reasignación, y avisa si deja fechas sin nadie para un servicio activo. Incluye historial de ausencias por profesional.
- **Agenda:** las ausencias se ven en la cuadrícula como bloques con color por tipo; las citas que requieren atención se destacan.

La agenda web y la pantalla de asignación pasan a sugerir solo profesionales elegibles. Mobile (Equipo → Personal) replica las tres pestañas en una segunda entrega, consumiendo el mismo motor.

## Plan de implementación

| Fase | Contenido | Verificación |
|------|-----------|--------------|
| 0 | **Hecha.** Datos reales de ZM leídos y webhook ubicado (ver hallazgos) | Conteos documentados |
| 1 | **Hecha** (`20261003144555_employee_availability_model`). Migración: columna en `employees`, 4 tablas, RLS, índices; backfill desde la llave de categorías (si no hay mapa → `does_all_services = true`) | `list_migrations` 1:1 con archivos locales |
| 2 | **Hecha** (`20261003145120_get_available_slots`, 164 ms para 31 días). Función `get_available_slots` + pruebas SQL con el caso ZM (24-oct, 5-dic, desde la 1 pm, multi-servicio) | Casos de prueba abajo |
| 3 | **Hecha.** Tipos en `@geemastudio/shared-schema`; hooks y servicios web/mobile (capa UI → hooks → services) | `pnpm check:types` |
| 4 | **Hecha** (pestañas Servicios, Horario, Ausencias y coberturas; pendiente: bloques en agenda, sugerir solo elegibles y revisión visual) UI web: ficha de profesional | Revisión visual claro/oscuro, mobile web |
| 5 | **Hecha en código, sin desplegar** (PR ZM #164). Motor v2 y RPC de bot aplicados en BD. En el bot, `hasSlotCapacityForServices` suma una verificación contra `get_day_slots_for_bot` (caché 8 s; no bloquea sin reglas, con error o fuera de la grilla de 15 min). Al reprogramar sí consulta el motor y le pasa la cita que se mueve (`p_exclude_appointment_id`) para no contarla como ocupada. El selector de horas y los `CUPOS REALES` de Haiku pasan por esa misma función. Decisión: el bot sigue creando citas con `employee_id` null y Vanessa asigna, porque guardar `employee_id` dispara `trg_notify_appointment_assigned`. Despliegue del webhook solo con confirmación |
| 6 | Cargar la configuración de ZM Lash desde la UI (no por SQL) y validar con Vanessa | Checklist de aceptación |
| 7 | Mobile: tres pestañas en Equipo → Personal | |

Regla dura de migraciones: aplicar en remoto (con confirmación explícita), renombrar el archivo local a `<version>_<name>.sql` en el mismo commit y verificar con `list_migrations` antes de hacer push. Nunca dejar archivos locales sin aplicar.

## Casos de prueba (ZM Lash, como datos)

| Caso | Resultado esperado |
|------|--------------------|
| Extensión anime, lunes | Solo Karelis, desde 13:00 |
| Servicio de Stephani, lunes | Solo Stephani, horario del negocio |
| Dos extensiones (una de cada una) a las 14:00 | Se ofrecen ambas, asignadas a profesionales distintas |
| Dos extensiones a las 11:00 | Solo una; la segunda no se ofrece |
| 24-oct y 5-dic, servicio de Stephani | Karelis cubre, solo desde 13:00 |
| Vacaciones de Karelis (rango de 10 días) | No se ofrecen extensiones anime, fox, hawaiana, wispy ni mega volumen en esas fechas |
| Enfermedad "hasta nuevo aviso" | Bloquea desde la fecha de inicio; al cerrarla con fecha real, vuelve a ofrecerse |
| Permiso de 2 h (turno) | Solo se bloquea ese tramo; el resto del día sigue disponible |
| Crear una ausencia con citas ya agendadas | Se listan las citas afectadas y se sugiere reasignar; quedan marcadas hasta resolverlas |
| 24-oct, extensión anime | Karelis, desde 13:00 (igual que siempre) |
| Cita del bot sin `employee_id` solapada | Reduce la capacidad del conjunto elegible |
| Tenant sin configuración nueva | Comportamiento idéntico al actual |

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Citas históricas sin `employee_id` distorsionan la capacidad | Regla de capacidad por conjunto elegible; auditar conteos en Fase 0 |
| Función SQL lenta con rangos grandes | Límite de 30 días por llamada, índices por `(tenant_id, employee_id, date)`, pruebas con datos de ZM |
| Bot desplegado antes del schema | Fases en orden; el bot cae al comportamiento actual si la función no existe |
| Drift prod/repo del webhook | Fase 0 obligatoria |
| Conflicto con multi-sucursal | Las tablas nuevas admiten `branch_id` nullable más adelante (Plan 16) |
| Ausencia repentina deja citas colgadas | Flujo de citas afectadas al guardar, marca "requiere atención" y reasignación sugerida |
| Configuración incompleta deja un servicio sin nadie | Aviso en la UI al guardar ausencias y coberturas |

## Criterios de aceptación

- Un tenant sin configuración nueva se comporta igual que hoy.
- ZM Lash configura los casos de este plan solo desde la UI, sin tocar código.
- El bot y Haiku nunca ofrecen un horario sin profesional elegible libre ni el 24-oct ni el 5-dic fuera del horario de Karelis.
- La cita creada por el bot queda con profesional asignada.
- Web, mobile y bot muestran la misma disponibilidad para la misma consulta.

## Fuera de alcance

- Topes simultáneos por tipo de servicio o recursos físicos (puestos, equipos); se evalúa si un tenant lo pide.
- Asignación automática por carga o preferencia de la clienta.
- Saldos de vacaciones, aprobación por flujo y cálculo de nómina por ausencias. `is_paid` es solo informativo; se evalúa aparte junto con Plan 09 (comisiones y pagos).
- Autoservicio de la profesional (pedir permisos desde su propia cuenta). El rol staff hoy no escribe; se evalúa después.
- Reglas por sucursal (Plan 16).
