/**
 * Multi-cita / terceros in-bot (hasta 2 scheduled por chat).
 * Estrella …6469 + casos «para mi hija» con servicios distintos del catálogo.
 */
import type { ServiceCatalog } from "./services-catalog.ts";
import {
  isSpecialOverlapCart,
  cartExtensionesLanes,
} from "./services-catalog.ts";

/** Misma línea staff que pending-appointment (evitar import circular). */
const STAFF_COORDINATION_PHONE = "932 535 512";

export const MAX_SCHEDULED_PER_CHAT = 2;

export const PARTY_MODE_TOGETHER_ID = "party_mode_together";
export const PARTY_MODE_GUEST_ID = "party_mode_guest";

export type PartyMode = "together" | "guest_only";

export type PartyCollecting =
  | "mode"
  | "guest_name"
  | "primary_name"
  | "primary_service"
  | "guest_service"
  | "datetime_primary"
  | "datetime_guest"
  | "ready";

export interface PartyMember {
  role: "primary" | "guest";
  name: string | null;
  dni: string | null;
  service_ids: string[];
  /** ISO datetime Lima-local via Date.toISOString() del selector */
  datetime_iso: string | null;
}

export interface PartyBooking {
  mode: PartyMode | null;
  members: PartyMember[];
  /** same = un horario compartido; sequential = dos horarios */
  slot_strategy: "same" | "sequential" | null;
  collecting: PartyCollecting;
  /** Pack de dos personas (mismo servicio). El precio es el del pack, no 2× catálogo. */
  pack_id?: string | null;
  pack_price?: number | null;
}

export const PARTY_AT_LIMIT_MESSAGE =
  `Ya tienes *${MAX_SCHEDULED_PER_CHAT} citas* programadas en este chat 💜 ` +
  `Para una más, escríbenos al 📱 *${STAFF_COORDINATION_PHONE}* y te ayudamos.\n\n` +
  `Si quieres *cambiar* una cita, escribe *mi cita*.`;

export const ADDITIONAL_BOOKING_BLOCK_MESSAGE_V2 =
  `Ya tienes el máximo de *${MAX_SCHEDULED_PER_CHAT} citas* programadas 💜 ` +
  `Para coordinar otra, escríbenos al 📱 *${STAFF_COORDINATION_PHONE}*.\n\n` +
  `Si quieres *cambiar* una cita, escribe *mi cita*.`;

export function emptyPartyBooking(
  collecting: PartyCollecting = "mode",
): PartyBooking {
  return {
    mode: null,
    members: [],
    slot_strategy: null,
    collecting,
    pack_id: null,
    pack_price: null,
  };
}

export function parsePartyBooking(raw: unknown): PartyBooking | null {
  if (raw == null || raw === "") return null;
  try {
    const o =
      typeof raw === "string"
        ? (JSON.parse(raw) as PartyBooking)
        : (raw as PartyBooking);
    if (!o || typeof o !== "object") return null;
    if (!Array.isArray(o.members)) return null;
    return {
      mode: o.mode ?? null,
      members: o.members.map((m) => ({
        role: m.role === "guest" ? "guest" : "primary",
        name: m.name ?? null,
        dni: m.dni ?? null,
        service_ids: Array.isArray(m.service_ids)
          ? m.service_ids.filter((id) => typeof id === "string")
          : [],
        datetime_iso: m.datetime_iso ?? null,
      })),
      slot_strategy: o.slot_strategy ?? null,
      collecting: (o.collecting as PartyCollecting) ?? "mode",
      pack_id: typeof o.pack_id === "string" ? o.pack_id : null,
      pack_price:
        typeof o.pack_price === "number" && Number.isFinite(o.pack_price)
          ? o.pack_price
          : null,
    };
  } catch {
    return null;
  }
}

export function serializePartyBooking(party: PartyBooking): string {
  return JSON.stringify(party);
}

/** ¿Pueden compartir el mismo slot? (ambos 100 % especial y sin choque de carril). */
export function canShareSlot(
  serviceIdsA: string[],
  serviceIdsB: string[],
  catalog: ServiceCatalog,
): boolean {
  if (serviceIdsA.length === 0 || serviceIdsB.length === 0) return false;
  if (!isSpecialOverlapCart(serviceIdsA, catalog)) return false;
  if (!isSpecialOverlapCart(serviceIdsB, catalog)) return false;
  const lanesA = cartExtensionesLanes(serviceIdsA, catalog);
  const lanesB = cartExtensionesLanes(serviceIdsB, catalog);
  if (lanesA.size === 0 && lanesB.size === 0) return true;
  // Mismo carril en ambos → no caben en paralelo
  for (const lane of lanesA) {
    if (lanesB.has(lane)) return false;
  }
  return true;
}

export function isPartyModeTap(id: string): boolean {
  return id === PARTY_MODE_TOGETHER_ID || id === PARTY_MODE_GUEST_ID;
}

export function partyNeedsServiceCapture(party: PartyBooking | null): boolean {
  if (!party) return false;
  return (
    party.collecting === "primary_service" ||
    party.collecting === "guest_service"
  );
}

/**
 * Intención «solo para otra» (sin venir juntas) vs «vamos juntas / 2 personas».
 * Usado para pre-seleccionar modo; la lista interactiva confirma.
 */
export function inferPartyModeFromText(text: string): PartyMode | null {
  const lower = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!lower) return null;

  const togetherHints = [
    "somos 2",
    "somos dos",
    "2 personas",
    "dos personas",
    "para 2 personas",
    "para dos personas",
    "vamos juntas",
    "vamos las dos",
    "con mi amiga",
    "con mi hermana",
    "con mi mama",
    "con mi hija",
    "las dos",
    "ambas",
  ];
  if (togetherHints.some((h) => lower.includes(h))) return "together";

  const guestHints = [
    "para mi amiga",
    "para mi amigo",
    "para mi hermana",
    "para mi mama",
    "para mi papa",
    "para mi hija",
    "para mi hijo",
    "para otra persona",
    "para alguien mas",
    "a nombre de",
    "cita para otra",
    "agendar para otra",
    "reservar para otra",
    "separar para otra",
  ];
  if (guestHints.some((h) => lower.includes(h))) return "guest_only";

  if (/\bpara\s+(2|dos)\b/.test(lower) && /\bpersonas?\b/.test(lower)) {
    return "together";
  }
  return null;
}

export function partyMemberLabel(member: PartyMember): string {
  return member.name?.trim() || (member.role === "guest" ? "acompañante" : "tú");
}

export function partyIsReady(party: PartyBooking | null): boolean {
  return party?.collecting === "ready";
}

/** Cuántas filas appointments creará el finalize party. */
export function partyCreatingCount(party: PartyBooking | null): number {
  if (!party || party.collecting !== "ready") return 1;
  if (party.mode === "together") return 2;
  return 1;
}

export function partyMembersForInsert(party: PartyBooking): PartyMember[] {
  return party.members.filter((m) => m.service_ids.length > 0);
}
