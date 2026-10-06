/**
 * Handlers post-tap de plantilla retoque_reenganche_zm.
 * Haiku personaliza el tono; el bot determinístico hace carrito + calendario.
 *
 * Ciclo Vanessa (ago 2026): lifting -> Lash Botox @30d; Botox -> lifting @25d.
 * Tip ricino = plantilla lifting_cuidados_ricino_zm ~dia 10 (no gate al Agendar).
 */

import type { ServiceCatalog } from "../lib/services-catalog.ts";
import {
  addToCart,
  clearCart,
  upsertSession,
  logMessage,
  type SupabaseClient,
} from "../lib/supabase.ts";
import { sendMessage } from "../wa-api.ts";
import { callAnthropicAPI } from "./ai-assistant.ts";
import { sendMenuWithPromos, sendServicesList } from "./menu.ts";
import { RETOUCH_OFFER_TTL_DAYS } from "../../_shared/retouch-resolve.ts";
import { limaNowTimestamp } from "../../_shared/lima-datetime.ts";
import { logAIUsage } from "../lib/haiku-usage.ts";

export type RetouchButtonKind = "agendar" | "otro" | "mas_adelante";

/** Envía por WA; si Meta falla (ej. número QA), igual deja rastro en wa_messages. */
async function safeSendText(
  supabase: SupabaseClient,
  phoneNumber: string,
  text: string,
): Promise<void> {
  try {
    await sendMessage(phoneNumber, text);
  } catch (err) {
    console.error("[retouch-reengage] sendMessage failed:", err);
    const { error } = await supabase.from("wa_messages").insert({
      phone: phoneNumber,
      direction: "out",
      msg_type: "text",
      content: text.slice(0, 2000),
      step_before: null,
    });
    if (error) console.error("[retouch-reengage] log fallback:", error.message);
  }
}

export function detectRetouchTemplateButton(
  buttonTitle: string,
): RetouchButtonKind | null {
  const t = buttonTitle.trim().toLowerCase();
  if (t === "agendar") return "agendar";
  if (t === "otro servicio" || t.includes("otro servicio")) return "otro";
  if (
    t === "más adelante" ||
    t === "mas adelante" ||
    t.includes("más adelante") ||
    t.includes("mas adelante")
  ) {
    return "mas_adelante";
  }
  return null;
}

interface OfferCtx {
  serviceId: string;
  serviceName: string;
  categoryId: string | null;
  categoryName: string | null;
  daysSince: number | null;
  totalVisits: number;
  clientName: string;
  expired: boolean;
  /** Hay una cita completed posterior a la que originó el recordatorio (oferta desactualizada). */
  hasNewerVisit: boolean;
}

async function loadOfferContext(
  supabase: SupabaseClient,
  phoneNumber: string,
  contactName: string,
  session: Record<string, unknown> | null,
  catalog: ServiceCatalog,
): Promise<OfferCtx | null> {
  const serviceId = session?.retouch_offer_service_id as string | null;
  if (!serviceId) return null;

  const sentAtRaw = session?.retouch_offer_sent_at as string | null;
  let expired = false;
  if (sentAtRaw) {
    const sentAt = new Date(sentAtRaw);
    const ttlMs = RETOUCH_OFFER_TTL_DAYS * 24 * 60 * 60 * 1000;
    expired = Date.now() - sentAt.getTime() > ttlMs;
  }

  const svc = catalog.servicesById.get(serviceId);
  const categoryId = svc?.category_id ?? null;
  const categoryName =
    catalog.categories.find((c) => c.id === categoryId)?.name ?? null;

  let daysSince: number | null = null;
  let hasNewerVisit = false;
  const lastAptId = session?.retouch_offer_last_appointment_id as string | null;
  if (lastAptId) {
    const { data: apt } = await supabase
      .from("appointments")
      .select("date")
      .eq("id", lastAptId)
      .maybeSingle();
    if (apt?.date) {
      const d = new Date(String(apt.date).replace(" ", "T"));
      const today = new Date();
      const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      const b = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      daysSince = Math.floor((b - a) / (1000 * 60 * 60 * 24));

      const last9Newer = phoneNumber.replace(/\D/g, "").slice(-9);
      const { count: newer } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gt("date", String(apt.date))
        .ilike("client_phone", `%${last9Newer}%`);
      hasNewerVisit = (newer ?? 0) > 0;
    }
  }

  const last9 = phoneNumber.replace(/\D/g, "").slice(-9);
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .ilike("client_phone", `%${last9}%`);

  return {
    serviceId,
    serviceName: svc?.name ?? "tu servicio",
    categoryId,
    categoryName,
    daysSince,
    totalVisits: count ?? 0,
    clientName: contactName.split(/\s+/)[0] || "hola",
    expired,
    hasNewerVisit,
  };
}

async function generateHaikuReengageText(
  supabase: SupabaseClient,
  phoneNumber: string,
  kind: RetouchButtonKind,
  ctx: OfferCtx,
): Promise<string | null> {
  const daysBit =
    ctx.daysSince != null
      ? `Han pasado ${ctx.daysSince} días desde su última visita.`
      : "Vuelve tras un tiempo sin visitarnos.";
  const system = `Eres parte del equipo de ZM Lash & Nails Beauty (Surco, Perú). Respondes el WhatsApp como una asesora real del salón.
Tono: cálido, cercano, profesional; la clienta debe sentir que es importante para el equipo y que están pendientes de ella y sus servicios.
Reglas:
- 2 a 4 frases cortas en español (es-PE).
- NO inventes precios, horarios ni disponibilidad.
- NO digas que eres un bot ni pidas que escriba "agendar" o "menú".
- NO uses markdown de acción (nada de action:...).
- Vocabulario aspiracional (lucir, look, pestañas, cejas); evita "consentirte/mimar/malcriarte".
- PROHIBIDO apodos: babe, baby, amor, cielo, linda, hermosa, bella, guapa, nena, bebé, cariño, reina.
- Máximo 350 caracteres.`;

  let userMsg: string;
  if (kind === "agendar") {
    userMsg = `La clienta ${ctx.clientName} tocó Agendar en el recordatorio de retoque.
Servicio ofrecido: ${ctx.serviceName}${ctx.categoryName ? ` (${ctx.categoryName})` : ""}.
${daysBit} Tiene ~${ctx.totalVisits} visitas completadas.
Escribe un mensaje breve agradeciendo su confianza e invitándola a elegir día y hora en el selector que le enviaremos justo después. No listes días.`;
  } else if (kind === "otro") {
    userMsg = `La clienta ${ctx.clientName} tocó "Otro servicio" en el recordatorio de retoque (habíamos ofrecido ${ctx.serviceName}).
${daysBit}
Escribe un mensaje breve mostrando apertura a lo que quiera esta vez; le enviaremos la lista de su categoría después.`;
  } else {
    userMsg = `La clienta ${ctx.clientName} tocó "Más adelante" en el recordatorio de retoque (${ctx.serviceName}).
Escribe UNA frase cálida respetando su tiempo, sin presión ni menú.`;
  }

  const result = await callAnthropicAPI(system, userMsg, {
    max_tokens: 180,
    timeout_ms: 4500,
    supabase,
    phoneNumber,
    source: "retouch_reengage",
  });
  if (!result?.text) return null;

  void logAIUsage(
    supabase,
    "retouch_reengage",
    result.inputTokens,
    result.outputTokens,
    phoneNumber,
  );

  return result.text.trim().slice(0, 500);
}

function fallbackText(kind: RetouchButtonKind, ctx: OfferCtx): string {
  if (kind === "agendar") {
    return `¡Qué gusto leerte, ${ctx.clientName}! 💜 Para tu *${ctx.serviceName}* elige el día y la hora que te queden bien 👇`;
  }
  if (kind === "otro") {
    return `Dale, ${ctx.clientName} 💜 Cuéntanos qué te gustaría esta vez — aquí tienes opciones:`;
  }
  return `Sin problema, ${ctx.clientName}. Cuando quieras retomar tu look, aquí estamos 💜`;
}

async function clearOffer(
  supabase: SupabaseClient,
  phoneNumber: string,
  extra?: Record<string, unknown>,
) {
  await upsertSession(supabase, phoneNumber, {
    retouch_offer_service_id: null,
    retouch_offer_last_appointment_id: null,
    ...extra,
  });
}

/** Categoría del primer ítem del carrito (útil tras Agendar, cuando ya se limpió la oferta). */
function categoryFromSessionCart(
  session: Record<string, unknown> | null,
  catalog: ServiceCatalog,
): { categoryId: string; categoryName: string | null } | null {
  let cart: Array<{ item_type?: string; item_id?: string }> = [];
  try {
    const raw = session?.cart_items;
    cart =
      typeof raw === "string" ? JSON.parse(raw) : ((raw as typeof cart) ?? []);
  } catch {
    return null;
  }
  if (!Array.isArray(cart) || cart.length === 0) return null;
  const first = cart[0];
  const id = first?.item_id;
  if (!id) return null;
  if (first.item_type === "pack") {
    const pack = catalog.packs.find((p) => p.id === id);
    if (!pack?.category_id) return null;
    return {
      categoryId: pack.category_id,
      categoryName:
        catalog.categories.find((c) => c.id === pack.category_id)?.name ?? null,
    };
  }
  const svc = catalog.servicesById.get(id);
  if (!svc?.category_id) return null;
  return {
    categoryId: svc.category_id,
    categoryName:
      catalog.categories.find((c) => c.id === svc.category_id)?.name ?? null,
  };
}

async function sendOtroServicioCatalog(
  phoneNumber: string,
  catalog: ServiceCatalog,
  categoryId: string | null,
  supabase: SupabaseClient,
): Promise<void> {
  if (categoryId) {
    try {
      const cat = catalog.categories.find((c) => c.id === categoryId);
      const svcs = catalog.services.filter((s) => s.category_id === categoryId);
      const packs = catalog.packs.filter((p) => p.category_id === categoryId);
      await sendServicesList(
        phoneNumber,
        cat?.name ?? "Servicios",
        svcs,
        false,
        packs,
      );
      return;
    } catch (err) {
      console.error("[retouch-reengage] sendServicesList failed:", err);
      logMessage(
        supabase,
        phoneNumber,
        "out",
        `[lista] ${catNameOrServicios(catalog, categoryId)}`,
        { msg_type: "interactive" },
      );
      return;
    }
  }
  try {
    await sendMenuWithPromos(phoneNumber, supabase);
  } catch (err) {
    console.error("[retouch-reengage] sendMenuWithPromos failed:", err);
  }
}

function catNameOrServicios(
  catalog: ServiceCatalog,
  categoryId: string,
): string {
  return (
    catalog.categories.find((c) => c.id === categoryId)?.name ?? "Servicios"
  );
}

async function bookOfferedService(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  serviceId: string;
  catalog: ServiceCatalog;
  proceedToBooking: () => Promise<void>;
  clearOfferAfter?: boolean;
}): Promise<void> {
  const {
    supabase,
    phoneNumber,
    serviceId,
    catalog,
    proceedToBooking,
    clearOfferAfter = true,
  } = opts;

  const last9 = phoneNumber.replace(/\D/g, "").slice(-9);
  const { data: upcoming } = await supabase
    .from("appointments")
    .select("id")
    .eq("status", "scheduled")
    .ilike("client_phone", `%${last9}%`)
    .gte("date", limaNowTimestamp(2))
    .limit(1);
  if (upcoming && upcoming.length > 0) {
    await clearOffer(supabase, phoneNumber, { step: "browsing" });
    await safeSendText(
      supabase,
      phoneNumber,
      "Ya tienes una cita agendada 💜 Si quieres cambiarla, escribe *mi cita*.",
    );
    return;
  }

  await clearCart(supabase, phoneNumber);
  const price = parseFloat(
    String(catalog.servicesById.get(serviceId)?.price ?? "0"),
  );
  await addToCart(supabase, phoneNumber, serviceId, price);
  if (clearOfferAfter) {
    await clearOffer(supabase, phoneNumber);
  }
  try {
    await proceedToBooking();
  } catch (err) {
    console.error("[retouch-reengage] proceedToBooking failed:", err);
    logMessage(
      supabase,
      phoneNumber,
      "out",
      "[lista] Elige día y hora para tu cita",
      { msg_type: "interactive" },
    );
    await upsertSession(supabase, phoneNumber, { step: "awaiting_datetime" });
  }
}

export async function handleRetouchTemplateButton(opts: {
  kind: RetouchButtonKind;
  phoneNumber: string;
  contactName: string;
  supabase: SupabaseClient;
  catalog: ServiceCatalog;
  session: Record<string, unknown> | null;
  proceedToBooking: () => Promise<void>;
}): Promise<boolean> {
  const {
    kind,
    phoneNumber,
    contactName,
    supabase,
    catalog,
    session,
    proceedToBooking,
  } = opts;

  const firstName = contactName.split(/\s+/)[0] || "hola";
  const ctx = await loadOfferContext(
    supabase,
    phoneNumber,
    contactName,
    session,
    catalog,
  );

  // Agendar sin oferta activa → no interceptar (flujo normal del bot).
  if (!ctx && kind === "agendar") return false;

  // Maribel 2026-07-19: tras Agendar se limpia la oferta, pero el botón de la
  // plantilla sigue vivo. "Otro servicio" / "Más adelante" no deben caer a Haiku
  // reafirmando el carrito de retoque.
  if (!ctx && kind === "otro") {
    const fromCart = categoryFromSessionCart(session, catalog);
    await clearCart(supabase, phoneNumber);
    await clearOffer(supabase, phoneNumber, { step: "browsing" });
    await safeSendText(
      supabase,
      phoneNumber,
      `Dale, ${firstName} 💜 Cuéntanos qué te gustaría esta vez — aquí tienes opciones:`,
    );
    await sendOtroServicioCatalog(
      phoneNumber,
      catalog,
      fromCart?.categoryId ?? null,
      supabase,
    );
    return true;
  }

  if (!ctx && kind === "mas_adelante") {
    await clearOffer(supabase, phoneNumber, { step: "browsing" });
    await safeSendText(
      supabase,
      phoneNumber,
      `Sin problema, ${firstName}. Cuando quieras retomar tu look, aquí estamos 💜`,
    );
    return true;
  }

  if (!ctx) return false;

  const safeCtx = ctx;

  if (kind === "mas_adelante") {
    const haiku = await generateHaikuReengageText(
      supabase,
      phoneNumber,
      kind,
      safeCtx,
    );
    await safeSendText(
      supabase,
      phoneNumber,
      haiku ?? fallbackText(kind, safeCtx),
    );
    await clearOffer(supabase, phoneNumber, { step: "browsing" });
    return true;
  }

  if (kind === "otro") {
    const haiku = await generateHaikuReengageText(
      supabase,
      phoneNumber,
      kind,
      safeCtx,
    );
    await safeSendText(
      supabase,
      phoneNumber,
      haiku ?? fallbackText(kind, safeCtx),
    );
    // Por si había carrito a medias: quiere cambiar de servicio
    await clearCart(supabase, phoneNumber);
    await clearOffer(supabase, phoneNumber, { step: "browsing" });
    await sendOtroServicioCatalog(
      phoneNumber,
      catalog,
      safeCtx.categoryId,
      supabase,
    );
    return true;
  }

  // Defensa: sesión inconsistente sin servicio persistido (no reintroducir
  // el combo expired||!serviceId que contradecía el saludo — solo !serviceId).
  if (!safeCtx.serviceId) {
    await clearOffer(supabase, phoneNumber, { step: "browsing" });
    await safeSendText(
      supabase,
      phoneNumber,
      "Escríbeme qué servicio quieres agendar y te ayudo con la fecha 💜",
    );
    return true;
  }

  // Servicio ofrecido ya no está en el catálogo activo (desactivado tras enviar
  // la plantilla; …9705 Pedicure Clásico, análisis 06-oct [P1]): no abrir
  // calendario con carrito vacío — avisar y mostrar el catálogo.
  if (!catalog.servicesById.has(safeCtx.serviceId)) {
    await clearCart(supabase, phoneNumber);
    await clearOffer(supabase, phoneNumber, { step: "browsing" });
    await safeSendText(
      supabase,
      phoneNumber,
      "Ese servicio ya no lo tenemos disponible 💜 ¿Qué te gustaría agendar? Aquí tienes opciones:",
    );
    await sendOtroServicioCatalog(
      phoneNumber,
      catalog,
      safeCtx.categoryId,
      supabase,
    );
    return true;
  }

  // Agendar: si el TTL del recordatorio venció, un solo mensaje +
  // calendario del servicio ofrecido — nunca saludo "te enviaremos el selector"
  // seguido de "Esa oferta ya venció" (Gaby …4563, análisis 05-ago [P4]).
  if (safeCtx.expired) {
    // Recordatorio viejo y ya se atendió después (Carmen …6325, 24-sep-2026:
    // tocó "Agendar" 26 días después, tras otra cita): no reservar el servicio
    // desactualizado — preguntar qué quiere. Sin mencionar "oferta" (no hay
    // promo, era solo un recordatorio).
    if (safeCtx.hasNewerVisit) {
      await clearCart(supabase, phoneNumber);
      await clearOffer(supabase, phoneNumber, { step: "browsing" });
      await safeSendText(
        supabase,
        phoneNumber,
        "¡Qué bueno verte de nuevo! 💜 Ese recordatorio ya es antiguo. ¿Qué servicio te gustaría agendar?",
      );
      await sendOtroServicioCatalog(
        phoneNumber,
        catalog,
        safeCtx.categoryId,
        supabase,
      );
      return true;
    }
    await safeSendText(
      supabase,
      phoneNumber,
      `Perfecto, te agendo tu *${safeCtx.serviceName}* 💜 Elige día y hora 👇`,
    );
    await bookOfferedService({
      supabase,
      phoneNumber,
      serviceId: safeCtx.serviceId,
      catalog,
      proceedToBooking,
    });
    return true;
  }

  const haiku = await generateHaikuReengageText(
    supabase,
    phoneNumber,
    kind,
    safeCtx,
  );
  await safeSendText(
    supabase,
    phoneNumber,
    haiku ?? fallbackText(kind, safeCtx),
  );

  await bookOfferedService({
    supabase,
    phoneNumber,
    serviceId: safeCtx.serviceId,
    catalog,
    proceedToBooking,
  });
  return true;
}
