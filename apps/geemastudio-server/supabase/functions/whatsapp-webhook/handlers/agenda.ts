// handlers/agenda.ts — Selector de fecha/hora y disponibilidad

import { sendInteractiveList, sendMessage } from "../wa-api.ts";
import { buildTimeListPage } from "./menu.ts";
import { formatDateKeyShort, parseLimaLocalToDate } from "../format.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import { employeeRulesDecision } from "../lib/employee-availability.ts";
import { isTwoPersonSameServiceIds } from "../lib/duo-pack.ts";
import type {
  CatalogService,
  ExtensionesLane,
  ServiceCatalog,
} from "../lib/services-catalog.ts";
import {
  cartExtensionesLanes,
  cartRequiresKarelisAfternoon,
  classifyOccupiedCapacityLane,
  isSpecialOverlapCart,
} from "../lib/services-catalog.ts";
import {
  type AgendaInterval,
  bedsAvailable,
  bedsForServices,
  hasFlexibleMealBreak,
  intervalsOverlap,
  occupiedMinutesForComposition,
  occupiedMinutesForServices,
  OTHER_TURNOVER_MINUTES,
  SALON_CLOSE_MINUTES,
  SALON_OPEN_MINUTES,
  turnoverMinutesForCategory,
} from "../lib/slot-occupation.ts";
import {
  getKarelisAfternoonStartHour,
  getSalonTimeSlots,
  LIMA_UTC_OFFSET_HOURS,
  WA_IDS,
  YAPE_PLIN_NUMBER,
} from "../lib/constants.ts";
import {
  getAdvancePaymentRate,
  getDateKeyFromYmd,
  getDateKeyLima,
  getDateSelectorDescription,
  getHolidayOpenUntilHour,
  getSalonClosedMessage,
  isPeruHoliday,
  isSalonClosed,
  isSunday,
} from "../lib/peru-holidays.ts";

/** Fecha/hora de gestión: todo en hora Lima (UTC-5). Convierte hora Lima → Date UTC para comparar con BD. */
function limaSlotToUtcDate(
  year: number,
  month: number,
  day: number,
  hourLima: number,
  minuteLima = 0,
): Date {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hourLima + LIMA_UTC_OFFSET_HOURS,
      minuteLima,
      0,
    ),
  );
}

function formatSlotLabel(hour: number, minute: number): string {
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const period = hour < 12 ? "AM" : "PM";
  return minute === 0
    ? `${h12}:00 ${period}`
    : `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

function buildTimeRowId(dateKey: string, hour: number, minute: number): string {
  return `${WA_IDS.TIME_PREFIX}${dateKey}T${hour.toString().padStart(2, "0")}${
    minute.toString().padStart(2, "0")
  }`;
}

const SHORT_SERVICE_MAX_MINUTES = 60;

/** Cita del día con ventana ocupada (duración catálogo + turnover). */
export type LoadedOccupiedAppointment = {
  id: string;
  startMinutes: number;
  endMinutes: number;
  serviceIds: string[];
  needsStephaniMeal: boolean;
  lanes: Set<ExtensionesLane>;
  /** Camillas que ocupa (0 = solo uñas). */
  beds: number;
};

function limaMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function dayOfWeekFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, 12)).getUTCDay();
}

/** Cierre operativo del día (Lima) para desplazar almuerzo si la mañana estuvo libre. */
function salonCloseMinutesForDateKey(dateKey: string): number {
  if (isSunday(dateKey)) return 13 * 60;
  if (isPeruHoliday(dateKey)) return getHolidayOpenUntilHour(dateKey) * 60;
  return SALON_CLOSE_MINUTES;
}

/**
 * ¿El carrito entrante exige bloque de almuerzo Stephani?
 * Solo Karelis o 100 % Vanessa especial → no aplica.
 */
function cartNeedsStephaniMeal(
  serviceIds: string[],
  catalog: ServiceCatalog,
): boolean {
  // serviceIds vacío → no sabemos qué carril ocupa el candidato; asumir que
  // sí necesita el bloque de almuerzo de Stephani es la opción conservadora
  // (evita doble reserva sobre su almuerzo). Todos los call sites actuales de
  // hasSlotCapacityForServices/slotHasAvailability (dispatcher, booking-flow,
  // pending-appointment, payment) pasan siempre un serviceIds no vacío — este
  // default solo aplicaría a un futuro caller que omita el arreglo.
  if (serviceIds.length === 0) return true;
  if (isSpecialOverlapCart(serviceIds, catalog)) return false;
  const lanes = cartExtensionesLanes(serviceIds, catalog);
  if (lanes.has("stephani")) return true;
  if (lanes.size === 1 && lanes.has("karelis")) return false;
  return true;
}

function catalogServicesForIds(
  serviceIds: string[],
  catalog: ServiceCatalog,
): CatalogService[] {
  return serviceIds
    .map((id) => catalog.servicesById.get(id))
    .filter((s): s is CatalogService => !!s);
}

function candidateOccupiedMinutes(
  catalog: ServiceCatalog | undefined,
  serviceIds: string[],
  rawDuration: number,
): number {
  if (catalog && serviceIds.length > 0) {
    return occupiedMinutesForComposition(
      serviceIds,
      catalogServicesForIds(serviceIds, catalog),
      catalog.packSlotMinutes,
      rawDuration,
    );
  }
  return rawDuration + OTHER_TURNOVER_MINUTES;
}

function buildCandidateInterval(
  date: Date,
  catalog: ServiceCatalog | undefined,
  serviceIds: string[],
  rawDuration: number,
): AgendaInterval {
  const start = limaMinutes(date);
  return {
    start,
    end: start + candidateOccupiedMinutes(catalog, serviceIds, rawDuration),
  };
}

/**
 * Día de baja carga (≤1 cita más ese día para Stephani): no exige el bloque
 * formal de 45 min entre 12:00-14:30 — puede almorzar antes de abrir, al
 * cerrar, o en el hueco real que quede. El gate existe para evitar que un
 * día muy cargado la deje sin almuerzo, no para bloquear un día casi vacío.
 * Decisión de Vanessa (17-sep-2026, caso real Alberto VE …4665: carrito
 * largo de Extensiones+Manos/Pies con Yelitza como única otra cita esa
 * tarde — el único horario viable era las 10am, sin hueco de almuerzo
 * formal, y Vanessa confirmó que sí se debe poder agendar).
 */
function passesMealGate(
  dayAppts: LoadedOccupiedAppointment[],
  candidate: AgendaInterval,
  incomingNeedsMeal: boolean,
  salonCloseMinutes: number,
): boolean {
  if (!incomingNeedsMeal) return true;
  const stephaniIntervals = dayAppts
    .filter((a) => a.needsStephaniMeal)
    .map((a) => ({ start: a.startMinutes, end: a.endMinutes }));
  if (stephaniIntervals.length <= 1) return true;
  return hasFlexibleMealBreak(stephaniIntervals, candidate, salonCloseMinutes);
}

/**
 * Citas del día con minutos ocupados (catálogo + turnover).
 * Fallback sin filas en appointment_services: duration + 15 min.
 */
export async function loadDayOccupiedAppointments(
  supabase: SupabaseClient,
  dateKey: string,
  catalog?: ServiceCatalog,
  excludeId?: string,
): Promise<LoadedOccupiedAppointment[]> {
  let q = supabase
    .from("appointments")
    .select("id, date, duration, status")
    .gte("date", `${dateKey} 00:00:00`)
    .lt("date", `${dateKey} 23:59:59`)
    .neq("status", "cancelled");
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) {
    console.error("[WABA] loadDayOccupiedAppointments:", error.message);
    return [];
  }
  const rows = (data ?? []) as {
    id: string;
    date: string;
    duration: number;
  }[];
  if (rows.length === 0) return [];

  const apptIds = rows.map((r) => r.id);
  const svcByAppt = new Map<string, string[]>();
  if (catalog) {
    const { data: svcRows, error: svcErr } = await supabase
      .from("appointment_services")
      .select("appointment_id, service_id")
      .in("appointment_id", apptIds);
    if (svcErr) {
      console.error(
        "[WABA] loadDayOccupiedAppointments services:",
        svcErr.message,
      );
    } else {
      for (
        const row of (svcRows ?? []) as {
          appointment_id: string;
          service_id: string;
        }[]
      ) {
        const list = svcByAppt.get(row.appointment_id) ?? [];
        list.push(row.service_id);
        svcByAppt.set(row.appointment_id, list);
      }
    }
  }

  return rows.map((row) => {
    const startDate = parseLimaLocalToDate(row.date) ?? new Date(row.date);
    const startMinutes = limaMinutes(startDate);
    const serviceIds = svcByAppt.get(row.id) ?? [];
    let endMinutes: number;
    let needsStephaniMeal = true;
    let beds = 1;
    const lanes = new Set<ExtensionesLane>();

    if (catalog && serviceIds.length > 0) {
      const services = catalogServicesForIds(serviceIds, catalog);
      let occupied = occupiedMinutesForComposition(
        serviceIds,
        services,
        catalog.packSlotMinutes,
        row.duration ?? 0,
      );
      // Duración guardada distinta a la suma del catálogo (pack de 2: 75,
      // o ajuste manual): nunca ocupa menos que eso.
      const catalogSum = services.reduce((s, svc) => s + svc.duration, 0);
      if (row.duration > 0 && row.duration !== catalogSum) {
        occupied = Math.max(occupied, row.duration);
      }
      endMinutes = startMinutes + occupied;
      beds = bedsForServices(services);
      needsStephaniMeal = cartNeedsStephaniMeal(serviceIds, catalog);
      for (const sid of serviceIds) {
        const lane = classifyOccupiedCapacityLane(sid, catalog);
        if (lane) lanes.add(lane);
      }
    } else {
      endMinutes = startMinutes + (row.duration ?? 0) + OTHER_TURNOVER_MINUTES;
    }

    return {
      id: row.id,
      startMinutes,
      endMinutes,
      serviceIds,
      needsStephaniMeal,
      lanes,
      beds,
    };
  });
}

const EVALUATION_MIN_MINUTES = 15;

export type EvaluationOccupiedSlot = {
  startMinutes: number;
  endMinutes: number;
};

/**
 * Huecos libres ≥ minGap dentro de la envolvente 1ª→última cita del día.
 * No incluye el intervalo de la cita (evitar evaluación encima de otra clienta).
 * Pura: unit-testeable sin Supabase (PR #134 review).
 */
export function computeEvaluationGaps(
  occupied: EvaluationOccupiedSlot[],
  opts: {
    nowMinutes: number;
    openMinutes: number;
    closeMinutes: number;
    minGapMinutes?: number;
  },
): { start: number; end: number }[] {
  const minGap = opts.minGapMinutes ?? EVALUATION_MIN_MINUTES;
  if (occupied.length === 0) return [];

  const sorted = [...occupied].sort((a, b) => a.startMinutes - b.startMinutes);
  const presenceStart = Math.max(
    sorted[0]!.startMinutes,
    opts.openMinutes,
    opts.nowMinutes,
  );
  const presenceEnd = Math.min(
    sorted[sorted.length - 1]!.endMinutes,
    opts.closeMinutes,
  );
  if (presenceEnd - presenceStart < minGap) return [];

  const gaps: { start: number; end: number }[] = [];
  let cursor = presenceStart;
  for (const appt of sorted) {
    const busyStart = Math.max(appt.startMinutes, presenceStart);
    const busyEnd = Math.min(appt.endMinutes, presenceEnd);
    if (busyEnd <= cursor || busyStart >= presenceEnd) continue;
    if (busyStart > cursor && busyStart - cursor >= minGap) {
      gaps.push({ start: cursor, end: busyStart });
    }
    cursor = Math.max(cursor, busyEnd);
  }
  if (presenceEnd - cursor >= minGap) {
    gaps.push({ start: cursor, end: presenceEnd });
  }
  return gaps;
}

/**
 * Huecos libres de HOY (hora Lima) mientras ya hay equipo en el salón por
 * citas agendadas. No usa el intervalo de la cita en sí (evitar ofrecer
 * evaluación encima de otra clienta): toma la envolvente 1ª→última cita del
 * día y lista los huecos ≥15 min entre ellas. Sin citas hoy → null (no se
 * abre el salón solo para evaluar). Privacidad: solo rangos de hora.
 * Caso Milagros Saldaña (18-sep-2026); ajuste review PR #134.
 */
export async function getEvaluationWindowsTodayLabel(
  supabase: SupabaseClient,
): Promise<string | null> {
  const dateKey = getDateKeyLima(new Date());
  if (isSalonClosed(dateKey)) return null;

  const occupied = await loadDayOccupiedAppointments(supabase, dateKey);
  if (occupied.length === 0) return null;

  const nowMinutes = limaMinutes(new Date());
  const closeMinutes = salonCloseMinutesForDateKey(dateKey);
  const gaps = computeEvaluationGaps(occupied, {
    nowMinutes,
    openMinutes: SALON_OPEN_MINUTES,
    closeMinutes,
  });
  if (gaps.length === 0) return null;

  const ranges = gaps
    .slice(0, 2)
    .map(
      (w) =>
        `${formatSlotLabel(Math.floor(w.start / 60), w.start % 60)}–${
          formatSlotLabel(Math.floor(w.end / 60), w.end % 60)
        }`,
    );

  return (
    `VENTANAS DE EVALUACIÓN HOY: ${
      ranges.join(" y ")
    } (huecos libres mientras ` +
    "ya hay equipo en el salón por citas agendadas — no encima de otra clienta). " +
    "Solo en estos rangos se puede ofrecer la evaluación gratuita de 15 min " +
    "sin cita previa — fuera de estos rangos no hay evaluación disponible hoy."
  );
}

/**
 * Devuelve hasta cuatro servicios cortos que caben en algún hueco real del
 * día. Son alternativas para una sola cita; no habilitan solapamientos.
 * El bloque de almuerzo es flexible: solo se exige un descanso si ya hubo
 * trabajo en la mañana.
 */
export async function getShortServiceSuggestionsForDate(
  supabase: SupabaseClient,
  catalog: ServiceCatalog,
  dateKey: string,
  maxSuggestions = 4,
): Promise<CatalogService[]> {
  const dayOfWeek = dayOfWeekFromDateKey(dateKey);
  const slots = getSalonTimeSlots(dayOfWeek, dateKey);
  if (slots.length === 0) return [];

  const dayAppts = await loadDayOccupiedAppointments(
    supabase,
    dateKey,
    catalog,
  );
  const intervals: AgendaInterval[] = dayAppts.map((a) => ({
    start: a.startMinutes,
    end: a.endMinutes,
  }));
  const salonClose = salonCloseMinutesForDateKey(dateKey);

  const candidates = [...catalog.services]
    .filter(
      (service) =>
        service.is_active &&
        service.duration > 0 &&
        service.duration <= SHORT_SERVICE_MAX_MINUTES,
    )
    .sort((a, b) => a.duration - b.duration || a.name.localeCompare(b.name));

  const result: CatalogService[] = [];
  for (const service of candidates) {
    const occupied = occupiedMinutesForServices([service]);
    const incomingNeedsMeal = cartNeedsStephaniMeal([service.id], catalog);
    const fits = slots.some(({ hour, minute }) => {
      const start = hour * 60 + minute;
      const candidate = { start, end: start + occupied };
      if (intervals.some((interval) => intervalsOverlap(candidate, interval))) {
        return false;
      }
      return passesMealGate(dayAppts, candidate, incomingNeedsMeal, salonClose);
    });
    if (fits) result.push(service);
    if (result.length >= maxSuggestions) break;
  }
  return result;
}

/**
 * Comprueba si un empleado está libre en la franja [date, date+duration].
 * No hay solapamiento con citas existentes (mismo empleado, no canceladas).
 *
 * Usada por el endpoint legacy n8n/Make (handlers/legacy.ts), que no tiene
 * acceso al ServiceCatalog completo ni a la categoría de las citas ya
 * existentes de ese empleado (solo id/date/duration) — por eso el turnover
 * de esas citas usa siempre OTHER_TURNOVER_MINUTES. `serviceCategoryId` sí
 * se conoce para la cita nueva (viene de la fila `services` del payload) y
 * se usa para su propio turnover, evitando el mismatch de 15 vs 30 min que
 * el resto del sistema aplica a la categoría uñas vía occupiedMinutesForServices.
 */
export async function checkAvailability(
  supabase: SupabaseClient,
  employeeId: string,
  date: Date,
  duration: number,
  excludeId?: string,
  serviceCategoryId?: string | null,
): Promise<boolean> {
  const candidateTurnover = turnoverMinutesForCategory(serviceCategoryId);
  const candidateEnd = new Date(
    date.getTime() + (duration + candidateTurnover) * 60000,
  );
  let q = supabase
    .from("appointments")
    .select("id, date, duration")
    .eq("employee_id", employeeId)
    .neq("status", "cancelled");
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  if (!data) return true;
  const hasOverlap = data.some((a: { date: string; duration: number }) => {
    const aStart = parseLimaLocalToDate(a.date) ?? new Date(a.date);
    const aEnd = new Date(
      aStart.getTime() + ((a.duration ?? 0) + OTHER_TURNOVER_MINUTES) * 60000,
    );
    return date < aEnd && candidateEnd > aStart;
  });
  return !hasOverlap;
}

/**
 * Cuenta citas ya agendadas (cualquier employee_id, incluido null) que se
 * solapan con el horario propuesto. El modelo "cita por horario" crea todas
 * las citas con employee_id null (se asigna chica después manualmente), por
 * lo que filtrar por employee_id específico nunca detecta el solapamiento
 * real — este conteo global es el único chequeo de capacidad confiable hoy.
 */
export async function countOverlappingAppointments(
  supabase: SupabaseClient,
  date: Date,
  duration: number,
  excludeId?: string,
  opts?: {
    catalog?: ServiceCatalog;
    serviceIds?: string[];
    dateKey?: string;
    preloaded?: LoadedOccupiedAppointment[];
  },
): Promise<number> {
  const dateKey = opts?.dateKey ?? getDateKeyLima(date);
  const catalog = opts?.catalog;
  const serviceIds = opts?.serviceIds ?? [];
  const candidate = buildCandidateInterval(date, catalog, serviceIds, duration);
  const dayAppts = opts?.preloaded ??
    (await loadDayOccupiedAppointments(supabase, dateKey, catalog, excludeId));
  return dayAppts.filter((a) =>
    intervalsOverlap(candidate, {
      start: a.startMinutes,
      end: a.endMinutes,
    })
  ).length;
}

/**
 * Solapes + carriles de extensiones ocupados (Stephani / Karelis).
 * Query base = misma que countOverlappingAppointments; servicios vía SELECT
 * separado (no join anidado PostgREST — en este proyecto vuelve vacío).
 */
export async function getOverlappingAppointmentsWithLanes(
  supabase: SupabaseClient,
  catalog: ServiceCatalog,
  date: Date,
  duration: number,
  excludeId?: string,
  opts?: {
    serviceIds?: string[];
    dateKey?: string;
    preloaded?: LoadedOccupiedAppointment[];
  },
): Promise<{ count: number; occupiedLanes: Set<ExtensionesLane> }> {
  const dateKey = opts?.dateKey ?? getDateKeyLima(date);
  const serviceIds = opts?.serviceIds ?? [];
  const candidate = buildCandidateInterval(date, catalog, serviceIds, duration);
  const dayAppts = opts?.preloaded ??
    (await loadDayOccupiedAppointments(supabase, dateKey, catalog, excludeId));
  const overlapping = dayAppts.filter((a) =>
    intervalsOverlap(candidate, {
      start: a.startMinutes,
      end: a.endMinutes,
    })
  );
  const occupiedLanes = new Set<ExtensionesLane>();
  for (const appt of overlapping) {
    for (const lane of appt.lanes) occupiedLanes.add(lane);
  }
  return { count: overlapping.length, occupiedLanes };
}

/**
 * ¿El slot admite este carrito?
 * - Sin carriles de extensiones: idéntico a hoy (`count < cap`).
 * - Con carriles: la 2.ª plaza solo existe si Karelis (recurso extra) está
 *   en el carrito o ya ocupando el slot. Sin Karelis, `cap` genérico —
 *   evita Manicure + Clásicas (ambas Stephani) con effectiveCap=2 (hotfix 23-ago).
 */
export function isSlotFreeForLanes(
  count: number,
  occupiedLanes: Set<ExtensionesLane>,
  cap: number,
  requiredLanes: Set<ExtensionesLane>,
): boolean {
  const karelisInPlay = requiredLanes.has("karelis") ||
    occupiedLanes.has("karelis");
  const effectiveCap = karelisInPlay ? Math.max(cap, 2) : cap;
  if (count >= effectiveCap) return false;
  for (const lane of requiredLanes) {
    if (occupiedLanes.has(lane)) return false;
  }
  return true;
}

/**
 * Chequeo único para confirmación (texto / tap / pago / reprog.):
 * filtro tarde Karelis + capacidad/carriles.
 */
/**
 * Camillas: lo que no es uñas usa una y hay SALON_BEDS. Un pack de 2 personas
 * (mismo servicio repetido) pide dos a la vez; Vanessa puede atender ambas.
 * Es un tope adicional: Karelis/Stephani y almuerzo se siguen evaluando igual.
 */
function incomingBeds(serviceIds: string[], catalog: ServiceCatalog): number {
  const beds = bedsForServices(catalogServicesForIds(serviceIds, catalog));
  if (beds === 0) return 0;
  return isTwoPersonSameServiceIds(serviceIds) ? 2 : 1;
}

function passesBedGate(
  dayAppts: LoadedOccupiedAppointment[],
  candidate: AgendaInterval,
  serviceIds: string[],
  catalog: ServiceCatalog,
): boolean {
  const needed = incomingBeds(serviceIds, catalog);
  if (needed === 0) return true;
  // Pico de camillas simultáneas dentro de la ventana de la candidata.
  const overlapping = dayAppts.filter((a) =>
    intervalsOverlap(candidate, { start: a.startMinutes, end: a.endMinutes })
  );
  const points = [
    candidate.start,
    ...overlapping.map((a) => a.startMinutes),
  ].filter((t) => t >= candidate.start && t < candidate.end);
  return points.every((t) => {
    const busy = overlapping
      .filter((a) => a.startMinutes <= t && a.endMinutes > t)
      .reduce((sum, a) => sum + a.beds, 0);
    return bedsAvailable(busy, needed);
  });
}

export async function hasSlotCapacityForServices(
  supabase: SupabaseClient,
  catalog: ServiceCatalog,
  date: Date,
  duration: number,
  serviceIds: string[],
  cap: number,
  excludeId?: string,
  opts?: { preloaded?: LoadedOccupiedAppointment[] },
): Promise<boolean> {
  if (date <= new Date()) return false;
  const dateKey = getDateKeyLima(date);
  // Con reglas de personal cargadas, el motor decide cupo, horario y días de aviso.
  // El carril fijo de Karelis queda solo para un negocio que todavía no las configuró.
  if (serviceIds.every((id) => catalog.servicesById.has(id))) {
    const hhmm = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Lima",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
    const decision = await employeeRulesDecision(
      supabase,
      dateKey,
      hhmm,
      serviceIds,
      excludeId,
    );
    if (decision === "deny") return false;
    if (decision === "allow") {
      const salonClose = salonCloseMinutesForDateKey(dateKey);
      const incomingNeedsMeal = cartNeedsStephaniMeal(serviceIds, catalog);
      const candidate = buildCandidateInterval(
        date,
        catalog,
        serviceIds,
        duration,
      );
      const dayAppts = opts?.preloaded ??
        (await loadDayOccupiedAppointments(
          supabase,
          dateKey,
          catalog,
          excludeId,
        ));
      return (
        passesMealGate(dayAppts, candidate, incomingNeedsMeal, salonClose) &&
        passesBedGate(dayAppts, candidate, serviceIds, catalog)
      );
    }
  }
  if (cartRequiresKarelisAfternoon(serviceIds, catalog)) {
    const hourLima = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Lima",
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .find((p) => p.type === "hour")?.value ?? "0",
    );
    if (hourLima < getKarelisAfternoonStartHour()) return false;
  }
  const salonClose = salonCloseMinutesForDateKey(dateKey);
  const incomingNeedsMeal = cartNeedsStephaniMeal(serviceIds, catalog);
  const candidate = buildCandidateInterval(date, catalog, serviceIds, duration);
  const dayAppts = opts?.preloaded ??
    (await loadDayOccupiedAppointments(supabase, dateKey, catalog, excludeId));
  if (!passesMealGate(dayAppts, candidate, incomingNeedsMeal, salonClose)) {
    return false;
  }
  if (!passesBedGate(dayAppts, candidate, serviceIds, catalog)) return false;
  const requiredLanes = cartExtensionesLanes(serviceIds, catalog);
  if (requiredLanes.size === 0) {
    const overlapping = dayAppts.filter((a) =>
      intervalsOverlap(candidate, {
        start: a.startMinutes,
        end: a.endMinutes,
      })
    ).length;
    return overlapping < cap;
  }
  const { count, occupiedLanes } = await getOverlappingAppointmentsWithLanes(
    supabase,
    catalog,
    date,
    duration,
    excludeId,
    { serviceIds, dateKey, preloaded: dayAppts },
  );
  return isSlotFreeForLanes(count, occupiedLanes, cap, requiredLanes);
}

/**
 * Un horario está disponible si el conteo de solapes es menor que `cap`.
 * cap=1 (default): tope histórico 1 cita/franja.
 * cap=2: carrito 100% especial (Vanessa puede ejecutar en paralelo).
 * Con `requiredLanes` + `catalog`: también bloquea si el carril ya está ocupado.
 */
async function slotHasAvailability(
  supabase: SupabaseClient,
  slotDate: Date,
  totalDuration: number,
  cap: number = 1,
  opts?: {
    catalog?: ServiceCatalog;
    requiredLanes?: Set<ExtensionesLane>;
    serviceIds?: string[];
    excludeId?: string;
    preloaded?: LoadedOccupiedAppointment[];
    dayCache?: Map<string, LoadedOccupiedAppointment[]>;
  },
): Promise<boolean> {
  if (slotDate <= new Date()) return false;
  const catalog = opts?.catalog;
  const serviceIds = opts?.serviceIds ?? [];
  const dateKey = getDateKeyLima(slotDate);
  let preloaded = opts?.preloaded;
  if (!preloaded && opts?.dayCache) {
    const cacheKey = `${dateKey}:${opts.excludeId ?? ""}`;
    preloaded = opts.dayCache.get(cacheKey);
    if (!preloaded) {
      preloaded = await loadDayOccupiedAppointments(
        supabase,
        dateKey,
        catalog,
        opts.excludeId,
      );
      opts.dayCache.set(cacheKey, preloaded);
    }
  }
  if (catalog && serviceIds.length > 0) {
    return hasSlotCapacityForServices(
      supabase,
      catalog,
      slotDate,
      totalDuration,
      serviceIds,
      cap,
      opts?.excludeId,
      { preloaded },
    );
  }
  const salonClose = salonCloseMinutesForDateKey(dateKey);
  const incomingNeedsMeal = catalog
    ? cartNeedsStephaniMeal(serviceIds, catalog)
    : true;
  const candidate = buildCandidateInterval(
    slotDate,
    catalog,
    serviceIds,
    totalDuration,
  );
  const dayAppts = preloaded ??
    (await loadDayOccupiedAppointments(
      supabase,
      dateKey,
      catalog,
      opts?.excludeId,
    ));
  if (!passesMealGate(dayAppts, candidate, incomingNeedsMeal, salonClose)) {
    return false;
  }
  const requiredLanes = opts?.requiredLanes;
  if (requiredLanes && requiredLanes.size > 0 && catalog) {
    const { count, occupiedLanes } = await getOverlappingAppointmentsWithLanes(
      supabase,
      catalog,
      slotDate,
      totalDuration,
      opts?.excludeId,
      { serviceIds, dateKey, preloaded: dayAppts },
    );
    return isSlotFreeForLanes(count, occupiedLanes, cap, requiredLanes);
  }
  const overlapping = dayAppts.filter((a) =>
    intervalsOverlap(candidate, {
      start: a.startMinutes,
      end: a.endMinutes,
    })
  ).length;
  return overlapping < cap;
}

/**
 * Ventana para no reenviar un selector idéntico (mismo header) al mismo
 * teléfono — evita el spam visto con Yesenia 2026-07-11 (2 mensajes en 8s,
 * fuera de COALESCE_WINDOW_MS, generando 2 llamadas Haiku + 2 listas iguales).
 */
const SELECTOR_RESEND_DEBOUNCE_MS = 15000;

async function wasListRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  header: string,
  windowMs: number = SELECTOR_RESEND_DEBOUNCE_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  // Lista interactiva OK
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .eq("msg_type", "interactive")
    .ilike("content", `[lista] ${header}:%`)
    .gte("created_at", since)
    .limit(1);
  if (error) {
    console.error("[WABA] wasListRecentlySent query:", error.message);
    return false;
  }
  if ((data?.length ?? 0) > 0) return true;

  // Fallback texto cuando Meta rechaza la lista (mismo spam post-Haiku)
  const { data: textRows, error: textErr } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .eq("msg_type", "text")
    .ilike("content", `⏰ Horarios disponibles%`)
    .gte("created_at", since)
    .limit(1);
  if (textErr) {
    console.error("[WABA] wasListRecentlySent text query:", textErr.message);
    return false;
  }
  return (textRows?.length ?? 0) > 0;
}

/**
 * Selector de fecha como lista interactiva.
 * Solo muestra días con al menos una franja donde haya minEmployeesFree empleados libres.
 * Fechas y horas se interpretan siempre en Lima (UTC-5).
 *
 * `catalog` + `serviceIds`: carriles extensiones + filtro tarde Karelis.
 * `opts.debounce`: solo para reenvíos post-Haiku (`resendDatetimeSelectors`).
 */
export async function sendDateSelector(
  to: string,
  supabase: SupabaseClient,
  _employeeIds: string[],
  totalDuration: number,
  cap: number = 1,
  _minEmployeesFree: number = 1,
  catalog?: ServiceCatalog,
  serviceIds: string[] = [],
  opts?: { debounce?: boolean },
) {
  if (
    opts?.debounce &&
    (await wasListRecentlySent(supabase, to, "Elegir fecha"))
  ) {
    console.log(
      "[WABA] sendDateSelector: selector ya enviado hace <15s, se omite reenvío:",
      to.slice(-4),
    );
    return;
  }

  const requiredLanes = catalog && serviceIds.length > 0
    ? cartExtensionesLanes(serviceIds, catalog)
    : new Set<ExtensionesLane>();
  const dayCache = new Map<string, LoadedOccupiedAppointment[]>();

  const nowUtc = new Date();
  const limaToday = new Date(
    nowUtc.getTime() - LIMA_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );
  const limaY = limaToday.getUTCFullYear();
  const limaM = limaToday.getUTCMonth();
  const limaD = limaToday.getUTCDate();
  const rows: { id: string; title: string; description: string }[] = [];

  for (let d = 0; d < 14 && rows.length < 7; d++) {
    const candidate = new Date(Date.UTC(limaY, limaM, limaD + d, 12, 0, 0));
    const dayOfWeek = candidate.getUTCDay();
    const y = candidate.getUTCFullYear();
    const m = candidate.getUTCMonth() + 1;
    const day = candidate.getUTCDate();
    const dateKeyStr = getDateKeyFromYmd(y, m, day);
    const slots = getSalonTimeSlots(dayOfWeek, dateKeyStr);

    let hasSlot = false;
    let slotsChecked = 0;
    for (const { hour, minute } of slots) {
      slotsChecked++;
      const slotDate = limaSlotToUtcDate(y, m, day, hour, minute);
      const ok = await slotHasAvailability(
        supabase,
        slotDate,
        totalDuration,
        cap,
        catalog
          ? { catalog, requiredLanes, serviceIds, dayCache }
          : { dayCache },
      );
      if (ok) {
        hasSlot = true;
        break;
      }
    }
    if (!hasSlot) {
      console.log(
        "[WABA] sendDateSelector skip day",
        dateKeyStr,
        "dur=",
        totalDuration,
        "cap=",
        cap,
        "slots=",
        slotsChecked,
        "svc=",
        serviceIds.length,
      );
      continue;
    }

    const labelShort = formatDateKeyShort(dateKeyStr);
    rows.push({
      id: `${WA_IDS.DATE_PREFIX}${dateKeyStr}`,
      title: labelShort,
      description: getDateSelectorDescription(dateKeyStr),
    });
  }

  console.log(
    "[WABA] sendDateSelector rows:",
    rows.map((r) => r.id.replace(WA_IDS.DATE_PREFIX, "")).join(","),
    "dur=",
    totalDuration,
    "cap=",
    cap,
  );

  if (rows.length === 0) {
    await sendMessage(
      to,
      "No hay fechas disponibles en los próximos días. Por favor escríbenos al 📱 932 535 512.",
    );
    return;
  }

  rows.push({
    id: WA_IDS.VOLVER_CARRITO,
    title: "↩ Ver selección",
    description: "Volver al carrito",
  });

  const ok = await sendInteractiveList(
    to,
    "Elegir fecha",
    "¿Qué día prefieres?",
    "Ver fechas",
    [{ title: "Fechas disponibles", rows }],
    undefined,
    { force: opts?.debounce === false },
  );
  if (!ok) {
    const fallback = rows.map((r) => `• ${r.title}`).join("\n");
    await sendMessage(
      to,
      `📅 Fechas disponibles:\n\n${fallback}\n\n` +
        "Si no ves el selector, responde con *menu* para reintentar.",
    );
  }
}

/**
 * Selector de hora como lista interactiva (slots cada 30 min).
 * Horas en Lima (UTC-5); los slots se guardan en UTC en BD.
 * `catalog` + `serviceIds`: carriles + filtro tarde Karelis.
 * `opts.debounce`: ver `sendDateSelector`.
 */
export async function sendTimeSelector(
  to: string,
  supabase: SupabaseClient,
  dateKey: string,
  _employeeIds: string[],
  totalDuration: number,
  cap: number = 1,
  _minEmployeesFree: number = 1,
  catalog?: ServiceCatalog,
  serviceIds: string[] = [],
  opts?: { debounce?: boolean; introMessage?: string; pageOffset?: number },
): Promise<boolean> {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dayOfWeek = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0),
  ).getUTCDay();
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const dayLabel = `${days[dayOfWeek]} ${day} de ${months[month - 1]}`;
  const pageOffset = opts?.pageOffset ?? 0;
  const timeSelectorHeader = (
    pageOffset > 0 ? `Más · ${dayLabel}` : dayLabel
  ).slice(0, 60);

  if (
    opts?.debounce &&
    (await wasListRecentlySent(supabase, to, timeSelectorHeader))
  ) {
    console.log(
      "[WABA] sendTimeSelector: selector ya enviado hace <15s, se omite reenvío:",
      to.slice(-4),
    );
    return true;
  }

  const requiredLanes = catalog && serviceIds.length > 0
    ? cartExtensionesLanes(serviceIds, catalog)
    : new Set<ExtensionesLane>();
  const dayCache = new Map<string, LoadedOccupiedAppointment[]>();

  const slots = getSalonTimeSlots(dayOfWeek, dateKey);
  const advanceRate = getAdvancePaymentRate(dateKey);

  if (isSalonClosed(dateKey)) {
    await sendMessage(to, getSalonClosedMessage(dateKey));
    return false;
  }

  if (isSunday(dateKey) && advanceRate === 0.2) {
    // Sin `completed` el abono es S/25 fijo — no nombrar "20%" (Estrella PE.…5896).
    const { clientRequiresFixedDeposit } = await import(
      "./pending-appointment.ts"
    );
    const fixedDeposit = await clientRequiresFixedDeposit(supabase, to);
    if (fixedDeposit) {
      await sendMessage(
        to,
        `📅 *Domingo — cita previa*\n\n` +
          `Los domingos atendemos con *cita previa*. Al confirmar te indico cómo reservar tu cupo.\n\n` +
          `Si necesitas coordinar algo antes, escríbenos al 📱 *${YAPE_PLIN_NUMBER}* 💜`,
      );
    } else {
      await sendMessage(
        to,
        `📅 *Domingo — cita previa*\n\n` +
          `Los domingos confirmamos la cita solo con *adelanto del 20%*. ` +
          `Tras validar tu pago te confirmamos aquí.\n\n` +
          `Si necesitas coordinar algo antes, escríbenos al 📱 *${YAPE_PLIN_NUMBER}* 💜`,
      );
    }
  } else if (isPeruHoliday(dateKey)) {
    await sendMessage(
      to,
      `📅 *Feriado*\n\n` +
        `Ese día atendemos solo de *10:00 AM a 12:00 PM* (CC Las Plazuelas cierra a la 1 PM).`,
    );
  }

  const availableRows: { id: string; title: string; description: string }[] =
    [];

  for (const { hour, minute } of slots) {
    const slotDate = limaSlotToUtcDate(year, month, day, hour, minute);
    const ok = await slotHasAvailability(
      supabase,
      slotDate,
      totalDuration,
      cap,
      catalog ? { catalog, requiredLanes, serviceIds, dayCache } : { dayCache },
    );
    if (!ok) continue;

    availableRows.push({
      id: buildTimeRowId(dateKey, hour, minute),
      title: formatSlotLabel(hour, minute),
      description: "Disponible",
    });
  }

  if (availableRows.length === 0) {
    await sendMessage(
      to,
      dayOfWeek === 6
        ? `Sí trabajamos sábados de 10 AM a 6 PM, pero el ${dayLabel} no hay un horario disponible que alcance para tu selección. Elige otro día 💜`
        : `El ${dayLabel} no hay horarios con cupo. Elige otro día 💜`,
    );
    return false;
  }

  if (opts?.introMessage?.trim()) {
    await sendMessage(to, opts.introMessage.trim());
  }

  // Misma paginación que servicios/packs (13-sep): 16 medias horas no caben
  // en 10 filas. Antes se quedaba con 5 de mañana y 4 de tarde y las 5 PM
  // no entraban en el payload. "▶ Ver más horarios" abre el resto.
  const pageRows = buildTimeListPage(availableRows, pageOffset, dateKey);
  const sections = [{ title: "Horarios", rows: pageRows }];

  const ok = await sendInteractiveList(
    to,
    timeSelectorHeader,
    `¿A qué hora te queda bien el ${dayLabel}?`,
    "Ver horarios",
    sections,
    undefined,
    { force: opts?.debounce === false },
  );
  if (!ok) {
    const fallback = availableRows.map((r) => r.title).join(" | ");
    await sendMessage(
      to,
      `⏰ Horarios disponibles el ${dayLabel}:\n\n${fallback}\n\n` +
        "Si no ves el selector, responde con *menu* para volver al inicio.",
    );
  }
  return true;
}
