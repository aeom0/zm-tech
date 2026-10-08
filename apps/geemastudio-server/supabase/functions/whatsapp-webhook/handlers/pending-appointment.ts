// pending-appointment.ts — Citas pendientes por WA: contexto, reprogramación (UPDATE fecha)

import { sendInteractiveList, sendMessage } from "../wa-api.ts";
import {
  formatCartSummary,
  formatCartSummaryFromLines,
  formatDateSpanish,
  formatSoles,
  limaIsoWeekday,
  orderedServicesFromIds,
  parseLimaLocalToDate,
  toLimaLocalTimestamp,
} from "../format.ts";
import {
  type CartItem,
  clearCart,
  expandCartItemsToServiceIds,
  getPhoneCountryAndNormalizedFromWa,
  getSession,
  type SupabaseClient,
  upsertSession,
} from "../lib/supabase.ts";
import { isWaBsuid } from "../lib/wa-recipient.mjs";
import { notifyAdmins } from "../lib/notify.ts";
import type {
  AppointmentServiceLine,
  CartPriceAdjustment,
  ServiceCatalog,
} from "../lib/services-catalog.ts";
import {
  overlapCapForCart,
  recomputeAppointmentLinesForWeekday,
} from "../lib/services-catalog.ts";
import { hasSlotCapacityForServices, sendDateSelector } from "./agenda.ts";
import { getEmployeeCategories } from "../lib/constants.ts";

const REPRO_PREFIX = "repro_";

export type PendingAppointmentRow = {
  id: string;
  date: string;
  price: string;
  duration: number;
  client_phone: string | null;
  /** Nombres de servicios (desde appointment_services o fallback). */
  serviceLabels: string[];
};

/** Cancelación de cita existente (no confundir con NEGACIONES / "no quiero agendar"). */
export function matchesCancelCitaIntent(lower: string): boolean {
  // Sin tildes: "quisiera"/"podría"/"reserva" no estaban cubiertos (Luciana …6431, 4-oct).
  const t = lower.normalize("NFD").replace(/\p{M}/gu, "");
  const phrases = [
    "cancelar cita",
    "cancelar mi cita",
    "cancelar la cita",
    "cancelar reserva",
    "cancelar mi reserva",
    "cancelar la reserva",
    "cancelar mi cupo",
    "cancelo mi cita",
    "cancelo mi reserva",
    "voy a cancelar",
    "tengo que cancelar",
    "quiero cancelar",
    "quisiera cancelar",
    "necesito cancelar",
    "deseo cancelar",
    "me gustaria cancelar",
    "puedo cancelar",
    "podria cancelar",
    "anular cita",
    "anular mi cita",
    "anular reserva",
    "anular mi reserva",
    "quiero anular",
    "quisiera anular",
  ];
  return phrases.some((p) => t.includes(p));
}

/**
 * Cierre de acuerdo en tono peruano: "ya", "ya gracias" = quedó cerrado.
 * No es afirmativo para seguir agendando (no remapear a agendar_ya).
 */
export function matchesClosingAgreementIntent(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!¡.]+$/g, "")
    .replace(/\s+/g, " ");
  if (!t || t.length > 40) return false;
  if (/^(ya|ya gracias|ya grax|gracias ya|listo ya|ok ya|oka ya)$/.test(t)) {
    return true;
  }
  if (/^ya\s+(gracias|grax|listo|quedo|quedamos)\b/.test(t)) return true;
  if (/^(gracias|grax)\s*,?\s*ya$/.test(t)) return true;
  return false;
}

export const CLOSING_AGREEMENT_ACK =
  "¡Listo! Quedamos así 💜 Cualquier cosa nos escribes.";

/** Frases que indican que la usuaria habla de una cita ya existente (no una nueva reserva). */
export function matchesMiCitaIntent(lower: string): boolean {
  // "Reserve mi cita" / "resérvame mi cita" = pedido de NUEVA reserva (imperativo),
  // no consulta de una cita ya existente. Sin este guard, "mi cita" matchea igual
  // y la clienta recibe "no tenemos citas pendientes" cuando en realidad quiere agendar
  // (caso Milagros Saldaña, 18-sep-2026: "Reserve mi cita por la mañana").
  if (/\b(reserve|res[eé]rvame|res[eé]rveme)\s+mi\s+cita\b/.test(lower)) {
    return false;
  }
  const phrases = [
    "mi cita",
    "ya tengo cita",
    "tengo la cita",
    "mi reserva",
    "reprogramar",
    "reprogramación",
    "reprogramacion",
    "reagendar",
    "re agendar",
    "cambiar hora",
    "cambiar horario",
    "cambiar la hora",
    "cambiar fecha",
    "cambiar el día",
    "cambiar el dia",
    "cancelar mi cita",
    "cancelar la cita",
    "había pedido",
    "habia pedido",
    "ya pedí",
    "ya pedi",
    "estado de mi cita",
    "rendez-vous",
    "mon rendez-vous",
    "reschedule",
    "change my appointment",
    "my appointment",
  ];
  return phrases.some((p) => lower.includes(p));
}

/**
 * Afirmación de asistencia ("Estaré ahí a las 10", "llego a las 10", "nos vemos a las 10"):
 * menciona una hora pero NO pide cambiarla ni agendar nada. No debe disparar
 * corrección de hora ni cierre determinístico de cita — va a Haiku (caso Nélida
 * …6566, 24-sep-2026: "Estare ahi a las 10.00" → chequeo de cupo falso).
 */
export function matchesAttendanceAffirmation(text: string): boolean {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (/\b(no|ya no)\s+(puedo|podre|voy|llego|estare)\b/.test(t)) return false;
  return /\b(estare|voy a estar|llego|llegare|voy llegando|nos vemos|ahi estoy)\b/
    .test(
      t,
    );
}

/**
 * Corrección de hora/fecha sobre cita ya agendada (ej. "No es a las 11", "Es a las 4:45 PM").
 * También cubre aclaraciones más amplias que matchesMiCitaIntent.
 */
export function matchesTimeCorrectionIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (matchesAttendanceAffirmation(text)) return false;
  if (/\bno es a las?\b/.test(lower)) return true;
  if (/\bes a las?\s+\d/.test(lower)) return true;
  if (
    /\b(a|para) las?\s+\d{1,2}(:\d{2})?\s*(am|pm|a\.?\s*m\.?|p\.?\s*m\.?)?/i
      .test(
        lower,
      )
  ) {
    return true;
  }
  if (
    /\b(?:era|iba a ser)\s+(?:a\s+)?(?:las?\s+)?\d{1,2}(:\d{2})?\s*(am|pm|a\.?\s*m\.?|p\.?\s*m\.?)?/i
      .test(
        lower,
      )
  ) {
    return true;
  }
  if (
    (lower.includes("coordine") ||
      lower.includes("coordiné") ||
      lower.includes("coordine") ||
      lower.includes("agendé") ||
      lower.includes("agende")) &&
    /\d/.test(lower)
  ) {
    return true;
  }
  return false;
}

export function textImpliesExistingAppointment(text: string): boolean {
  const lower = text.toLowerCase();
  if (matchesMiCitaIntent(lower)) return true;
  if (matchesTimeCorrectionIntent(text)) return true;
  const hints = [
    "pedido la cita",
    "pedí la cita",
    "pedi la cita",
    "la cita para",
    "cita para las",
    "cita a las",
    "hora de mi",
    "horario de mi",
    "confirmar mi cita",
    "confirmación de cita",
    "yo la coordine",
    "yo la coordiné",
    "yo la agend",
  ];
  return hints.some((h) => lower.includes(h));
}

export async function getPendingAppointmentsForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<PendingAppointmentRow[]> {
  type ApptRow = {
    id: string;
    date: string;
    price: string;
    duration: number;
    client_phone: string | null;
    service_id: string | null;
  };

  let data: ApptRow[] | null = null;
  let error: { message?: string } | null = null;

  if (isWaBsuid(phone)) {
    const { data: bsuidClient } = await supabase
      .from("clients")
      .select("id")
      .eq("wa_user_id", phone)
      .maybeSingle();
    if (!bsuidClient?.id) return [];
    const res = await supabase
      .from("appointments")
      .select("id, date, price, duration, client_phone, status, service_id")
      .eq("status", "scheduled")
      .eq("client_id", bsuidClient.id)
      .order("date", { ascending: true });
    data = (res.data as ApptRow[] | null) ?? null;
    error = res.error;
  } else {
    const { country, normalized } = getPhoneCountryAndNormalizedFromWa(phone);
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("phone_country", country)
      .eq("phone_normalized", normalized)
      .maybeSingle();

    const digits = phone.replace(/\D/g, "");
    const last9 = digits.length >= 9 ? digits.slice(-9) : digits;

    let query = supabase
      .from("appointments")
      .select("id, date, price, duration, client_phone, status, service_id")
      .eq("status", "scheduled")
      .order("date", { ascending: true });

    if (client?.id) {
      // Incluir teléfono: citas creadas en app/agenda a veces tienen client_phone sin client_id.
      query = query.or(
        `client_id.eq.${client.id},client_phone.ilike.%${digits}%,client_phone.ilike.%${last9}%`,
      );
    } else {
      query = query.or(
        `client_phone.ilike.%${digits}%,client_phone.ilike.%${last9}%`,
      );
    }

    const res = await query;
    data = (res.data as ApptRow[] | null) ?? null;
    error = res.error;
  }

  if (error || !data?.length) return [];

  const now = Date.now();
  const rawRows = data;

  const future = rawRows.filter((row) => {
    const d = parseLimaLocalToDate(
      typeof row.date === "string" ? row.date : String(row.date),
    );
    if (!d) return false;
    return d.getTime() >= now - 2 * 60 * 60 * 1000;
  });
  if (future.length === 0) return [];

  const apptIds = future.map((r) => r.id);
  const { data: svcLines } = await supabase
    .from("appointment_services")
    .select("appointment_id, service_id")
    .in("appointment_id", apptIds);

  const allSids = [
    ...new Set(
      (svcLines ?? []).map((r: { service_id: string }) => r.service_id),
    ),
  ];
  const { data: nameRows } = allSids.length > 0
    ? await supabase.from("services").select("id, name").in("id", allSids)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map<string, string>(
    (nameRows ?? []).map(
      (r: { id: string; name: string }) => [r.id, r.name] as [string, string],
    ),
  );

  const labelsByAppt = new Map<string, string[]>();
  for (const line of svcLines ?? []) {
    const aid = (line as { appointment_id: string }).appointment_id;
    const sid = (line as { service_id: string }).service_id;
    const nm = nameById.get(sid) ?? "Servicio";
    const arr = labelsByAppt.get(aid) ?? [];
    arr.push(nm);
    labelsByAppt.set(aid, arr);
  }

  const out: PendingAppointmentRow[] = [];
  for (const row of future) {
    const fromLines = labelsByAppt.get(row.id);
    let serviceLabels = fromLines?.length ? [...new Set(fromLines)] : [];
    if (serviceLabels.length === 0 && row.service_id) {
      const { data: s } = await supabase
        .from("services")
        .select("name")
        .eq("id", row.service_id)
        .maybeSingle();
      if ((s as { name?: string })?.name) {
        serviceLabels = [(s as { name: string }).name];
      }
    }
    if (serviceLabels.length === 0) serviceLabels = ["Servicio"];
    out.push({
      id: row.id,
      date: row.date,
      price: String(row.price),
      duration: row.duration,
      client_phone: row.client_phone,
      serviceLabels,
    });
  }
  return out;
}

export const STAFF_COORDINATION_PHONE = "932 535 512";

/** @deprecated Prefer ADDITIONAL_BOOKING_BLOCK_MESSAGE_V2 / PARTY_AT_LIMIT — tope 2 citas/chat. */
export const ADDITIONAL_BOOKING_BLOCK_MESSAGE =
  `Ya tienes el máximo de *2 citas* programadas 💜 Para coordinar otra, escríbenos al 📱 *${STAFF_COORDINATION_PHONE}*.\n\nSi quieres *cambiar* una cita, escribe *mi cita*.`;

export const BOOKING_OVERLAP_MESSAGE =
  `Ese horario coincide con otra cita que ya tienes 💜 Escríbenos al 📱 *${STAFF_COORDINATION_PHONE}* para coordinar o elige otro horario disponible.`;
/**
 * Aviso de llegada/tardanza sin cita `scheduled` (Sofia …8962, 08-sep):
 * "Ya estoy en camino" no debe disparar política de tardanza ni "te esperamos".
 */
export const NO_CONFIRMED_APPOINTMENT_ARRIVAL_MESSAGE =
  `No encontramos una *cita confirmada* con este número todavía 💜\n\n` +
  `Un resumen en el chat *no reserva* el cupo hasta completar los pasos (o coordinar con el salón).\n\n` +
  `Escribe *agendar* para reservar, o coordina al 📱 *${STAFF_COORDINATION_PHONE}* 🌸`;

/** Slot sin cupo según `overlapCapForCart` (tope 1 default / 2 si carrito 100 % especial). Ver docs/waba/WABA_CAPACITY.md. */
export const SLOT_TAKEN_MESSAGE =
  `Ese horario no tiene cupo. Elige otra hora de la lista 💜`;

/**
 * True si acabamos de mandar SLOT_TAKEN (ráfaga peer / Haiku no debe “confirmar” esa hora).
 * Sofia …8962 (07-sep): SLOT_TAKEN + 11s después Haiku “a las 10 AM… queda agendada”.
 */
export async function wasSlotTakenRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  windowMs = 45_000,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .or(
      "content.ilike.%no tiene cupo%,content.ilike.%horario ya fue reservado%,content.ilike.%Horarios con cupo%",
    )
    .gte("created_at", since)
    .limit(1);
  if (error) {
    console.error("[WABA] wasSlotTakenRecentlySent:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export function appointmentTimesOverlap(
  startA: Date,
  durationMinutesA: number,
  startB: Date,
  durationMinutesB: number,
): boolean {
  const endA = new Date(startA.getTime() + durationMinutesA * 60_000);
  const endB = new Date(startB.getTime() + durationMinutesB * 60_000);
  return startA < endB && endA > startB;
}

/**
 * Bloquea si al crear `creatingCount` citas se supera el tope por chat (2).
 * Antes: 1 cita/chat (Luana). Ahora: hasta 2 (multi-cita / terceros in-bot).
 */
export async function shouldBlockAdditionalBooking(
  supabase: SupabaseClient,
  phone: string,
  options?: {
    rescheduleAppointmentId?: string | null;
    /** Cuántas citas nuevas se van a crear en este finalize (default 1). */
    creatingCount?: number;
  },
): Promise<boolean> {
  if (options?.rescheduleAppointmentId) return false;
  const pending = await getPendingAppointmentsForPhone(supabase, phone);
  const creating = Math.max(1, options?.creatingCount ?? 1);
  const { MAX_SCHEDULED_PER_CHAT } = await import("../lib/party-booking.ts");
  return pending.length + creating > MAX_SCHEDULED_PER_CHAT;
}
/**
 * Abono fijo S/25: clienta sin ningún servicio `completed` en historial
 * (nueva, o cuya cita anterior no se concretó — scheduled pasado / cancelled).
 * Independiente de domingo/feriado — gana sobre getAdvancePaymentRate.
 */
export async function clientRequiresFixedDeposit(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  return !(await hasCompletedAppointmentForPhone(supabase, phone));
}

/** True si existe al menos una cita `completed` vinculada al teléfono/BSUID. */
async function hasCompletedAppointmentForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  if (isWaBsuid(phone)) {
    const { data: bsuidClient } = await supabase
      .from("clients")
      .select("id")
      .eq("wa_user_id", phone)
      .maybeSingle();
    if (!bsuidClient?.id) return false;
    const { data } = await supabase
      .from("appointments")
      .select("id")
      .eq("client_id", bsuidClient.id)
      .eq("status", "completed")
      .limit(1);
    return (data?.length ?? 0) > 0;
  }

  const { country, normalized } = getPhoneCountryAndNormalizedFromWa(phone);
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("phone_country", country)
    .eq("phone_normalized", normalized)
    .maybeSingle();

  const digits = phone.replace(/\D/g, "");
  const last9 = digits.length >= 9 ? digits.slice(-9) : digits;

  let query = supabase
    .from("appointments")
    .select("id")
    .eq("status", "completed")
    .limit(1);
  if (client?.id) {
    query = query.or(
      `client_id.eq.${client.id},client_phone.ilike.%${digits}%,client_phone.ilike.%${last9}%`,
    );
  } else {
    query = query.or(
      `client_phone.ilike.%${digits}%,client_phone.ilike.%${last9}%`,
    );
  }
  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

/**
 * Si hay comprobante (payment_submitted|approved) y faltan &lt;24 h a la cita,
 * marca deposit_forfeit_risk para que Vanessa vea el badge (no bloquea cancel/reagendo).
 */
export async function markDepositForfeitRiskIfLateChange(
  supabase: SupabaseClient,
  appointmentId: string,
): Promise<void> {
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, date")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt?.date) return;

  const start = parseLimaLocalToDate(
    typeof appt.date === "string" ? appt.date : String(appt.date),
  );
  if (!start) return;

  const msUntil = start.getTime() - Date.now();
  if (msUntil > 24 * 60 * 60 * 1000) return;

  const { error } = await supabase
    .from("appointment_verifications")
    .update({ deposit_forfeit_risk: true })
    .eq("appointment_id", appointmentId)
    .in("status", ["payment_submitted", "approved"]);
  if (error) {
    console.error(
      "[WABA] markDepositForfeitRiskIfLateChange:",
      appointmentId,
      error.message,
    );
  }
}

/** Comprueba solapamiento con citas scheduled del mismo teléfono. */
export async function newBookingOverlapsExisting(
  supabase: SupabaseClient,
  phone: string,
  proposedStart: Date,
  proposedDurationMinutes: number,
  excludeAppointmentId?: string | null,
): Promise<boolean> {
  const pending = await getPendingAppointmentsForPhone(supabase, phone);
  for (const row of pending) {
    if (excludeAppointmentId && row.id === excludeAppointmentId) continue;
    const existingStart = parseLimaLocalToDate(
      typeof row.date === "string" ? row.date : String(row.date),
    );
    if (!existingStart) continue;
    if (
      appointmentTimesOverlap(
        proposedStart,
        proposedDurationMinutes,
        existingStart,
        row.duration ?? 60,
      )
    ) {
      return true;
    }
  }
  return false;
}

function serviceLabelFromRow(row: PendingAppointmentRow): string {
  return row.serviceLabels.join(" + ");
}

/** Resumen corto para mensajes (una o varias citas). */
export function formatPendingSummaryLines(
  rows: PendingAppointmentRow[],
): string {
  return rows
    .map((r, i) => {
      const dt = parseLimaLocalToDate(
        typeof r.date === "string" ? r.date : String(r.date),
      );
      const fecha = dt ? formatDateSpanish(dt) : String(r.date);
      const svc = serviceLabelFromRow(r);
      return `${i + 1}) ${svc} — ${fecha}`;
    })
    .join("\n");
}

/**
 * Respuesta cuando el mensaje suena a "ya tengo cita" / aclaración de horario.
 */
export async function sendPendingAppointmentContext(
  phone: string,
  _supabase: SupabaseClient,
  pending: PendingAppointmentRow[],
): Promise<void> {
  const lines = formatPendingSummaryLines(pending);
  await sendMessage(
    phone,
    `📋 *Tu cita con nosotras*\n\n${lines}\n\n` +
      `Si quieres *cambiar fecha u hora*, elige *Cambiar fecha/hora* abajo y te guiamos con la disponibilidad (sin crear una cita duplicada).\n\n` +
      `Si solo era una aclaración, ¡perfecto! Te esperamos 💜`,
  );
  await sendMiCitaActionsList(phone, pending);
}

async function sendMiCitaActionsList(
  phone: string,
  pending: PendingAppointmentRow[],
): Promise<void> {
  const rows = pending.length === 1
    ? [
      {
        id: `${REPRO_PREFIX}${pending[0].id}`,
        title: "📅 Cambiar fecha/hora",
        description: "Reprogramar tu cita",
      },
      {
        id: "mi_cita_ver_menu",
        title: "🏠 Volver al menú",
        description: "Promos y servicios",
      },
    ]
    : [
      ...pending.slice(0, 9).map((p, i) => {
        const dt = parseLimaLocalToDate(
          typeof p.date === "string" ? p.date : String(p.date),
        );
        const short = dt ? formatDateSpanish(dt).slice(0, 40) : "Cita";
        return {
          id: `${REPRO_PREFIX}${p.id}`,
          title: `📅 Opción ${i + 1}`.slice(0, 24),
          description: `${serviceLabelFromRow(p).slice(0, 20)} · ${short}`
            .slice(
              0,
              72,
            ),
        };
      }),
      {
        id: "mi_cita_ver_menu",
        title: "🏠 Volver al menú",
        description: "Promos y servicios",
      },
    ];

  const ok = await sendInteractiveList(
    phone,
    "Tu cita",
    "Elige una opción:",
    "Ver opciones",
    [{ title: "Citas", rows }],
  );
  if (!ok) {
    await sendMessage(
      phone,
      `Escribe *cambiar fecha* para reprogramar o *menu* para el menú principal.`,
    );
  }
}

/**
 * Menú "Mi cita" desde el listado principal (sin mensaje previo de contexto).
 */
export async function sendMiCitaMenu(
  phone: string,
  supabase: SupabaseClient,
): Promise<void> {
  const pending = await getPendingAppointmentsForPhone(supabase, phone);
  if (pending.length === 0) {
    await sendMessage(
      phone,
      "No tenemos citas *pendientes* registradas con este número.\n\n" +
        "¿Quieres agendar? Toca *📅 Agendar cita* en el menú 💜",
    );
    return;
  }
  const lines = formatPendingSummaryLines(pending);
  await sendMessage(
    phone,
    `📋 *Tus citas pendientes*\n\n${lines}\n\n¿Qué deseas hacer?`,
  );
  await sendMiCitaActionsList(phone, pending);
}

function aggregatePackPrices(
  lines: {
    service_id: string;
    pack_id: string | null;
    price: string | number;
    duration: number | null;
  }[],
): CartItem[] {
  const items: CartItem[] = [];
  const packTotals = new Map<string, number>();

  for (const line of lines) {
    const price = parseFloat(String(line.price)) || 0;
    if (line.pack_id) {
      packTotals.set(line.pack_id, (packTotals.get(line.pack_id) ?? 0) + price);
    } else {
      items.push({
        item_type: "service",
        item_id: line.service_id,
        quantity: 1,
        price,
      });
    }
  }
  for (const [packId, total] of packTotals) {
    items.push({
      item_type: "pack",
      item_id: packId,
      quantity: 1,
      price: total,
    });
  }
  return items;
}

/**
 * Carga líneas de la cita, arma carrito y abre selector de fecha (flujo reprogramación).
 */
export async function startRescheduleFromAppointment(
  supabase: SupabaseClient,
  phone: string,
  appointmentId: string,
  catalog: ServiceCatalog,
  opts?: { selectedDay?: string; skipDateSelector?: boolean },
): Promise<void> {
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("id, client_phone, client_id, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (apptErr || !appt || appt.status !== "scheduled") {
    await sendMessage(
      phone,
      "No encontré esa cita o ya no está activa. Escribe *menu* para empezar de nuevo.",
    );
    return;
  }

  const { data: lines, error: linesErr } = await supabase
    .from("appointment_services")
    .select("service_id, pack_id, price, duration")
    .eq("appointment_id", appointmentId);

  if (linesErr) {
    await sendMessage(
      phone,
      "Hubo un error al cargar tu cita. Escríbenos al 📱 932 535 512 💜",
    );
    return;
  }

  let cartItems: CartItem[] = [];
  if (lines && lines.length > 0) {
    cartItems = aggregatePackPrices(
      lines as {
        service_id: string;
        pack_id: string | null;
        price: string | number;
        duration: number | null;
      }[],
    );
  } else {
    const { data: legacy } = await supabase
      .from("appointments")
      .select("service_id, price, duration")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!legacy?.service_id) {
      await sendMessage(
        phone,
        "No pudimos reconstruir los servicios de tu cita. Llámanos al 📱 932 535 512.",
      );
      return;
    }
    const pr = parseFloat(String(legacy.price)) || 0;
    cartItems = [
      {
        item_type: "service",
        item_id: legacy.service_id,
        quantity: 1,
        price: pr,
      },
    ];
  }

  const serviceIds = await expandCartItemsToServiceIds(supabase, cartItems);
  await upsertSession(supabase, phone, {
    cart_items: JSON.stringify(cartItems),
    cart_service_ids: JSON.stringify(serviceIds),
    step: "browsing",
    reschedule_appointment_id: appointmentId,
    parsed_datetime: null,
    employee_assignments: JSON.stringify({}),
  });

  const session = await getSession(supabase, phone);
  const hasCart = (session?.cartItems?.length ?? 0) > 0 ||
    (session?.serviceIds?.length ?? 0) > 0;
  if (!hasCart) {
    await sendMessage(
      phone,
      "No pudimos armar tu selección. Escríbenos al 📱 932 535 512.",
    );
    return;
  }

  const cartItemsNow = (session?.cartItems ?? []) as CartItem[];
  const useCartItems = cartItemsNow.length > 0 &&
    cartItemsNow.some((i: CartItem) => i.price > 0);
  let summary: string;
  let orderedServices: {
    id: string;
    name: string;
    price: string;
    duration: number;
    category_id: string | null;
  }[];

  if (useCartItems) {
    const lines: {
      name: string;
      quantity: number;
      unitPrice: number;
      duration?: number;
    }[] = [];
    for (const it of cartItemsNow) {
      if (it.item_type === "service") {
        const svc = catalog.servicesById.get(it.item_id);
        lines.push({
          name: svc?.name ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
          duration: svc?.duration ?? 60,
        });
      } else {
        const pack = catalog.packsById.get(it.item_id);
        lines.push({
          name: pack?.short_name ?? pack?.title ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
        });
      }
    }
    summary = formatCartSummaryFromLines(lines);
    const ids = await expandCartItemsToServiceIds(
      supabase,
      cartItemsNow as CartItem[],
    );
    type SvcRowAgenda = {
      id: string;
      name: string;
      price: string;
      duration: number;
      category_id: string | null;
    };
    const validServices = [...new Set(ids)]
      .map((id: string) => catalog.servicesById.get(id))
      .filter(Boolean) as SvcRowAgenda[];
    orderedServices = orderedServicesFromIds(
      ids,
      validServices,
    ) as SvcRowAgenda[];
  } else {
    const ids = (session?.serviceIds ?? []) as string[];
    type SvcRowAgenda = {
      id: string;
      name: string;
      price: string;
      duration: number;
      category_id: string | null;
    };
    const validServices = [...new Set(ids)]
      .map((id: string) => catalog.servicesById.get(id))
      .filter(Boolean) as SvcRowAgenda[];
    orderedServices = orderedServicesFromIds(
      ids,
      validServices,
    ) as SvcRowAgenda[];
    summary = formatCartSummary(orderedServices);
  }

  const totalMin = orderedServices.reduce(
    (a: number, s: { duration: number }) => a + s.duration,
    0,
  );
  const stickyDay = opts?.selectedDay?.trim() || null;
  await upsertSession(supabase, phone, {
    step: "awaiting_datetime",
    employee_assignments: JSON.stringify({}),
    reschedule_appointment_id: appointmentId,
    ...(stickyDay ? { selected_day: stickyDay } : {}),
  });
  const possibleEmpIds = new Set<string>();
  for (const svc of orderedServices) {
    const catId = (svc as { category_id?: string }).category_id ?? "";
    const allowed = getEmployeeCategories()[catId];
    if (allowed) allowed.forEach((id) => possibleEmpIds.add(id));
  }
  if (possibleEmpIds.size === 0) {
    const { data: allEmps } = await supabase
      .from("employees")
      .select("id")
      .eq("is_active", true);
    (allEmps ?? []).forEach((e: { id: string }) => possibleEmpIds.add(e.id));
  }
  const minEmployeesFree = 1;
  const serviceIdsForCap = orderedServices.map((s) => s.id);
  const cap = overlapCapForCart(serviceIdsForCap, catalog);

  // Soft change: ya tenemos el día → solo pedir hora (Pati indecisión)
  if (opts?.skipDateSelector && stickyDay) {
    const { sendTimeSelector } = await import("./agenda.ts");
    await sendTimeSelector(
      phone,
      supabase,
      stickyDay,
      [...possibleEmpIds],
      totalMin,
      cap,
      minEmployeesFree,
      catalog,
      serviceIdsForCap,
      {
        introMessage:
          `${summary}\n\nDale, te cambio la fecha 📅 ¿A qué hora te viene mejor ese día?`,
      },
    );
    return;
  }

  await sendMessage(
    phone,
    `${summary}\n\n📅 *Elige el nuevo día* (reprogramación) 💜`,
  );
  await sendDateSelector(
    phone,
    supabase,
    [...possibleEmpIds],
    totalMin,
    cap,
    minEmployeesFree,
    catalog,
    serviceIdsForCap,
  );
}

export function isReproInteractiveId(id: string): boolean {
  return id.startsWith(REPRO_PREFIX) && id.length > REPRO_PREFIX.length + 8;
}

export function parseReproAppointmentId(id: string): string | null {
  if (!isReproInteractiveId(id)) return null;
  return id.slice(REPRO_PREFIX.length);
}

/**
 * Recalcula el precio de las líneas de una cita ya creada contra el día ISO real
 * de la nueva fecha (reprogramación) y persiste el ajuste en `appointment_services`
 * + el total en `appointments.price`. Sin esto, reprogramar una cita con promo
 * "Lunes a Miércoles" a un Viernes (o viceversa) dejaba el precio congelado del
 * día en que se agendó originalmente — gap señalado en la revisión de PR #22.
 */
async function recomputeAndPersistAppointmentPricesForDate(
  supabase: SupabaseClient,
  catalog: ServiceCatalog,
  appointmentId: string,
  chosenDateUtc: Date,
): Promise<CartPriceAdjustment[]> {
  const { data: rows } = await supabase
    .from("appointment_services")
    .select("id, service_id, pack_id, price")
    .eq("appointment_id", appointmentId);
  const lines: AppointmentServiceLine[] = (
    (rows ?? []) as Array<{
      id: string;
      service_id: string;
      pack_id: string | null;
      price: string | number;
    }>
  ).map((r) => ({
    id: r.id,
    service_id: r.service_id,
    pack_id: r.pack_id ?? null,
    price: parseFloat(String(r.price)) || 0,
  }));
  if (!lines.length) return [];

  const isoWeekday = limaIsoWeekday(chosenDateUtc);
  const { lines: nextLines, adjustments } = recomputeAppointmentLinesForWeekday(
    catalog,
    lines,
    isoWeekday,
  );
  if (!adjustments.length) return [];

  await Promise.all(
    nextLines.map((l) =>
      supabase
        .from("appointment_services")
        .update({ price: l.price })
        .eq("id", l.id)
    ),
  );

  const newTotal = nextLines.reduce((s, l) => s + l.price, 0);
  await supabase
    .from("appointments")
    .update({ price: newTotal })
    .eq("id", appointmentId);

  return adjustments;
}

/**
 * Actualiza fecha/hora de la cita existente (y servicio si el carrito cambió) y limpia sesión.
 */
export async function finalizeRescheduleAppointment(
  supabase: SupabaseClient,
  phone: string,
  appointmentId: string,
  chosenDateUtc: Date,
  catalog: ServiceCatalog,
): Promise<void> {
  const { data: appt, error } = await supabase
    .from("appointments")
    .select("id, client_phone, status, duration")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !appt || appt.status !== "scheduled") {
    await sendMessage(
      phone,
      "No pudimos actualizar la cita. Intenta de nuevo o escribe al 📱 932 535 512.",
    );
    return;
  }

  const phoneDigits = phone.replace(/\D/g, "");
  const clientDigits = String(appt.client_phone ?? "").replace(/\D/g, "");
  const okPhone = clientDigits &&
    (phoneDigits.endsWith(clientDigits.slice(-9)) ||
      clientDigits.endsWith(phoneDigits.slice(-9)));
  if (!okPhone && phoneDigits.length > 5) {
    await sendMessage(
      phone,
      "Por seguridad no pudimos vincular esta cita a tu número. Escríbenos al 📱 932 535 512.",
    );
    return;
  }

  const sessionBefore = await getSession(supabase, phone);
  const cartItems = (sessionBefore?.cartItems ?? []) as CartItem[];
  const cartServiceIds = cartItems.length > 0
    ? await expandCartItemsToServiceIds(supabase, cartItems)
    : ((sessionBefore?.serviceIds ?? []) as string[]);

  // Capacidad del salón (excluye esta misma cita). El soft-reschedule ya
  // chequeaba antes de llamar; el tap interactivo time_ entraba aquí sin gate.
  let serviceIdsForCap = [...new Set(cartServiceIds)];
  if (serviceIdsForCap.length === 0) {
    const { data: apptSvcRows } = await supabase
      .from("appointment_services")
      .select("service_id")
      .eq("appointment_id", appointmentId);
    serviceIdsForCap = [
      ...new Set(
        (apptSvcRows ?? []).map((r: { service_id: string }) => r.service_id),
      ),
    ];
  }
  const cap = overlapCapForCart(serviceIdsForCap, catalog);
  let durationMinutes = serviceIdsForCap.reduce((sum, sid) => {
    return sum + (catalog.servicesById.get(sid)?.duration ?? 60);
  }, 0);
  if (durationMinutes <= 0) {
    durationMinutes = (appt as { duration?: number | null }).duration ?? 60;
  }
  if (
    !(await hasSlotCapacityForServices(
      supabase,
      catalog,
      chosenDateUtc,
      durationMinutes,
      serviceIdsForCap,
      cap,
      appointmentId,
    ))
  ) {
    await sendMessage(phone, SLOT_TAKEN_MESSAGE);
    return;
  }

  const appointmentDateLima = toLimaLocalTimestamp(chosenDateUtc);
  const updatePayload: Record<string, unknown> = {
    date: appointmentDateLima,
  };

  // Si el carrito tiene servicios distintos (cambio mid-reprogramación), sincronizar
  if (cartServiceIds.length > 0) {
    const uniqueIds = [...new Set(cartServiceIds)];
    const lines: {
      service_id: string;
      price: number;
      duration: number;
    }[] = [];
    let totalPrice = 0;
    let totalDuration = 0;
    for (const sid of uniqueIds) {
      const svc = catalog.servicesById.get(sid);
      if (!svc) continue;
      const price = parseFloat(String(svc.price)) || 0;
      const duration = svc.duration ?? 60;
      lines.push({ service_id: sid, price, duration });
      totalPrice += price;
      totalDuration += duration;
    }
    if (lines.length > 0) {
      updatePayload.service_id = lines[0].service_id;
      updatePayload.price = totalPrice;
      updatePayload.duration = totalDuration;

      const { data: oldLines } = await supabase
        .from("appointment_services")
        .select("employee_id")
        .eq("appointment_id", appointmentId)
        .limit(1);
      const keepEmployeeId =
        (oldLines?.[0] as { employee_id?: string | null } | undefined)
          ?.employee_id ?? null;

      await supabase
        .from("appointment_services")
        .delete()
        .eq("appointment_id", appointmentId);

      await supabase.from("appointment_services").insert(
        lines.map((l) => ({
          appointment_id: appointmentId,
          service_id: l.service_id,
          price: l.price,
          duration: l.duration,
          employee_id: keepEmployeeId,
        })),
      );
    }
  }

  // Marcar con la fecha ORIGINAL (antes del UPDATE) si <24h + comprobante
  await markDepositForfeitRiskIfLateChange(supabase, appointmentId);

  const { error: upErr } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", appointmentId);

  if (upErr) {
    await sendMessage(
      phone,
      "No se pudo guardar el nuevo horario. Intenta más tarde o escribe al 📱 932 535 512.",
    );
    return;
  }

  await clearCart(supabase, phone);

  const priceAdjustments = await recomputeAndPersistAppointmentPricesForDate(
    supabase,
    catalog,
    appointmentId,
    chosenDateUtc,
  );

  const { data: apptPrice } = await supabase
    .from("appointments")
    .select("price")
    .eq("id", appointmentId)
    .maybeSingle();

  const price = apptPrice
    ? parseFloat(String((apptPrice as { price?: string }).price))
    : 0;

  const { data: svcRows } = await supabase
    .from("appointment_services")
    .select("service_id")
    .eq("appointment_id", appointmentId);
  const sids = [
    ...new Set(
      (svcRows ?? []).map((r: { service_id: string }) => r.service_id),
    ),
  ];
  let svcName = "tu servicio";
  if (sids.length > 0) {
    const { data: names } = await supabase
      .from("services")
      .select("name")
      .in("id", sids);
    svcName = (names ?? []).map((n: { name: string }) => n.name).join(" + ") ||
      "tu servicio";
  }
  const dateStr = formatDateSpanish(chosenDateUtc);

  const priceNote = priceAdjustments.length
    ? `\n\n💜 El descuento que tenías aplica solo ciertos días, así que ajustamos el precio para la nueva fecha:\n` +
      priceAdjustments
        .map(
          (a) =>
            `• ${a.name}: S/ ${formatSoles(a.before)} → S/ ${
              formatSoles(a.after)
            }`,
        )
        .join("\n")
    : "";

  await sendMessage(
    phone,
    `✅ *Listo — reprogramamos tu cita* 💜\n\n` +
      `📋 ${svcName}\n` +
      `📅 Nueva fecha: ${dateStr}\n` +
      `💰 Total: S/ ${formatSoles(price)}` +
      priceNote +
      `\n\nCualquier duda, aquí estamos. ¡Te esperamos! 🌸`,
  );

  await notifyAdmins(
    supabase,
    "📅 Cita reprogramada (WABA)",
    `${phone} — ${svcName} — ${dateStr}`,
    { screen: "Agenda", appointmentId, phone },
  );
}
