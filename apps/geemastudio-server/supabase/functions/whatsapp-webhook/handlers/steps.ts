// steps.ts — Steps por sesión: foto previa al servicio y captura de pago

import { sendMessage } from "../wa-api.ts";
import {
  clearCart,
  getSession,
  type SupabaseClient,
  upsertSession,
} from "../lib/supabase.ts";
import { notifyAdmins, notifyAdminsPausedClientReply } from "../lib/notify.ts";
import { uploadWhatsAppMedia } from "../lib/notify.ts";
import { persistInboundWaImage } from "../lib/inbound-image.ts";
import {
  DEFAULT_UBICACION_TEXT,
  resolveUbicacionReply,
} from "../lib/salon-location.ts";
import {
  AWAITING_DEPOSIT_BOLETA,
  AWAITING_DEPOSIT_DATOS,
  processPaymentScreenshot,
  sendConfirmedBookingSummary,
  sendFixedDepositAdelantoStep,
  sendFixedDepositDatosStep,
} from "./payment.ts";
import { sendMenuWithPromos } from "./menu.ts";
import {
  matchesDateCorrectionIntent,
  matchesDepositFaqIntent,
  matchesLocationQuestion,
  matchesOpenHoursQuestion,
  matchesServiceChangeIntent,
  matchesSoftRescheduleIntent,
} from "./booking-flow.ts";
import {
  matchesAlreadyHaveDataIntent,
  parseClientIdentity,
  parseClientIdentityStitchingFragments,
  updateClientIdentity,
} from "./client-identity.ts";
import { WABA_PANEL_BASE } from "../lib/panel-url.ts";

const DEFAULT_HORARIOS_TEXT =
  "🕐 *Horarios de Atención*\n\n📅 Lunes a Sábado (con cita previa)\n⏰ 10:00 AM - 6:00 PM\n\n📅 Domingos\n⏰ 10:30 AM - 1:00 PM (previa cita + adelanto 20%)\n\n📅 Feriados\n⏰ 10:00 AM - 12:00 PM (cuando el CC abre)\n🚫 23, 28 y 29 jul: *cerrado* (CC no abre)";

const VOUCHER_REMINDER =
  "Cuando puedas, envía la foto del voucher o captura del comprobante como imagen, " +
  "y en un mensaje aparte tu nombre completo, número de DNI o CE y teléfono.\n\n" +
  "_Si quieres cancelar o cambiar algo, escribe_ *Cancelar*.";

const PAYMENT_STEP_TEXT_ACK =
  "Te leo 💜 aviso al equipo para ayudarte con el pago. " +
  "Cuando lo tengas, envíanos la captura del comprobante.";

/** ¿Ya se acusó recibo en este paso hace poco? (evita repetir ante "Okey"/"Gracias"). */
async function wasPaymentStepAckRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  windowMs = 30 * 60 * 1000,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since)
    .ilike("content", "%aviso al equipo para ayudarte con el pago%")
    .limit(1);
  if (error) {
    console.error("[WABA] wasPaymentStepAckRecentlySent:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Push a staff (debounce 3 min por teléfono) con el texto que la clienta escribió al pagar. */
async function notifyStaffPaymentStepText(
  supabase: SupabaseClient,
  phone: string,
  text: string,
): Promise<void> {
  const { data } = await supabase
    .from("clients")
    .select("name")
    .ilike("phone", `%${phone.replace(/\D/g, "").slice(-9)}`)
    .limit(1)
    .maybeSingle();
  await notifyAdminsPausedClientReply(supabase, {
    phone,
    clientName: (data as { name?: string } | null)?.name ?? "Clienta",
    messagePreview: `(paso de pago) ${text}`,
  });
}

/**
 * ¿Ya se mandó el recordatorio de nombre/DNI a este teléfono hace poco?
 * Alberto …0417, 18-sep: sin este guard salía idéntico cada vez que Haiku
 * respondía una pregunta suelta dentro de awaiting_deposit_boleta/datos.
 */
async function wasDepositReminderRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  windowMs = 5 * 60 * 1000,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since)
    .ilike("content", "%nombre y apellido%DNI o CE%")
    .limit(1);
  if (error) {
    console.error(
      "[WABA] wasDepositReminderRecentlySent query:",
      error.message,
    );
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Edgar …2122: "ya agendé" / "iré el lunes" no es ficha — no spamear el parser. */
function matchesBoletaGiveUpIntent(text: string): boolean {
  if (matchesAlreadyHaveDataIntent(text)) return true;
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/\bya\s+agend/.test(t)) return true;
  if (
    /\bire\s+el\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/
      .test(
        t,
      )
  ) {
    return true;
  }
  if (/\bnos\s+vemos\b/.test(t) && t.length <= 48) return true;
  return false;
}

async function parseIdentityFromRecentInbound(
  supabase: SupabaseClient,
  phoneNumber: string,
  current: string,
): Promise<{ name: string; dni: string } | null> {
  const sinceIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("wa_messages")
    .select("content")
    .eq("phone", phoneNumber)
    .eq("direction", "in")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(6);
  const recent = ((data ?? []) as { content?: string | null }[])
    .map((r) => (r.content ?? "").trim())
    .filter(Boolean);
  const texts = [current, ...recent.filter((t) => t !== current.trim())];
  return parseClientIdentityStitchingFragments(texts, {
    senderPhone: phoneNumber,
  });
}

/** Mid-pago: el adelanto aparta el horario y va a cuenta del total (Lizbeth …3315). */
const DEPOSIT_FAQ_REPLY =
  "El adelanto *no es aparte*: es para *reservar tu cupo* (el horario) " +
  "y se descuenta del total. El día de tu cita solo pagas el saldo restante 💜";

/**
 * Atiende el step "awaiting_pre_service_photo": exige imagen, sube a storage.
 * Si hay 2 áreas (pending_photo_areas), pasa al step 2; si no, va directo al pago.
 */
export async function handleAwaitingPreServicePhoto(
  supabase: SupabaseClient,
  phoneNumber: string,
  message: Record<string, unknown>,
): Promise<boolean> {
  if (message.type !== "image") {
    await sendMessage(
      phoneNumber,
      "📸 Necesito la foto para continuar. Por favor envíala como imagen.\n\n" +
        "Si tienes algún inconveniente, escríbenos al 📱 932 535 512.",
    );
    return true;
  }
  const imageData = message.image as Record<string, string>;
  const photoUrl = await uploadWhatsAppMedia(
    supabase,
    imageData.id,
    "pre-service-photos",
    `${phoneNumber}/${Date.now()}_pre_service.jpg`,
  );

  // Ver si hay pendiente una segunda foto
  const session = await getSession(supabase, phoneNumber);
  const pendingAreas = session?.pending_photo_areas
    ? (JSON.parse(session.pending_photo_areas as string) as string[])
    : [];

  if (pendingAreas.length >= 2) {
    // Guardar foto 1, pedir foto 2
    await upsertSession(supabase, phoneNumber, {
      pre_service_photo_url: photoUrl,
      step: "awaiting_pre_service_photo_2",
      pre_service_photo_requested: false,
    });
    await sendMessage(
      phoneNumber,
      `✅ ¡Foto recibida!\n\n*Foto 2 de 2:* Ahora envía una foto de ${
        pendingAreas[1]
      } 💜`,
    );
  } else {
    await upsertSession(supabase, phoneNumber, {
      pre_service_photo_url: photoUrl,
      step: "awaiting_payment_info",
      pre_service_photo_requested: false,
    });
    const updatedSession = await getSession(supabase, phoneNumber);
    await sendConfirmedBookingSummary(
      supabase,
      phoneNumber,
      updatedSession ?? {},
    );
  }
  return true;
}

/**
 * Atiende el step "awaiting_pre_service_photo_2": segunda foto (área distinta).
 */
export async function handleAwaitingPreServicePhoto2(
  supabase: SupabaseClient,
  phoneNumber: string,
  message: Record<string, unknown>,
): Promise<boolean> {
  if (message.type !== "image") {
    const session = await getSession(supabase, phoneNumber);
    const pendingAreas = session?.pending_photo_areas
      ? (JSON.parse(session.pending_photo_areas as string) as string[])
      : [];
    const area2 = pendingAreas[1] ?? "el área indicada";
    await sendMessage(
      phoneNumber,
      `📸 Necesito la foto de ${area2} para continuar. Por favor envíala como imagen.\n\nSi tienes algún inconveniente, escríbenos al 📱 932 535 512.`,
    );
    return true;
  }
  const imageData = message.image as Record<string, string>;
  const photoUrl2 = await uploadWhatsAppMedia(
    supabase,
    imageData.id,
    "pre-service-photos",
    `${phoneNumber}/${Date.now()}_pre_service_2.jpg`,
  );
  await upsertSession(supabase, phoneNumber, {
    pre_service_photo_url_2: photoUrl2,
    step: "awaiting_payment_info",
    pending_photo_areas: null,
  });
  const updatedSession = await getSession(supabase, phoneNumber);
  await sendConfirmedBookingSummary(
    supabase,
    phoneNumber,
    updatedSession ?? {},
  );
  return true;
}

const CANCEL_KEYWORDS = [
  "cancelar",
  "modificar",
  "menu",
  "menú",
  "empezar de nuevo",
  "inicio",
];

async function cancelFixedDepositFlow(
  supabase: SupabaseClient,
  phoneNumber: string,
): Promise<void> {
  await clearCart(supabase, phoneNumber);
  await upsertSession(supabase, phoneNumber, {
    step: "browsing",
    awaiting_screenshot: false,
    parsed_datetime: null,
    employee_assignments: "{}",
    deposit_mode: null,
  });
  await sendMessage(
    phoneNumber,
    "Listo, cancelamos esa reserva. ¿En qué más podemos ayudarte?",
  );
  await sendMenuWithPromos(phoneNumber, supabase);
}

/**
 * Abono fijo S/25 (post-#118: resumen+datos fusionados → boleta → adelanto).
 * Steps activos: awaiting_deposit_datos (legacy) | awaiting_deposit_boleta.
 * FAQ mid-abono (ubicación/horarios/adelanto) responde y retoma el pedido de datos
 * (Cielo PE.…5683, 13-sep — mismo patrón que VOUCHER_REMINDER mid-pago).
 */
export async function handleFixedDepositSteps(
  supabase: SupabaseClient,
  phoneNumber: string,
  message: Record<string, unknown>,
  messageText: string,
  session: Awaited<ReturnType<typeof getSession>>,
  opts?: {
    ubicacionText?: string;
    horariosText?: string;
    /**
     * Batch Haiku-primero — boleta (17-sep): si el texto no matchea nombre+DNI
     * y parece una pregunta, se intenta Haiku antes del copy estático (mismo
     * patrón `tryHandOffUnrecognizedToHaiku` de Batches 1-3, acotado al
     * fallback de no-match — el resto del step sigue determinístico).
     */
    tryHaikuOnUnmatchedIdentity?: (text: string) => Promise<boolean>;
  },
): Promise<boolean> {
  const step = session?.step;
  if (step !== AWAITING_DEPOSIT_DATOS && step !== AWAITING_DEPOSIT_BOLETA) {
    return false;
  }

  const rawText = (message.type === "text" &&
    (message as { text?: { body?: string } }).text?.body) ||
    messageText ||
    "";
  const lower = rawText.trim().toLowerCase();

  if (lower && CANCEL_KEYWORDS.some((k) => lower.includes(k))) {
    await cancelFixedDepositFlow(supabase, phoneNumber);
    return true;
  }

  if (lower && matchesLocationQuestion(lower)) {
    await sendMessage(
      phoneNumber,
      resolveUbicacionReply(
        lower,
        opts?.ubicacionText?.trim() || DEFAULT_UBICACION_TEXT,
      ),
    );
    await sendFixedDepositDatosStep(supabase, phoneNumber);
    return true;
  }
  if (lower && matchesOpenHoursQuestion(lower)) {
    await sendMessage(
      phoneNumber,
      opts?.horariosText?.trim() || DEFAULT_HORARIOS_TEXT,
    );
    await sendFixedDepositDatosStep(supabase, phoneNumber);
    return true;
  }
  if (lower && matchesDepositFaqIntent(lower)) {
    await sendMessage(phoneNumber, DEPOSIT_FAQ_REPLY);
    await sendFixedDepositDatosStep(supabase, phoneNumber);
    return true;
  }

  if (lower && matchesServiceChangeIntent(rawText)) {
    await upsertSession(supabase, phoneNumber, {
      step: "awaiting_datetime",
      awaiting_screenshot: false,
    });
    return false;
  }

  const wantsDateChange = matchesDateCorrectionIntent(rawText) ||
    matchesSoftRescheduleIntent(rawText) ||
    /\bsemana que viene\b/.test(lower);
  if (lower && wantsDateChange) {
    const { loadCatalog, overlapCapForCart } = await import(
      "../lib/services-catalog.ts"
    );
    const { sendDateSelector } = await import("./agenda.ts");
    const { getEmployeeIdsForSession } = await import("./booking-flow.ts");
    const { expandCartItemsToServiceIds } = await import("../lib/supabase.ts");
    const catalog = await loadCatalog(supabase);
    await upsertSession(supabase, phoneNumber, {
      step: "awaiting_datetime",
      parsed_datetime: null,
      selected_day: null,
    });
    await sendMessage(
      phoneNumber,
      "Dale, te cambio la fecha 📅 ¿Qué día te viene mejor?",
    );
    const fresh = await getSession(supabase, phoneNumber);
    const serviceIds = fresh?.cartItems?.length
      ? await expandCartItemsToServiceIds(supabase, fresh.cartItems)
      : (fresh?.serviceIds ?? []);
    const validSvcs = serviceIds
      .map((id: string) => catalog.servicesById.get(id))
      .filter(Boolean) as { duration?: number }[];
    const totalDuration = validSvcs.reduce((a, s) => a + (s.duration ?? 60), 0);
    const cap = overlapCapForCart(serviceIds, catalog);
    const empIds = await getEmployeeIdsForSession(
      supabase,
      { serviceIds },
      catalog,
    );
    await sendDateSelector(
      phoneNumber,
      supabase,
      empIds,
      totalDuration,
      cap,
      1,
      catalog,
      serviceIds,
    );
    return true;
  }

  // Imagen: en resumen → pedir datos; en boleta → exigir texto (no saltar al adelanto)
  if (message.type === "image") {
    if (step === AWAITING_DEPOSIT_DATOS) {
      await sendFixedDepositDatosStep(supabase, phoneNumber);
      return true;
    }
    await sendMessage(
      phoneNumber,
      "Para la boleta necesito los datos *escritos* 🙏 Envíame en un solo mensaje tu *nombre y apellido* y tu *DNI o CE* (ej: María García 87654321).",
    );
    return true;
  }

  if (step === AWAITING_DEPOSIT_DATOS) {
    await sendFixedDepositDatosStep(supabase, phoneNumber);
    return true;
  }

  if (matchesBoletaGiveUpIntent(rawText)) {
    await sendMessage(
      phoneNumber,
      "Disculpa el enredo con los datos 🙏 El cupo *aún no está reservado*. El equipo te escribe ahora para confirmarlo.",
    );
    await upsertSession(supabase, phoneNumber, {
      bot_paused_at: new Date().toISOString(),
    });
    await notifyAdmins(
      supabase,
      `Boleta atorada · ${phoneNumber.slice(-4)}`,
      rawText.slice(0, 180),
      {
        type: "waba_chat",
        phone: phoneNumber,
        url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(phoneNumber)}`,
      },
    );
    return true;
  }

  const identity = parseClientIdentity(rawText, { senderPhone: phoneNumber }) ??
    (await parseIdentityFromRecentInbound(supabase, phoneNumber, rawText));
  if (!identity) {
    // Sin ficha legible: no saltar al adelanto (se quedaba sin datos de boleta).
    // Alberto …0417, 18-sep: intentar anticipar con regex cada frase posible
    // ("¿pregunta?", "también quisiera...", etc.) es una lista infinita —
    // cualquier variante no prevista se perdía bajo el boilerplate genérico.
    // Ahora, si el texto no es una ficha de identidad, siempre se le pasa a
    // Haiku (ya sabe el contexto del chat) en vez de intentar adivinar por
    // patrón; los datos duros de identidad siguen 100% determinísticos porque
    // pasan por `parseClientIdentity` antes de llegar aquí. `add_to_cart`
    // queda bloqueado por step (ver `ai-assistant.ts`) así que es seguro
    // dejar que Haiku responda lo que sea sin arriesgar el carrito ya cerrado.
    if (opts?.tryHaikuOnUnmatchedIdentity) {
      const answered = await opts.tryHaikuOnUnmatchedIdentity(rawText);
      if (answered) {
        // Alberto …0417, 18-sep: si la clienta pregunta varias cosas seguidas
        // en este step, este recordatorio salía idéntico turno tras turno
        // ("se convierte en spam"). No repetirlo si ya salió hace poco —
        // Haiku ya respondió lo que preguntó, no hace falta insistir de nuevo.
        if (!(await wasDepositReminderRecentlySent(supabase, phoneNumber))) {
          await sendMessage(
            phoneNumber,
            "Cuando quieras seguimos con tu boleta 💜 Mándame tu *nombre y apellido* y tu *DNI o CE* en un solo mensaje (ej: María García 87654321).",
          );
        }
        return true;
      }
    }
    await sendMessage(
      phoneNumber,
      "Casi lo tenemos 💜 Mándame tu *nombre y apellido* y tu *DNI o CE* en un solo mensaje (ej: María García 87654321).",
    );
    return true;
  }
  await updateClientIdentity(supabase, phoneNumber, identity);
  await sendFixedDepositAdelantoStep(supabase, phoneNumber);
  return true;
}

/**
 * Atiende el step "awaiting_payment_screenshot": cancelar por texto o procesar imagen (captura de pago).
 * Preguntas de ubicación/horario/adelanto mid-pago se responden y se re-pide el voucher
 * (P1 09-ago ubicación; Lizbeth …3315 adelanto aparte).
 */
export async function handleAwaitingPaymentScreenshot(
  supabase: SupabaseClient,
  phoneNumber: string,
  message: Record<string, unknown>,
  messageText: string,
  session: Awaited<ReturnType<typeof getSession>>,
  opts?: { ubicacionText?: string; horariosText?: string },
): Promise<boolean> {
  const rawText = (message.type === "text" &&
    (message as { text?: { body?: string } }).text?.body) ||
    messageText ||
    "";
  const textForCancel = rawText.trim().toLowerCase();
  if (textForCancel && CANCEL_KEYWORDS.some((k) => textForCancel.includes(k))) {
    await clearCart(supabase, phoneNumber);
    await upsertSession(supabase, phoneNumber, {
      step: "browsing",
      awaiting_screenshot: false,
      parsed_datetime: null,
      employee_assignments: "{}",
    });
    await sendMessage(
      phoneNumber,
      "Listo, cancelamos esa reserva. ¿En qué más podemos ayudarte?",
    );
    await sendMenuWithPromos(phoneNumber, supabase);
    return true;
  }

  if (message.type !== "image") {
    if (textForCancel && matchesLocationQuestion(textForCancel)) {
      await sendMessage(
        phoneNumber,
        resolveUbicacionReply(
          textForCancel,
          opts?.ubicacionText?.trim() || DEFAULT_UBICACION_TEXT,
        ),
      );
      await sendMessage(phoneNumber, VOUCHER_REMINDER);
      return true;
    }
    if (textForCancel && matchesOpenHoursQuestion(textForCancel)) {
      await sendMessage(
        phoneNumber,
        opts?.horariosText?.trim() || DEFAULT_HORARIOS_TEXT,
      );
      await sendMessage(phoneNumber, VOUCHER_REMINDER);
      return true;
    }
    if (textForCancel && matchesDepositFaqIntent(textForCancel)) {
      // Una sola burbuja (FAQ + re-pide voucher) — evita carrera en poll QA
      // y no deja a la clienta sin el siguiente paso (Lizbeth …3315).
      await sendMessage(
        phoneNumber,
        `${DEPOSIT_FAQ_REPLY}\n\n${VOUCHER_REMINDER}`,
      );
      return true;
    }
    if (textForCancel && matchesServiceChangeIntent(rawText)) {
      await upsertSession(supabase, phoneNumber, {
        step: "awaiting_datetime",
        awaiting_screenshot: false,
      });
      return false;
    }
    // Texto libre sin imagen (Angelly …7854): no repetir la plantilla del voucher.
    // Avisa al equipo y acusa recibo una sola vez. NO toca la sesión: la captura
    // que llegue después (solo imagen) sigue por el flujo normal de abajo.
    if (rawText.trim()) {
      await notifyStaffPaymentStepText(supabase, phoneNumber, rawText);
      const ackRecent = await wasPaymentStepAckRecentlySent(
        supabase,
        phoneNumber,
      );
      if (!ackRecent) {
        await sendMessage(phoneNumber, PAYMENT_STEP_TEXT_ACK);
      }
      return true;
    }
    await sendMessage(phoneNumber, VOUCHER_REMINDER);
    return true;
  }

  const imageData = message.image as Record<string, string>;
  const screenshotUrl = await uploadWhatsAppMedia(
    supabase,
    imageData.id,
    "payment-screenshots",
    `${phoneNumber}/${Date.now()}_pago.jpg`,
  );
  // El panel solo pinta `wa_messages.image_url`: sin esto el comprobante quedaba solo
  // en el bucket privado `payment-screenshots` y el chat mostraba "[image]" sin foto
  // (caso Ana Paula …5112, 30-sep-2026). Fire-and-forget, no bloquea el flujo de pago.
  void persistInboundWaImage(supabase, {
    phone: phoneNumber,
    mediaId: imageData.id,
    caption: null,
  }).catch((err: unknown) =>
    console.error("[WABA] persist comprobante para panel:", err)
  );
  await processPaymentScreenshot(supabase, phoneNumber, screenshotUrl, session);
  return true;
}
