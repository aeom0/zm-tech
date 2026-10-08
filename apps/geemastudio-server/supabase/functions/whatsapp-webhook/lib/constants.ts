// constants.ts — IDs y configuración del flujo WABA

import {
  getHolidayOpenUntilHour,
  isPeruHoliday,
  isSalonClosed,
} from "./peru-holidays.ts";
import { getLoadedWabaRules } from "./tenant-rules-store.ts";
import type { TenantWabaScheduleRules } from "./tenant-rules.ts";

/** Teléfono para notificar a admins (nuevas reservas por validar). */
export const ADMIN_PHONE = "51932535512";
export const YAPE_PLIN_NUMBER = "932 535 512";

/** Medios de pago para mostrar al cliente. */
export const MEDIOS_DE_PAGO = `📲 *Medios de pago:*

*BCP:* 194 - 73549500-22
*CCI:* 002194 - 0073549500 - 2298

*Yape // Plin:* 932 535 512

*ZM lash and nails Beauty*`;

export const WA_IDS = {
  CATEGORY_PREFIX: "cat_",
  SUBCATEGORY_PREFIX: "subcat_",
  SERVICE_PREFIX: "svc_",
  PACK_PREFIX: "pack_",
  EMPLOYEE_PREFIX: "emp_",
  CUALQUIERA: "emp_cualquiera",
  AGREGAR_OTRO: "agregar_otro",
  VER_SELECCION: "ver_seleccion",
  AGENDAR_YA: "agendar_ya",
  VACIAR_CARRITO: "vaciar_carrito",
  VOLVER_CATEGORIAS: "volver_categorias",
  /**
   * Volver a subcategorías Uñas/Extensiones.
   * Payload: `cat-unas` | `cat-extensiones`.
   */
  VOLVER_SUBCAT_PREFIX: "volver_sub_",
  /** Desde selector de fecha → opciones de carrito. */
  VOLVER_CARRITO: "volver_carrito",
  /** Desde selector de hora → reabrir fechas. */
  VOLVER_FECHAS: "volver_fechas",
  DATE_PREFIX: "date_",
  TIME_PREFIX: "time_",
  /**
   * Página siguiente/anterior del selector de hora.
   * Payload: `<YYYY-MM-DD>__<offset>`. Prefijo distinto de `time_`.
   */
  TIME_PAGE_PREFIX: "pg_time_",
  /**
   * Elegir vista o volver al chooser.
   * Payload: `<scopeId>__services` | `<scopeId>__packs` | `<scopeId>__chooser`.
   */
  VIEW_PREFIX: "view_",
  /**
   * Paginar packs cuando superan el tope de filas (ej. cat-lifting, 15 packs).
   * Payload: `<scopeId>__<offset>`.
   */
  PACKS_PAGE_PREFIX: "pg_pack_",
  /**
   * Paginar servicios solos cuando superan el tope (ej. Extensiones nuevas, 11).
   * Payload: `<scopeId>__<offset>`. Prefijo corto distinto de filas `svc_`.
   */
  SERVICES_PAGE_PREFIX: "pg_svc_",
} as const;

/** Default ZM. Los handlers deben usar `getEmployeeCategories()` (lee waba_rules). */
export const EMPLOYEE_CATEGORIES: Record<string, string[]> = {
  "cat-extensiones": ["emp-sthefani"],
  "cat-lifting": ["emp-sthefani", "emp-vanessa"],
  "cat-cejas-rostro": ["emp-sthefani"],
  "cat-microblading": ["emp-alejandra"],
  "cat-depilacion": ["emp-sthefani"],
  "cat-unas": ["emp-sthefani"],
};

/** Staff↔categoría del tenant actual (waba_rules.staffByCategory); ZM si no hay reglas cargadas. */
export function getEmployeeCategories(): Record<string, string[]> {
  return getLoadedWabaRules()?.staffByCategory ?? EMPLOYEE_CATEGORIES;
}

/** Medios de pago del tenant actual (waba_rules.paymentMethodsText); ZM si no hay reglas cargadas. */
export function getMediosDePago(): string {
  return getLoadedWabaRules()?.paymentMethodsText ?? MEDIOS_DE_PAGO;
}

/** Por categoría: texto para solicitar foto previa (clienta primera vez). */
export const PRE_SERVICE_PHOTO_BY_CATEGORY: Record<string, string> = {
  "cat-unas": "tus manos (para validar que no haya hongos)",
  "cat-lifting": "tu rostro",
  "cat-cejas-rostro": "tu rostro",
  "cat-extensiones": "tu rostro",
  "cat-microblading": "tu rostro",
  "cat-depilacion": "la zona a tratar",
};

export const SALON_HOURS_WEEKDAY = [10, 11, 12, 13, 14, 15, 16, 17];
export const SALON_HOURS_SUNDAY = [10, 11, 12];
export const SALON_SLOT_MINUTES = [0, 30] as const;

/** Feriado nacional (CC abre): citas desde 10:00 hasta openUntil (sin :30 en la última hora). */
function getHolidayTimeSlots(
  openUntilHour: number,
): { hour: number; minute: number }[] {
  const until = Math.min(18, Math.max(10, Math.trunc(openUntilHour)));
  const slots: { hour: number; minute: number }[] = [];
  for (let hour = 10; hour <= until; hour++) {
    for (const minute of SALON_SLOT_MINUTES) {
      if (hour === until && minute === 30) continue;
      slots.push({ hour, minute });
    }
  }
  return slots;
}

/**
 * Slots de 30 min según día (Dom sin 10:00 — abre 10:30).
 * Feriados con CC abierto: hasta open_until_hour (default 12). Feriados cerrados: [].
 */
export function getSalonTimeSlots(
  dayOfWeek: number,
  dateKey?: string,
): { hour: number; minute: number }[] {
  if (dateKey && isSalonClosed(dateKey)) {
    return [];
  }
  if (dateKey && isPeruHoliday(dateKey)) {
    return getHolidayTimeSlots(getHolidayOpenUntilHour(dateKey));
  }
  const rules = getLoadedWabaRules()?.schedule;
  if (rules) return slotsFromSchedule(rules, dayOfWeek);
  const hours = dayOfWeek === 0 ? SALON_HOURS_SUNDAY : SALON_HOURS_WEEKDAY;
  const slots: { hour: number; minute: number }[] = [];
  for (const hour of hours) {
    for (const minute of SALON_SLOT_MINUTES) {
      if (dayOfWeek === 0 && hour === 10 && minute === 0) continue;
      slots.push({ hour, minute });
    }
  }
  if (dayOfWeek === 0) {
    slots.push({ hour: 13, minute: 0 });
  }
  return slots;
}

function parseHm(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Slots [open, close) con minutos de `slotMinutes`; domingo suma `sundayExtraSlots`. */
function slotsFromSchedule(
  rules: TenantWabaScheduleRules,
  dayOfWeek: number,
): { hour: number; minute: number }[] {
  const range = dayOfWeek === 0 ? rules.sunday : rules.weekday;
  if (!range) return [];
  const open = parseHm(range.open);
  const close = parseHm(range.close);
  if (open === null || close === null) return [];
  const slots: { hour: number; minute: number }[] = [];
  for (let t = open; t < close; t++) {
    const minute = t % 60;
    if (rules.slotMinutes.includes(minute)) {
      slots.push({ hour: Math.floor(t / 60), minute });
    }
  }
  if (dayOfWeek === 0) {
    for (const extra of rules.sundayExtraSlots ?? []) {
      const t = parseHm(extra);
      if (t !== null) slots.push({ hour: Math.floor(t / 60), minute: t % 60 });
    }
  }
  return slots;
}

/** Valida hora Lima + minutos dentro del horario del salón. */
export function isValidSalonSlot(
  hourLima: number,
  minuteLima: number,
  dayOfWeek: number,
  dateKey?: string,
): boolean {
  return getSalonTimeSlots(dayOfWeek, dateKey).some(
    (s) => s.hour === hourLima && s.minute === minuteLima,
  );
}

/** Perú (Lima) = UTC-5. Hora Lima h → UTC = h + LIMA_UTC_OFFSET_HOURS (ej. 10 Lima = 15 UTC). */
export const LIMA_UTC_OFFSET_HOURS = 5;

/** Categorías 100% especiales: cualquier servicio activo de estas categorías
 * cuenta como especial (Vanessa puede ejecutarlos además de Stephani). */
export const SPECIAL_OVERLAP_CATEGORIES = [
  "cat-lifting",
  "cat-depilacion",
  "cat-microblading",
] as const;

/** Excepciones puntuales de cat-cejas-rostro que SÍ cuentan como especiales
 * aunque el resto de la categoría no. IDs confirmados 22-ago-2026. */
export const SPECIAL_OVERLAP_EXTRA_SERVICE_IDS = [
  "52a4f6bb-5bc5-4e7e-951a-70672984bf71", // Depilación de Bozo
  "96f071d5-b156-4c11-9b6e-20650e5f8cd8", // Depilación de Cejas
] as const;

/**
 * Técnicas de cat-extensiones que atiende Karelis (destajo, emp-karelis).
 * Solo turno tarde (ver KARELIS_AFTERNOON_START_HOUR). Independiente de
 * SPECIAL_OVERLAP_* (modelo Vanessa).
 */
export const EXTENSIONES_KARELIS_SERVICE_IDS = [
  "98772a98-f454-4722-a73f-8b2bab72bfa7", // Anime
  "b266268d-11a2-43f4-b5f2-b6982860fed6", // Fox
  "8a4bb573-292c-4634-8583-42517c527d63", // Hawaiana
  "3efc5fd1-320d-4d48-9fa1-6761035260b4", // Mega Volumen
  "5df66076-5b74-40d6-bb6d-8eacc2191e2a", // Wispy Glam
] as const;

/**
 * Retiro de Pestañas: cat-extensiones pero sin carril (cualquiera lo hace).
 * Se queda con tope genérico cap=1 — no entra al modelo Stephani/Karelis.
 */
export const EXTENSIONES_NO_LANE_SERVICE_IDS = [
  "af7491a3-8e7e-4683-ba97-459551b9f99a", // Retiro de Pestañas
] as const;

/** Hora Lima desde la cual Karelis puede atender (inclusive). */
export const KARELIS_AFTERNOON_START_HOUR = 13;

// ── Capacidad por tenant (S5-3): getters sobre waba_rules.capacity; ZM si no hay reglas ──

export function getSpecialOverlapCategories(): readonly string[] {
  return (
    getLoadedWabaRules()?.capacity.specialCategoryIds ??
      SPECIAL_OVERLAP_CATEGORIES
  );
}

export function getSpecialOverlapExtraServiceIds(): readonly string[] {
  return (
    getLoadedWabaRules()?.capacity.specialExtraServiceIds ??
      SPECIAL_OVERLAP_EXTRA_SERVICE_IDS
  );
}

export function getExtensionesKarelisServiceIds(): readonly string[] {
  return (
    getLoadedWabaRules()?.capacity.extensionesKarelisServiceIds ??
      EXTENSIONES_KARELIS_SERVICE_IDS
  );
}

export function getExtensionesNoLaneServiceIds(): readonly string[] {
  return (
    getLoadedWabaRules()?.capacity.unassignedCapServiceIds ??
      EXTENSIONES_NO_LANE_SERVICE_IDS
  );
}

export function getKarelisAfternoonStartHour(): number {
  return (
    getLoadedWabaRules()?.capacity.karelisAfterHour ??
      KARELIS_AFTERNOON_START_HOUR
  );
}

export function getDefaultOverlapCap(): number {
  return getLoadedWabaRules()?.capacity.defaultCap ?? 1;
}

export function getSpecialOverlapCap(): number {
  return getLoadedWabaRules()?.capacity.specialCap ?? 2;
}
