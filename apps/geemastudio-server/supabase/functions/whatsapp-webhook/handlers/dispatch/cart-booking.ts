// cart-booking.ts — Carrito → calendario, tap catálogo stale, CTA precio (Plan 08)

import { sendMessage } from "../../wa-api.ts";
import {
  formatCartSummary,
  formatCartSummaryFromLines,
  orderedServicesFromIds,
} from "../../format.ts";
import {
  getSession,
  upsertSession,
  addCartItems,
  expandCartItemsToServiceIds,
  replaceCartKeepingSchedule,
  type SupabaseClient,
  type CartItem,
} from "../../lib/supabase.ts";
import { WA_IDS, getEmployeeCategories } from "../../lib/constants.ts";
import type { ServiceCatalog } from "../../lib/services-catalog.ts";
import {
  getCartDayRestrictionCaveat,
  overlapCapForCart,
} from "../../lib/services-catalog.ts";
import { sendDateSelector } from "../agenda.ts";
import {
  isCatalogNavigationInteractiveId,
  sendCategoriesList,
} from "../menu.ts";
import {
  getSessionSelectedDay,
  resendDatetimeSelectors,
  openBookingCalendarForCart,
} from "../booking-flow.ts";
import { isShortAffirmativeText } from "../menu-remap.ts";
import { matchesQuotedOfferConfirm } from "../../lib/pending-price-cta.ts";
import {
  shouldBlockAdditionalBooking,
  ADDITIONAL_BOOKING_BLOCK_MESSAGE,
} from "../pending-appointment.ts";

/** Tras agregar ítem por lista interactiva → mismo camino que Haiku add_to_cart. */
export async function openBookingAfterCartAdd(
  supabase: SupabaseClient,
  phoneNumber: string,
  catalog: ServiceCatalog,
): Promise<void> {
  const freshSession = await getSession(supabase, phoneNumber);
  await proceedToBookingWithCurrentCart(
    supabase,
    phoneNumber,
    freshSession,
    catalog,
  );
}
/**
 * Prefijos de paginación (actual + legado `svcspage_`/`packspage_`).
 * No deben pasar por handlers de `svc_`/`pack_`.
 */
export function isCatalogPageInteractiveId(id: string): boolean {
  return isCatalogNavigationInteractiveId(id);
}

/**
 * Tap svc_/pack_ de lista vieja mid-`awaiting_datetime` (Jessi …6106, Bu …0782).
 * Antes: el bloque cortaba con return (o "usa los botones") y no tocaba el carrito.
 * Ahora: reemplaza la selección, conserva selected_day y reenvía hora/fecha.
 */
export async function trySwapCartFromStaleCatalogTap(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  catalog: ServiceCatalog;
  session: {
    cartItems?: CartItem[];
    selected_day?: string | null;
    selected_date?: string | null;
    step?: string;
    serviceIds?: string[];
  } | null;
  userInput: string;
  isInteractive: boolean;
}): Promise<boolean> {
  const { supabase, phoneNumber, catalog, session, userInput, isInteractive } =
    opts;
  if (!isInteractive) return false;

  const { resolveCartItemPrice } = await import(
    "../../lib/services-catalog.ts"
  );
  let replacement: CartItem[] | null = null;
  let label = "";

  if (userInput.startsWith(WA_IDS.SERVICE_PREFIX)) {
    if (isCatalogPageInteractiveId(userInput)) return false;
    let serviceId = userInput.slice(WA_IDS.SERVICE_PREFIX.length);
    if (serviceId.includes("_i")) serviceId = serviceId.replace(/_i\d+$/, "");
    const svc = catalog.servicesById.get(serviceId);
    if (!svc) return false;
    const catalogPrice = parseFloat(String(svc.price)) || 0;
    const price = resolveCartItemPrice(
      catalog,
      "service",
      serviceId,
      catalogPrice,
    );
    replacement = [
      { item_type: "service", item_id: serviceId, quantity: 1, price },
    ];
    label = svc.name;
  } else if (userInput.startsWith(WA_IDS.PACK_PREFIX)) {
    if (isCatalogPageInteractiveId(userInput)) return false;
    const packId = userInput.slice(WA_IDS.PACK_PREFIX.length);
    const pack = catalog.packsById.get(packId);
    if (!pack) return false;
    const catalogPrice = parseFloat(String(pack.pack_price)) || 0;
    const price = resolveCartItemPrice(catalog, "pack", pack.id, catalogPrice);
    replacement = [{ item_type: "pack", item_id: pack.id, quantity: 1, price }];
    label = (pack.short_name || pack.title || "Pack").trim();
  } else {
    return false;
  }

  const current = session?.cartItems ?? [];
  const sameAlone =
    current.length === 1 &&
    current[0]!.item_type === replacement[0]!.item_type &&
    current[0]!.item_id === replacement[0]!.item_id;

  if (sameAlone) {
    await sendMessage(
      phoneNumber,
      `Eso ya está en tu selección 💜 Elige día u hora con los botones de abajo 👇`,
    );
    await resendDatetimeSelectors(
      phoneNumber,
      supabase,
      session ?? { serviceIds: [] },
      catalog,
      { debounce: false },
    );
    return true;
  }

  await replaceCartKeepingSchedule(supabase, phoneNumber, replacement);
  await upsertSession(supabase, phoneNumber, {
    pending_price_cta_service_id: null,
    pending_price_cta_at: null,
  });

  const total = replacement.reduce((a, i) => a + i.price, 0);
  const selectedDay = getSessionSelectedDay(
    (session ?? {}) as Record<string, unknown>,
  );
  await sendMessage(
    phoneNumber,
    `✅ Cambié tu selección a: *${label}* (S/ ${total.toFixed(0)})\n\n📅 ${
      selectedDay ? "Sigue eligiendo hora 👇" : "¿Qué día te queda bien? 👇"
    }`,
  );

  const fresh = await getSession(supabase, phoneNumber);
  await resendDatetimeSelectors(
    phoneNumber,
    supabase,
    fresh ?? session ?? { serviceIds: [] },
    catalog,
    { debounce: false },
  );
  return true;
}

/** TTL del "¿Te agendo el servicio ahora?" tras foto proactiva de precio. */
const PENDING_PRICE_CTA_TTL_MS = 10 * 60 * 1000;

/**
 * Zandry …0030: "Si" tras CTA de foto proactiva (sin carrito).
 * detectAITrigger descarta ≤3 chars → sin este handler cae al menú genérico.
 * Retorna true si consumió el turno.
 */
export async function tryAcceptPendingPriceCta(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  catalog: ServiceCatalog;
  session: {
    pending_price_cta_service_id?: string | null;
    pending_price_cta_at?: string | null;
  } | null;
  messageText: string;
}): Promise<boolean> {
  const { supabase, phoneNumber, catalog, session, messageText } = opts;
  if (
    !isShortAffirmativeText(messageText) &&
    !matchesQuotedOfferConfirm(messageText)
  ) {
    return false;
  }
  const { findRecentQuotedOfferIds, filterNonConflictingQuotedOfferIds } =
    await import("../../lib/pending-price-cta.ts");
  const quotedIds = await findRecentQuotedOfferIds(
    supabase,
    phoneNumber,
    catalog,
  );
  const pendingId = session?.pending_price_cta_service_id?.trim() || "";
  const sentAt = session?.pending_price_cta_at
    ? new Date(session.pending_price_cta_at).getTime()
    : 0;
  const pendingFresh =
    Boolean(pendingId) &&
    Boolean(sentAt) &&
    Date.now() - sentAt <= PENDING_PRICE_CTA_TTL_MS;
  const offerIds = [...new Set(quotedIds)];
  if (pendingFresh && pendingId && !offerIds.includes(pendingId)) {
    offerIds.push(pendingId);
  }
  const confirmNorm = messageText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const wantsPackOnly =
    /\bpack\b/.test(confirmNorm) &&
    !/\b(mojado|extension|lifting|promo)\b/.test(confirmNorm);
  if (wantsPackOnly) {
    const onlyPacks = offerIds.filter((id) => catalog.packsById.has(id));
    if (onlyPacks.length > 0) {
      offerIds.length = 0;
      offerIds.push(...onlyPacks);
    }
  }
  // filterNonConflictingQuotedOfferIds() devuelve la MISMA referencia del
  // array cuando length <= 1 (early return) \u2014 copiarla antes de vaciar/
  // rellenar offerIds in-place, si no offerIds.length=0 vac\u00eda tambi\u00e9n esta
  // variable (mismo objeto) y el push posterior no agrega nada (Jacqueline
  // 19-sep: "Si" con un solo servicio cotizado nunca se agregaba al carrito).
  const nonConflicting = [
    ...filterNonConflictingQuotedOfferIds(offerIds, catalog, messageText),
  ];
  offerIds.length = 0;
  offerIds.push(...nonConflicting);
  if (offerIds.length === 0) {
    if (session?.pending_price_cta_service_id) {
      await upsertSession(supabase, phoneNumber, {
        pending_price_cta_service_id: null,
        pending_price_cta_at: null,
      });
    }
    return false;
  }

  const { resolveCartItemPrice } = await import(
    "../../lib/services-catalog.ts"
  );
  const toAdd: CartItem[] = [];
  const labels: string[] = [];
  for (const offerId of offerIds) {
    const pack = catalog.packsById.get(offerId);
    const svc = catalog.servicesById.get(offerId);
    if (pack) {
      const catalogPrice = parseFloat(String(pack.pack_price)) || 0;
      toAdd.push({
        item_type: "pack",
        item_id: pack.id,
        quantity: 1,
        price: resolveCartItemPrice(catalog, "pack", pack.id, catalogPrice),
      });
      labels.push(pack.short_name ?? pack.title);
    } else if (svc) {
      const catalogPrice = parseFloat(String(svc.price)) || 0;
      toAdd.push({
        item_type: "service",
        item_id: svc.id,
        quantity: 1,
        price: resolveCartItemPrice(catalog, "service", svc.id, catalogPrice),
      });
      labels.push(svc.name);
    }
  }
  if (toAdd.length === 0) {
    await upsertSession(supabase, phoneNumber, {
      pending_price_cta_service_id: null,
      pending_price_cta_at: null,
    });
    return false;
  }

  if (
    await shouldBlockAdditionalBooking(supabase, phoneNumber, {
      rescheduleAppointmentId: null,
    })
  ) {
    await upsertSession(supabase, phoneNumber, {
      pending_price_cta_service_id: null,
      pending_price_cta_at: null,
    });
    await sendMessage(phoneNumber, ADDITIONAL_BOOKING_BLOCK_MESSAGE);
    return true;
  }

  await addCartItems(supabase, phoneNumber, toAdd);
  await upsertSession(supabase, phoneNumber, {
    pending_price_cta_service_id: null,
    pending_price_cta_at: null,
  });
  const total = toAdd.reduce((a, i) => a + i.price, 0);
  await sendMessage(
    phoneNumber,
    `✅ Listo: *${labels.join(" + ")}* (S/ ${total.toFixed(0)})\n\n📅 ¿Qué día te queda bien?`,
  );
  await openBookingAfterCartAdd(supabase, phoneNumber, catalog);
  return true;
}

/**
 * Aplica un pending_price_cta_service_id vigente ANTES de procesar un tap
 * de fecha/hora (date_/time_) — Melisa …9414 (27-sep-2026): Haiku cotizó
 * "Baby Vol. Tecnológica 3D" y preguntó "¿Te agendo este servicio?", pero la
 * clienta confirmó tocando directamente la hora en la lista interactiva en
 * vez de responder con texto. tryAcceptPendingPriceCta() de arriba solo se
 * dispara con texto libre (dispatcher.ts exige `!interactiveId && messageText`)
 * — sin este helper, el tap de fecha/hora agendaba el servicio VIEJO que ya
 * estaba en el carrito (el de la oferta de retoque) en vez del recién
 * cotizado. Reemplaza el carrito completo por el servicio/pack cotizado
 * (mismo criterio que trySwapCartFromStaleCatalogTap) y limpia el CTA
 * pendiente. Silencioso: no envía mensaje propio, deja que el flujo de
 * fecha/hora que sigue confirme con el servicio ya corregido. Retorna true
 * si cambió el carrito (el llamador debe refrescar la sesión).
 */
export async function applyPendingPriceCtaBeforeDatetimeTap(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  catalog: ServiceCatalog;
  session: {
    pending_price_cta_service_id?: string | null;
    pending_price_cta_at?: string | null;
    cartItems?: CartItem[];
  } | null;
}): Promise<boolean> {
  const { supabase, phoneNumber, catalog, session } = opts;
  const pendingId = session?.pending_price_cta_service_id?.trim() || "";
  const sentAt = session?.pending_price_cta_at
    ? new Date(session.pending_price_cta_at).getTime()
    : 0;
  const fresh =
    Boolean(pendingId) &&
    Boolean(sentAt) &&
    Date.now() - sentAt <= PENDING_PRICE_CTA_TTL_MS;
  if (!fresh) return false;

  const pack = catalog.packsById.get(pendingId);
  const svc = catalog.servicesById.get(pendingId);
  if (!pack && !svc) {
    await upsertSession(supabase, phoneNumber, {
      pending_price_cta_service_id: null,
      pending_price_cta_at: null,
    });
    return false;
  }

  const current = session?.cartItems ?? [];
  const itemType: "pack" | "service" = pack ? "pack" : "service";
  const alreadyThere = current.some(
    (it) => it.item_id === pendingId && it.item_type === itemType,
  );
  if (alreadyThere) {
    await upsertSession(supabase, phoneNumber, {
      pending_price_cta_service_id: null,
      pending_price_cta_at: null,
    });
    return false;
  }

  const { resolveCartItemPrice } = await import(
    "../../lib/services-catalog.ts"
  );
  const catalogPrice =
    parseFloat(String(pack ? pack.pack_price : svc!.price)) || 0;
  const price = resolveCartItemPrice(
    catalog,
    itemType,
    pendingId,
    catalogPrice,
  );
  const replacement: CartItem[] = [
    { item_type: itemType, item_id: pendingId, quantity: 1, price },
  ];

  await replaceCartKeepingSchedule(supabase, phoneNumber, replacement);
  await upsertSession(supabase, phoneNumber, {
    pending_price_cta_service_id: null,
    pending_price_cta_at: null,
  });
  console.log(
    `[cart-booking] pending_price_cta aplicado antes de tap fecha/hora: ${
      pack ? pack.title : svc!.name
    }`,
  );
  return true;
}

/** TTL del "¿quieres ver ejemplos?" (oferta condicional de portafolio) tras action:none. */
const PENDING_PORTFOLIO_CTA_TTL_MS = 10 * 60 * 1000;

/**
 * Jacqueline …2438, 19-sep: "Sii" tras oferta condicional de portafolio
 * ("también te puedo mostrar opciones con fotos reales si quieres ver
 * ejemplos ✨") caía al menú genérico porque detectAITrigger descarta
 * mensajes ≤3 chars (Haiku nunca ve el "Sii" para emitir show_portfolio).
 * Retorna true si consumió el turno (envió el portafolio).
 */
export async function tryAcceptPendingPortfolioCta(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  catalog: ServiceCatalog;
  session: { pending_portfolio_cta_at?: string | null } | null;
  messageText: string;
}): Promise<boolean> {
  const { supabase, phoneNumber, catalog, session, messageText } = opts;
  if (!isShortAffirmativeText(messageText)) return false;

  const sentAt = session?.pending_portfolio_cta_at
    ? new Date(session.pending_portfolio_cta_at).getTime()
    : 0;
  const fresh = Boolean(sentAt) && Date.now() - sentAt <= PENDING_PORTFOLIO_CTA_TTL_MS;
  if (!fresh) return false;

  await upsertSession(supabase, phoneNumber, {
    pending_portfolio_cta_at: null,
  });

  const { resolveAndSendPortfolio } = await import("../../lib/portfolio.ts");
  const { data } = await supabase
    .from("wa_messages")
    .select("content, created_at")
    .eq("phone", phoneNumber)
    .eq("direction", "out")
    .eq("msg_type", "text")
    .order("created_at", { ascending: false })
    .limit(4);
  const recentOutText = (data ?? [])
    .map((row: { content?: string | null }) => String(row.content ?? ""))
    .join("\n");

  const freshSession = await getSession(supabase, phoneNumber);
  const cartIds = (freshSession?.serviceIds ?? []).filter(Boolean);
  await resolveAndSendPortfolio({
    supabase,
    phoneNumber,
    param: null,
    messageText: recentOutText,
    cartServiceIds: cartIds,
    catalogServices: catalog.services.map((s) => ({
      id: s.id,
      name: s.name,
      short_name: s.short_name ?? null,
      category_id: s.category_id ?? null,
    })),
    categories: catalog.categories.map((c) => ({
      id: c.id,
      name: c.name,
    })),
    portfolioIndex: catalog.portfolioIndex ?? [],
  });
  return true;
}

/** OUT del bot en los últimos `windowMs` (anti saludo genérico post-reprogramar). */
export async function hadRecentBotOutbound(
  supabase: SupabaseClient,
  phoneNumber: string,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phoneNumber)
    .eq("direction", "out")
    .gte("created_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Cierra el episodio de browse-reengage (p. ej. tras confirmar asistencia). */
export async function markBrowseEpisodeClosed(
  supabase: SupabaseClient,
  phoneNumber: string,
): Promise<void> {
  await upsertSession(supabase, phoneNumber, {
    browse_reengage_sent_at: new Date().toISOString(),
  });
}

export async function proceedToBookingWithCurrentCart(
  supabase: SupabaseClient,
  phoneNumber: string,
  session: {
    cartItems?: {
      item_type: string;
      item_id: string;
      quantity: number;
      price: number;
    }[];
    serviceIds?: string[];
    selected_day?: string | null;
    selected_date?: string | null;
    reschedule_appointment_id?: string | null;
  } | null,
  catalog: ServiceCatalog,
  opts?: {
    rescheduleAppointmentId?: string | null;
    messageText?: string;
  },
): Promise<void> {
  const hasCart =
    (session?.cartItems?.length ?? 0) > 0 ||
    (session?.serviceIds?.length ?? 0) > 0;
  if (!hasCart) {
    await sendMessage(
      phoneNumber,
      "No tienes servicios en tu selección. Agrega al menos uno.",
    );
    await sendCategoriesList(phoneNumber, catalog.categories);
    return;
  }

  const rescheduleIdEarly =
    opts?.rescheduleAppointmentId ?? session?.reschedule_appointment_id ?? null;
  if (
    await shouldBlockAdditionalBooking(supabase, phoneNumber, {
      rescheduleAppointmentId: rescheduleIdEarly,
    })
  ) {
    await sendMessage(phoneNumber, ADDITIONAL_BOOKING_BLOCK_MESSAGE);
    return;
  }

  const cartItems = session?.cartItems ?? [];
  const useCartItems =
    cartItems.length > 0 && cartItems.some((i) => i.price > 0);
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
    for (const it of cartItems) {
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
    const dayCaveat = getCartDayRestrictionCaveat(
      catalog,
      cartItems.map((it) => ({
        item_type: it.item_type as "service" | "pack",
        item_id: it.item_id,
      })),
    );
    if (dayCaveat) summary += `\n\n${dayCaveat}`;
    const ids = await expandCartItemsToServiceIds(
      supabase,
      cartItems as CartItem[],
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
    const ids = session?.serviceIds ?? [];
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
  const rescheduleId =
    opts?.rescheduleAppointmentId ?? session?.reschedule_appointment_id ?? null;

  // Sticky / fecha en mensaje → hora (o cierra si trae hora); no lista genérica 7 días
  const opened = await openBookingCalendarForCart(
    supabase,
    phoneNumber,
    {
      ...session,
      serviceIds: session?.serviceIds ?? orderedServices.map((s) => s.id),
    },
    catalog,
    {
      messageText: opts?.messageText,
      rescheduleAppointmentId: rescheduleId,
      summaryPrefix: `✅ Listo — ${summary}`,
    },
  );
  if (opened) return;

  await upsertSession(supabase, phoneNumber, {
    step: "awaiting_datetime",
    employee_assignments: JSON.stringify({}),
    reschedule_appointment_id: rescheduleId ?? null,
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
  await sendMessage(phoneNumber, `${summary}\n\n📅 *¿Qué día prefieres?*`);
  await sendDateSelector(
    phoneNumber,
    supabase,
    [...possibleEmpIds],
    totalMin,
    cap,
    minEmployeesFree,
    catalog,
    serviceIdsForCap,
  );
}
