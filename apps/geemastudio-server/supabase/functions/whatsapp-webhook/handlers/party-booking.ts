/**
 * Flujo multi-cita / terceros in-bot.
 * Entrada: matchesThirdPartyBookingIntent → startPartyBookingFlow
 */
import {
  getSession,
  upsertSession,
  clearCart,
  addCartItems,
  findClientByWaRecipient,
  type CartItem,
  type SupabaseClient,
} from "../lib/supabase.ts";
import { sendMessage, sendInteractiveList } from "../wa-api.ts";
import { sendCategoriesList } from "./menu.ts";
import {
  loadCatalog,
  overlapCapForCart,
  parsePackServiceIds,
  type ServiceCatalog,
} from "../lib/services-catalog.ts";
import {
  confirmsTwoPersonPack,
  formatHourCompact,
  isTwoPersonSameServiceIds,
  looksLikePersonName,
  mentionsTwoPeople,
  textInterruptsCompanionName,
} from "../lib/duo-pack.ts";
import { getDateKeyLima } from "../lib/peru-holidays.ts";
import {
  emptyPartyBooking,
  parsePartyBooking,
  serializePartyBooking,
  PARTY_MODE_TOGETHER_ID,
  PARTY_MODE_GUEST_ID,
  PARTY_AT_LIMIT_MESSAGE,
  canShareSlot,
  inferPartyModeFromText,
  partyMemberLabel,
  type PartyBooking,
  MAX_SCHEDULED_PER_CHAT,
} from "../lib/party-booking.ts";
import { getPendingAppointmentsForPhone } from "./pending-appointment.ts";
import { sendDateSelector } from "./agenda.ts";

async function saveParty(
  supabase: SupabaseClient,
  phone: string,
  party: PartyBooking,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await upsertSession(supabase, phone, {
    party_booking: serializePartyBooking(party),
    ...extra,
  });
}

export function getPartyFromSession(
  session: Record<string, unknown> | null | undefined,
): PartyBooking | null {
  return parsePartyBooking(
    (session as { party_booking?: string | null })?.party_booking,
  );
}

export async function clearPartyBooking(
  supabase: SupabaseClient,
  phone: string,
): Promise<void> {
  await upsertSession(supabase, phone, { party_booking: null });
}

const COMPANION_NAME_ASK =
  "¿Cómo se llama quien te acompaña? Son *dos citas*, cada una con una profesional que esté libre a esa hora 💜";

/** Pack cuyo service_ids es el mismo servicio dos veces (2 Lifting). */
export function findTwoPersonPack(
  catalog: ServiceCatalog,
  serviceId?: string | null,
) {
  for (const pack of catalog.packs) {
    const ids = parsePackServiceIds(pack);
    if (!isTwoPersonSameServiceIds(ids)) continue;
    if (serviceId && ids[0] !== serviceId) continue;
    return pack;
  }
  return null;
}

/**
 * Abre el pack de 2 personas: mismo horario, un servicio por cita, y pide el nombre
 * antes de cerrar. Si ya hay hora elegida, queda guardada hasta que llegue el nombre.
 */
export async function startTwoPersonPackBooking(
  supabase: SupabaseClient,
  phone: string,
  pack: { id: string; pack_price: string | number; service_ids?: unknown },
  opts?: { chosenDate?: Date | null; silent?: boolean },
): Promise<void> {
  const ids = parsePackServiceIds(pack);
  const serviceId = ids[0];
  if (!serviceId) return;
  const price = parseFloat(String(pack.pack_price)) || 0;
  const client = await findClientByWaRecipient(supabase, phone);
  const iso = opts?.chosenDate ? opts.chosenDate.toISOString() : null;
  const party = emptyPartyBooking("guest_name");
  party.mode = "together";
  party.slot_strategy = "same";
  party.pack_id = pack.id;
  party.pack_price = price;
  party.members = [
    {
      role: "primary",
      name: client?.name?.trim() || null,
      dni: null,
      service_ids: [serviceId],
      datetime_iso: iso,
    },
    {
      role: "guest",
      name: null,
      dni: null,
      service_ids: [serviceId],
      datetime_iso: iso,
    },
  ];
  await addCartItems(supabase, phone, [
    {
      item_type: "pack",
      item_id: pack.id,
      quantity: 1,
      price,
    },
  ]);
  await saveParty(supabase, phone, party, { step: "browsing" });
  if (!opts?.silent) await sendMessage(phone, COMPANION_NAME_ASK);
}

/**
 * True si hay que frenar el cierre de UNA cita: falta el nombre de la acompañante.
 * Guarda la hora elegida para usarla cuando llegue el nombre.
 */
export async function holdDuoPackForCompanionName(
  supabase: SupabaseClient,
  phone: string,
  chosenDate: Date,
): Promise<boolean> {
  const session = await getSession(supabase, phone);
  const party = getPartyFromSession(session);
  const guest = party?.members.find((m) => m.role === "guest");
  if (party?.collecting === "ready" && guest?.name) return false;

  const serviceIds = (session?.serviceIds ?? []) as string[];
  const catalog = await loadCatalog(supabase);
  const pack =
    (party?.pack_id ? catalog.packsById.get(party.pack_id) : null) ??
    (isTwoPersonSameServiceIds(serviceIds)
      ? findTwoPersonPack(catalog, serviceIds[0])
      : null);
  if (!pack && !party?.pack_id) return false;

  if (!party || !guest) {
    if (!pack) return false;
    await startTwoPersonPackBooking(supabase, phone, pack, { chosenDate });
    return true;
  }

  if (!guest.name) {
    for (const member of party.members) {
      member.datetime_iso = chosenDate.toISOString();
    }
    party.slot_strategy = "same";
    party.collecting = "guest_name";
    await saveParty(supabase, phone, party, { step: "browsing" });
    await sendMessage(phone, COMPANION_NAME_ASK);
    return true;
  }

  party.collecting = "ready";
  party.slot_strategy = "same";
  for (const member of party.members) {
    if (!member.datetime_iso) member.datetime_iso = chosenDate.toISOString();
  }
  await saveParty(supabase, phone, party);
  return false;
}

/** Tras Maps o un corte, vuelve a pedir el nombre si todavía no está. */
export async function resumeCompanionAskIfNeeded(
  supabase: SupabaseClient,
  phone: string,
  catalog: ServiceCatalog,
): Promise<boolean> {
  const session = await getSession(supabase, phone);
  const party = getPartyFromSession(session);
  const guest = party?.members.find((m) => m.role === "guest");
  if (guest?.name && party?.collecting !== "guest_name") return false;
  if (party?.collecting === "guest_name") {
    await sendMessage(phone, COMPANION_NAME_ASK);
    return true;
  }
  const { data } = await supabase
    .from("wa_messages")
    .select("content")
    .eq("phone", phone)
    .eq("direction", "out")
    .order("created_at", { ascending: false })
    .limit(8);
  const asked = (data ?? []).some((row) =>
    /qui[eé]n te acompa/i.test(String(row.content ?? ""))
  );
  if (!asked) return false;
  const pack = findTwoPersonPack(catalog);
  if (pack) {
    await startTwoPersonPackBooking(supabase, phone, pack);
    return true;
  }
  await sendMessage(phone, COMPANION_NAME_ASK);
  return true;
}

/** "Me gusta el pack de 2" abre el flujo de dos citas antes de Haiku. */
export async function maybeStartDuoPackFromConfirm(
  supabase: SupabaseClient,
  phone: string,
  messageText: string,
  catalog: ServiceCatalog,
): Promise<boolean> {
  if (!confirmsTwoPersonPack(messageText)) return false;
  if (textInterruptsCompanionName(messageText) && !/\bpack\b/.test(messageText.toLowerCase())) {
    return false;
  }
  const session = await getSession(supabase, phone);
  const party = getPartyFromSession(session);
  if (party?.members.some((m) => m.role === "guest" && m.name)) return false;
  if (party?.collecting === "guest_name") {
    await sendMessage(phone, COMPANION_NAME_ASK);
    return true;
  }
  const pack = findTwoPersonPack(catalog);
  if (!pack) return false;
  await startTwoPersonPackBooking(supabase, phone, pack);
  return true;
}

/** Inicia flujo party (lista modo o salta si el texto ya implica juntos/guest). */
export async function startPartyBookingFlow(
  supabase: SupabaseClient,
  phone: string,
  triggerText: string,
): Promise<void> {
  const pending = await getPendingAppointmentsForPhone(supabase, phone);
  if (pending.length >= MAX_SCHEDULED_PER_CHAT) {
    await sendMessage(phone, PARTY_AT_LIMIT_MESSAGE);
    return;
  }

  const inferred = inferPartyModeFromText(triggerText);
  const party = emptyPartyBooking("mode");

  if (inferred === "together") {
    party.mode = "together";
    party.members = [
      { role: "primary", name: null, dni: null, service_ids: [], datetime_iso: null },
      { role: "guest", name: null, dni: null, service_ids: [], datetime_iso: null },
    ];
    party.collecting = "guest_name";
    await saveParty(supabase, phone, party, { step: "browsing" });
    await clearCart(supabase, phone);
    await sendMessage(
      phone,
      "¡Perfecto! Agendamos a *las dos* en este chat 💜\n\n" +
        "¿Cómo se llama quien te acompaña?",
    );
    return;
  }

  if (inferred === "guest_only") {
    party.mode = "guest_only";
    party.members = [
      { role: "guest", name: null, dni: null, service_ids: [], datetime_iso: null },
    ];
    party.collecting = "guest_name";
    await saveParty(supabase, phone, party, { step: "browsing" });
    await clearCart(supabase, phone);
    await sendMessage(
      phone,
      "¡Claro! Agendamos *a nombre de otra persona* desde este chat 💜\n\n" +
        "¿Cómo se llama?",
    );
    return;
  }

  await saveParty(supabase, phone, party, { step: "browsing" });
  await sendInteractiveList(
    phone,
    "¿Para quién es?",
    "Puedo agendar hasta 2 citas en este chat. Elige una opción:",
    "Ver opciones",
    [
      {
        title: "Opciones",
        rows: [
          {
            id: PARTY_MODE_TOGETHER_ID,
            title: "Vamos juntas (2)",
            description: "Tú + acompañante, 2 citas",
          },
          {
            id: PARTY_MODE_GUEST_ID,
            title: "Solo otra persona",
            description: "Cita a nombre de ella/él",
          },
        ],
      },
    ],
  );
}

export async function handlePartyModeTap(
  supabase: SupabaseClient,
  phone: string,
  rowId: string,
): Promise<boolean> {
  if (rowId !== PARTY_MODE_TOGETHER_ID && rowId !== PARTY_MODE_GUEST_ID) {
    return false;
  }
  const session = await getSession(supabase, phone);
  const party =
    parsePartyBooking(
      (session as { party_booking?: string | null })?.party_booking,
    ) ?? emptyPartyBooking("mode");

  if (rowId === PARTY_MODE_TOGETHER_ID) {
    party.mode = "together";
    party.members = [
      { role: "primary", name: null, dni: null, service_ids: [], datetime_iso: null },
      { role: "guest", name: null, dni: null, service_ids: [], datetime_iso: null },
    ];
    party.collecting = "guest_name";
    await saveParty(supabase, phone, party);
    await clearCart(supabase, phone);
    await sendMessage(
      phone,
      "¡Listo! ¿Cómo se llama quien te acompaña?",
    );
    return true;
  }

  party.mode = "guest_only";
  party.members = [
    { role: "guest", name: null, dni: null, service_ids: [], datetime_iso: null },
  ];
  party.collecting = "guest_name";
  await saveParty(supabase, phone, party);
  await clearCart(supabase, phone);
  await sendMessage(phone, "¿Cómo se llama la persona para quien agendamos?");
  return true;
}

async function askForMemberService(
  supabase: SupabaseClient,
  phone: string,
  party: PartyBooking,
  which: "primary" | "guest",
): Promise<void> {
  party.collecting = which === "primary" ? "primary_service" : "guest_service";
  await saveParty(supabase, phone, party, {
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
  });
  const catalog = await loadCatalog(supabase);
  const member =
    party.members.find((m) => m.role === which) ?? party.members[0];
  const label = partyMemberLabel(member);
  await sendMessage(
    phone,
    which === "primary"
      ? `Ahora elige *tu* servicio (o el de ${label}) 👇`
      : `Ahora elige el servicio de *${label}* 👇`,
  );
  await sendCategoriesList(phone, catalog.categories);
}

/** Nombre listo y servicios ya puestos (pack de 2): hora o calendario, no categorías. */
async function continueDuoPackAfterNames(
  supabase: SupabaseClient,
  phone: string,
  party: PartyBooking,
): Promise<void> {
  const pending = party.members.find((m) => m.datetime_iso)?.datetime_iso ?? null;
  if (pending && party.slot_strategy === "same") {
    for (const member of party.members) member.datetime_iso = pending;
    party.collecting = "ready";
    await saveParty(supabase, phone, party);
    const { finalizeBookingAfterDatetimeSelection } = await import("./payment.ts");
    const { getDateKeyLima } = await import("../lib/peru-holidays.ts");
    const chosen = new Date(pending);
    await finalizeBookingAfterDatetimeSelection(
      supabase,
      phone,
      chosen,
      getDateKeyLima(chosen),
    );
    return;
  }
  party.collecting = "datetime_primary";
  party.slot_strategy = "same";
  await saveParty(supabase, phone, party, { step: "awaiting_datetime" });
  await sendMessage(
    phone,
    "Listo. Agendo a las dos en el *mismo horario*, cada una con una profesional libre 💜\n\n¿Qué día les queda bien?",
  );
  const catalog = await loadCatalog(supabase);
  const serviceId = party.members[0]?.service_ids[0];
  const dur = serviceId
    ? (catalog.servicesById.get(serviceId)?.duration ?? 60)
    : 60;
  const ids = serviceId ? [serviceId, serviceId] : [];
  await sendDateSelector(phone, supabase, [], dur, 2, 2, catalog, ids);
}

/** Texto libre mientras party está activo (nombre, etc.). */
export async function tryHandlePartyText(
  supabase: SupabaseClient,
  phone: string,
  messageText: string,
): Promise<boolean> {
  const session = await getSession(supabase, phone);
  const party = parsePartyBooking(
    (session as { party_booking?: string | null })?.party_booking,
  );
  if (!party || party.collecting === "mode" || party.collecting === "ready") {
    return false;
  }
  if (
    (party.collecting === "guest_name" || party.collecting === "primary_name") &&
    !looksLikePersonName(messageText)
  ) {
    return false;
  }
  if (
    party.collecting === "primary_service" ||
    party.collecting === "guest_service" ||
    party.collecting === "datetime_primary" ||
    party.collecting === "datetime_guest"
  ) {
    return false; // catálogo / hora lo manejan otros handlers
  }

  const name = messageText.trim().replace(/\s+/g, " ").slice(0, 80);
  if (name.length < 2) {
    await sendMessage(phone, "Escribe el nombre completo, por favor 💜");
    return true;
  }

  if (party.collecting === "guest_name") {
    const guestIdx = party.members.findIndex((m) => m.role === "guest");
    if (guestIdx < 0) {
      party.members.push({
        role: "guest",
        name,
        dni: null,
        service_ids: [],
        datetime_iso: null,
      });
    } else {
      party.members[guestIdx].name = name;
    }

    if (party.mode === "guest_only") {
      await askForMemberService(supabase, phone, party, "guest");
      return true;
    }

    if (party.members.every((m) => m.service_ids.length > 0)) {
      const client = await findClientByWaRecipient(supabase, phone);
      const primaryIdx = party.members.findIndex((m) => m.role === "primary");
      if (client?.name && primaryIdx >= 0 && !party.members[primaryIdx].name) {
        party.members[primaryIdx].name = client.name;
      }
      await continueDuoPackAfterNames(supabase, phone, party);
      return true;
    }

    // together: nombre propio desde BD o preguntar
    const primaryIdx = party.members.findIndex((m) => m.role === "primary");
    const client = await findClientByWaRecipient(supabase, phone);
    if (client?.name && primaryIdx >= 0) {
      party.members[primaryIdx].name = client.name;
      await askForMemberService(supabase, phone, party, "primary");
      return true;
    }
    party.collecting = "primary_name";
    await saveParty(supabase, phone, party);
    await sendMessage(phone, `¿Y tu nombre completo?`);
    return true;
  }

  if (party.collecting === "primary_name") {
    const primaryIdx = party.members.findIndex((m) => m.role === "primary");
    if (primaryIdx >= 0) party.members[primaryIdx].name = name;
    await askForMemberService(supabase, phone, party, "primary");
    return true;
  }

  return false;
}

/**
 * Captura svc_/pack_ mientras party pide servicio de un miembro.
 * Devuelve true si consumió el tap (no seguir al carrito normal).
 */
export async function tryCapturePartyServiceTap(
  supabase: SupabaseClient,
  phone: string,
  serviceOrPackId: string,
  kind: "service" | "pack",
  unitPrice: number,
): Promise<boolean> {
  const session = await getSession(supabase, phone);
  const party = parsePartyBooking(
    (session as { party_booking?: string | null })?.party_booking,
  );
  if (!party) return false;
  if (
    party.collecting !== "primary_service" &&
    party.collecting !== "guest_service"
  ) {
    return false;
  }

  const role =
    party.collecting === "primary_service" ? "primary" : "guest";
  const idx = party.members.findIndex((m) => m.role === role);
  if (idx < 0) return false;

  // Packs: expandir a service_ids vía addCartItems + expand sería ideal;
  // para v1: solo servicios sueltos en party; packs van al carrito miembro como item.
  if (kind === "pack") {
    // Guardar pack como pseudo: service_ids vacío + cart temporal no — expandir pack
    const { data: pack } = await supabase
      .from("packs")
      .select("service_ids")
      .eq("id", serviceOrPackId)
      .maybeSingle();
    const ids = Array.isArray(pack?.service_ids)
      ? (pack!.service_ids as string[])
      : typeof pack?.service_ids === "string"
        ? (JSON.parse(pack.service_ids as string) as string[])
        : [];
    if (ids.length === 0) {
      await sendMessage(
        phone,
        "Ese pack no tiene servicios. Elige un servicio suelto de la lista 💜",
      );
      return true;
    }
    party.members[idx].service_ids = ids;
  } else {
    party.members[idx].service_ids = [serviceOrPackId];
  }

  // Precio en carrito para resumen/abono del episodio (suma miembros al final)
  void unitPrice;

  if (party.mode === "guest_only") {
    await prepareCartAndDatetime(supabase, phone, party);
    return true;
  }

  // together
  if (role === "primary") {
    await askForMemberService(supabase, phone, party, "guest");
    return true;
  }

  // guest service done → decidir same vs sequential
  await prepareCartAndDatetime(supabase, phone, party);
  return true;
}

async function prepareCartAndDatetime(
  supabase: SupabaseClient,
  phone: string,
  party: PartyBooking,
): Promise<void> {
  const catalog = await loadCatalog(supabase);
  const primary = party.members.find((m) => m.role === "primary");
  const guest = party.members.find((m) => m.role === "guest");

  if (party.mode === "together" && primary && guest) {
    const share = canShareSlot(
      primary.service_ids,
      guest.service_ids,
      catalog,
    );
    party.slot_strategy = share ? "same" : "sequential";
    party.collecting = "datetime_primary";
    // Carrito = servicios primary para selectores de capacidad
    await syncCartFromServiceIds(supabase, phone, primary.service_ids);
    await saveParty(supabase, phone, party, { step: "awaiting_datetime" });

    if (share) {
      await sendMessage(
        phone,
        `Pueden atenderse *a la misma hora* 💜\n` +
          `*${partyMemberLabel(primary)}* + *${partyMemberLabel(guest)}*\n\n` +
          `Elige el día y la hora para las dos:`,
      );
    } else {
      await sendMessage(
        phone,
        `Esos servicios no caben en el *mismo* horario 💜\n` +
          `Primero elige día y hora para *${partyMemberLabel(primary)}*:`,
      );
    }
  } else if (guest) {
    party.slot_strategy = "same";
    party.collecting = "datetime_guest";
    await syncCartFromServiceIds(supabase, phone, guest.service_ids);
    await saveParty(supabase, phone, party, { step: "awaiting_datetime" });
    await sendMessage(
      phone,
      `Elige día y hora para *${partyMemberLabel(guest)}*:`,
    );
  }

  // Disparar selectores
  const session = await getSession(supabase, phone);
  const ids =
    (session?.cartItems ?? []).flatMap((i: CartItem) =>
      i.item_type === "service" ? [i.item_id] : [],
    ) ?? [];
  const memberIds =
    party.mode === "guest_only"
      ? (guest?.service_ids ?? [])
      : (primary?.service_ids ?? []);
  await sendPartyDateSelector(
    supabase,
    phone,
    catalog,
    memberIds.length ? memberIds : ids,
  );
}

async function sendPartyDateSelector(
  supabase: SupabaseClient,
  phone: string,
  catalog: ServiceCatalog,
  serviceIds: string[],
): Promise<void> {
  const duration =
    serviceIds.reduce((a, id) => {
      const s = catalog.servicesById.get(id);
      return a + (s?.duration ?? 60);
    }, 0) || 60;
  const cap = overlapCapForCart(serviceIds, catalog);
  await sendDateSelector(
    phone,
    supabase,
    [],
    duration,
    cap,
    1,
    catalog,
    serviceIds,
  );
}

async function replacePackCart(
  supabase: SupabaseClient,
  phone: string,
  packId: string,
  price: number,
): Promise<void> {
  await upsertSession(supabase, phone, {
    cart_items: JSON.stringify([
      {
        item_type: "pack",
        item_id: packId,
        quantity: 1,
        price,
      },
    ]),
  });
}

async function syncCartFromServiceIds(
  supabase: SupabaseClient,
  phone: string,
  serviceIds: string[],
): Promise<void> {
  await clearCart(supabase, phone);
  if (serviceIds.length === 0) return;
  const { data: svcs } = await supabase
    .from("services")
    .select("id, price")
    .in("id", serviceIds);
  const items: CartItem[] = serviceIds.map((id) => {
    const row = (svcs ?? []).find((s: { id: string }) => s.id === id);
    return {
      item_type: "service" as const,
      item_id: id,
      quantity: 1,
      price: parseFloat(String((row as { price?: string })?.price ?? 0)),
    };
  });
  await addCartItems(supabase, phone, items);
}

/**
 * Tras elegir hora: avanza party (sequential 2.ª hora) o marca ready.
 * Devuelve true si el caller debe llamar finalizeBookingAfterDatetimeSelection
 * (carrito ya alineado al miembro / episodio).
 */
export async function onPartyDatetimeChosen(
  supabase: SupabaseClient,
  phone: string,
  chosenDate: Date,
): Promise<{ finalize: boolean; party: PartyBooking | null }> {
  const session = await getSession(supabase, phone);
  const party = parsePartyBooking(
    (session as { party_booking?: string | null })?.party_booking,
  );
  if (!party) return { finalize: true, party: null };

  const iso = chosenDate.toISOString();

  if (party.mode === "guest_only") {
    const g = party.members.find((m) => m.role === "guest");
    if (g) g.datetime_iso = iso;
    party.collecting = "ready";
    await syncCartFromServiceIds(supabase, phone, g?.service_ids ?? []);
    await saveParty(supabase, phone, party);
    return { finalize: true, party };
  }

  // together
  if (party.slot_strategy === "same") {
    for (const m of party.members) m.datetime_iso = iso;
    party.collecting = "ready";
    if (party.pack_id && party.pack_price != null) {
      await replacePackCart(supabase, phone, party.pack_id, party.pack_price);
    } else {
      const allIds = party.members.flatMap((m) => m.service_ids);
      await syncCartFromServiceIds(supabase, phone, allIds);
    }
    await saveParty(supabase, phone, party);
    return { finalize: true, party };
  }

  // sequential
  if (party.collecting === "datetime_primary") {
    const p = party.members.find((m) => m.role === "primary");
    if (p) p.datetime_iso = iso;
    party.collecting = "datetime_guest";
    const g = party.members.find((m) => m.role === "guest");
    await syncCartFromServiceIds(supabase, phone, g?.service_ids ?? []);
    await saveParty(supabase, phone, party, { step: "awaiting_datetime" });
    await sendMessage(
      phone,
      `Ahora elige día y hora para *${partyMemberLabel(g!)}*:`,
    );
    const catalog = await loadCatalog(supabase);
    await sendPartyDateSelector(supabase, phone, catalog, g?.service_ids ?? []);
    return { finalize: false, party };
  }

  if (party.collecting === "datetime_guest") {
    const g = party.members.find((m) => m.role === "guest");
    if (g) g.datetime_iso = iso;
    party.collecting = "ready";
    const allIds = party.members.flatMap((m) => m.service_ids);
    await syncCartFromServiceIds(supabase, phone, allIds);
    await saveParty(supabase, phone, party);
    return { finalize: true, party };
  }

  return { finalize: true, party };
}

export { partyIsReady, partyCreatingCount } from "../lib/party-booking.ts";
