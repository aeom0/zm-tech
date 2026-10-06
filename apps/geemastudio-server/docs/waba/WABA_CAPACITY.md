# Capacidad de horarios WABA (solape)

Fuente de verdad para el tope de citas simultáneas en el bot WhatsApp.  
**No confundir** con «1 cita por chat» (`shouldBlockAdditionalBooking` / Luana): eso limita *otra* reserva al mismo teléfono, no el cupo del salón en un slot.

## Regla (ago 2026)

El bot crea citas con `employee_id = null` (asignación manual después). El cupo se mide con `countOverlappingAppointments()` (todas las citas no canceladas que se solapan, sin filtrar por chica).

| Carrito **entrante** | Tope (`overlapCapForCart`) | Criterio |
| -------------------- | -------------------------- | -------- |
| 100 % servicios especiales | **2** | Vanessa puede ejecutar en paralelo a Stephani |
| Mezcla o cualquier no-especial | **1** | Comportamiento histórico (p. ej. Builder Gel) |
| Carrito vacío / IDs desconocidos | **1** | `isSpecialOverlapCart([])` → false |

La regla mira **solo el carrito entrante** (o los `service_id` de la cita al reprogramar), no el tipo de lo que ya ocupa el slot.

### Servicios especiales (código)

Definidos en `supabase/functions/whatsapp-webhook/lib/constants.ts`:

- Categorías enteras: `cat-lifting`, `cat-depilacion`, `cat-microblading`
- Extras (cat-cejas-rostro): Depilación de Bozo, Depilación de Cejas (`SPECIAL_OVERLAP_EXTRA_SERVICE_IDS`)

Helpers: `isSpecialOverlapCart` / `overlapCapForCart` en `lib/services-catalog.ts`.

Ejemplo de negocio: *Builder Gel + Laminado de Cejas* → tope **1** (el Builder no es especial).

## Carriles cat-extensiones (Stephani / Karelis) — ago 2026

Modelo **independiente** de Vanessa/`SPECIAL_OVERLAP_*`. El bot sigue creando citas con `employee_id = null`; el cupo se decide por *carril* de la técnica, no por asignación de chica.

| Carril | Técnicas | Horario |
| ------ | -------- | ------- |
| **Stephani** | Clásicas, Rímel, Efect Mojado, Baby Vol. 3D/4D y sus retoques | Todo el día |
| **Karelis** | Anime, Fox, Hawaiana, Mega Volumen, Wispy Glam (`EXTENSIONES_KARELIS_SERVICE_IDS`) | Desde las **13:00** Lima (`KARELIS_AFTERNOON_START_HOUR`) |
| Sin carril | Retiro de Pestañas | Tope genérico cap=1 (sin lógica de carril) |

Helpers: `classifyExtensionesLane` / `cartExtensionesLanes` / `cartRequiresKarelisAfternoon` + `getOverlappingAppointmentsWithLanes` / `hasSlotCapacityForServices` en `agenda.ts`.

Reglas:

1. Mismo slot tarde: Rímel (Stephani) + Fox (Karelis) → **ambos OK** — la 2.ª plaza solo existe si Karelis está en el carrito o ya ocupando el slot (`karelisInPlay`).
2. Dos técnicas del mismo carril en el mismo slot → el segundo **bloquea**.
3. Carrito con técnica Karelis → selectores y confirmación **no ofrecen** horarios antes de las 13:00.
4. Reprogramación excluye el propio `appointment_id` (no se cuenta el propio carril).
5. **Ocupación y carrito Stephani fuera de extensiones** (`classifyOccupiedCapacityLane` / `cartExtensionesLanes`): `cat-unas` y `cat-cejas-rostro` (salvo Bozo/Cejas) marcan el carril Stephani en ambos sentidos. Manicure + Clásicas → bloquea. Manicure + Fox y Fox + Manicure → permiten.

## Dónde se aplica

| Flujo | Archivo / función |
| ----- | ----------------- |
| Selectores fecha/hora | `agenda.ts` — `slotHasAvailability` + filtro Karelis vía `sendDateSelector` / `sendTimeSelector` |
| Texto libre (nueva cita) | `booking-flow.ts` — `tryCompleteBookingFromText` → `hasSlotCapacityForServices` |
| Confirmación tap `time_` (nueva) | `dispatcher.ts` |
| Soft-reschedule texto | `booking-flow.ts` — `trySoftRescheduleFromText` |
| Reprogramación tap `time_` | `pending-appointment.ts` — `finalizeRescheduleAppointment` (excluye el propio `appointment_id`) |
| Re-chequeo al pagar | `payment.ts` — `processPaymentScreenshot` |
| Copy «horarios con cupo» | `booking-flow.ts` — `formatAvailableHours(..., catalog, serviceIds)` |
| Listas post-Haiku / calendario | `ai-assistant.ts`, `resendDatetimeSelectors`, `startRescheduleFromAppointment` |

Mensaje de bloqueo: `SLOT_TAKEN_MESSAGE` en `pending-appointment.ts`. Gate Karelis mañana: copy «desde la 1:00 PM».

## QA

```bash
# Tope 1 (Builder Gel) — regresión v3.0
yarn waba:validate:slot-capacity
yarn waba:validate:payment-slot-capacity

# Tope 1 vs 2 Vanessa + reprog. tap (H/I/L) — A–L
yarn waba:validate:special-overlap
SPECIAL_OVERLAP_CASES=H,I,L yarn waba:validate:special-overlap

# Carriles Stephani/Karelis — A–G
yarn waba:validate:extensiones-lanes
EXTENSIONES_LANES_CASES=A,B,C yarn waba:validate:extensiones-lanes
```

Teléfonos special-overlap: `51999000991`–`993`. Extensiones-lanes: `51999000994`–`996`. Tras cualquier suite: `yarn waba:cleanup:qa`.

Detalle de casos y payloads: [WABA_SIMULATION_VALIDATION.md](WABA_SIMULATION_VALIDATION.md).

## Turnover + almuerzo (sep 2026)

Las **duraciones del catálogo** (`services.duration`) y el copy de confirmación **no cambian**. Para cupo de agenda se usa la **ocupación real**:

| Tipo | Buffer sobre duración catálogo |
| ---- | ------------------------------ |
| `cat-unas` | +30 min |
| Resto | +15 min |

Carrito combo: **suma** de (duración + buffer) por servicio. Citas existentes: mismo cálculo vía `appointment_services` + catálogo; sin filas de servicio → `appointments.duration + 15`.

**Almuerzo Stephani** (45 min, ventana 12:00–14:30 Lima): solo si el carrito entrante necesita piso Stephani (`cartExtensionesLanes` con `stephani`; no aplica solo Karelis ni carrito 100 % especial Vanessa). Intervalos que compiten por el break = citas existentes que también usan piso Stephani + la candidata. Si la mañana estuvo libre, el almuerzo puede desplazarse hasta el cierre del día.

Helpers puros: `lib/slot-occupation.ts`. Carga del día + carriles: `handlers/agenda.ts` (`loadDayOccupiedAppointments`, `hasSlotCapacityForServices`).

Selectores fecha/hora, copy «horarios con cupo», confirmación tap, texto libre, reprogramación y re-chequeo al pagar pasan por **`hasSlotCapacityForServices`** con ventanas bufferizadas.

QA unitario: `yarn waba:validate:slot-occupation`.

## Camillas y duración de packs/promos (oct 2026)

- **Camillas:** 2 en total (`SALON_BEDS`). Una cita usa 1 camilla salvo que todos sus servicios sean `cat-unas` (0); un carrito de 2 personas con el mismo servicio (duo) necesita 2. `passesBedGate` exige que el pico de camillas simultáneas en la ventana del candidato sea ≤ 2. Es un AND extra: carriles Fox/Karelis/Stephani, almuerzo y `overlapCapForCart` siguen igual.
- **Duración de pack/promo:** `packs.slot_minutes` / `promotions.slot_minutes` (incluyen turnover). Si hay valor, reemplaza la suma de duraciones; se busca por composición de servicios (multiconjunto de ids), así vale para carritos y citas ya agendadas. El pack de 2 (dos citas) guarda esos minutos en cada cita (`duration`), que el loader respeta si difiere de la suma del catálogo.
- No se cambian las `services.duration` (el turnover cubre eso).

## Non-goals

- No cambia `employee_id` al crear por bot ni el flujo de Asignar chicas.
- No usa `EMPLOYEE_CATEGORIES` / `_minEmployeesFree` (deuda aparte).
- No mezcla carriles con `SPECIAL_OVERLAP_*` (Vanessa).
- No crea tabla de turnos por día — Karelis es constante fija 13:00.
- La agenda mobile (`checkAvailability` por empleada) es otro camino; fuera de este doc.
- **No es** el guard «máx. 2 citas programadas por chat» (`shouldBlockAdditionalBooking` / Luana / party booking): eso limita *otra* reserva al mismo teléfono (tope 2 desde sep-2026), no el cupo del salón en un slot.
- **Party / multi-cita** (mismo o distinto horario): ver `lib/party-booking.ts` — `needSlots`/same vs sequential; no confundir con `overlapCapForCart`.
