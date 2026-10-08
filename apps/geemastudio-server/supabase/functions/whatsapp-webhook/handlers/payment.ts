// payment.ts — Resumen de pago, depósito 20% y procesamiento de comprobantes

import { sendMessage } from "../wa-api.ts";
import {
  formatSessionDatetimeIso,
  formatSoles,
  isBusinessHours,
  limaIsoWeekday,
  orderedServicesFromIds,
  toLimaLocalTimestamp,
} from "../format.ts";
import {
  compositionKey,
  loadCatalog,
  overlapCapForCart,
  recomputeCartItemsForWeekday,
} from "../lib/services-catalog.ts";
import {
  appointmentPhoneForRecipient,
  type CartItem,
  cartItemsToDisplayLabel,
  expandCartItemsToLines,
  findClientByWaRecipient,
  getSession,
  type SupabaseClient,
  upsertSession,
} from "../lib/supabase.ts";
import { getLoadedWabaRules } from "../lib/tenant-rules-store.ts";
import { getMediosDePago, YAPE_PLIN_NUMBER } from "../lib/constants.ts";
import {
  FIXED_DEPOSIT_AMOUNT,
  formatAdvancePercent,
  getAdvancePaymentRate,
} from "../lib/peru-holidays.ts";
import {
  getConfigPositiveNumber,
  getConfigText,
  loadWabaConfig,
  type WabaConfigMap,
} from "../lib/waba-config.ts";
import { getConsideracionesPreviasWhatsApp } from "../lib/policies.ts";
import { notifyAdmins } from "../lib/notify.ts";
import {
  ADDITIONAL_BOOKING_BLOCK_MESSAGE,
  BOOKING_OVERLAP_MESSAGE,
  clientRequiresFixedDeposit,
  newBookingOverlapsExisting,
  shouldBlockAdditionalBooking,
  STAFF_COORDINATION_PHONE,
} from "./pending-appointment.ts";
import { hasSlotCapacityForServices } from "./agenda.ts";
import { notifyHeldSlotLost } from "./held-slot-lost.ts";
import {
  parsePartyBooking,
  partyCreatingCount,
  type PartyMember,
  partyMemberLabel,
} from "../lib/party-booking.ts";
import { askClientIdentityIfNeeded } from "./client-identity.ts";
import { logWaError } from "../lib/error-log.ts";

const BOOKING_INSERT_FAIL_MESSAGE =
  `Tuve un problema al guardar tu cita 🙏 Por favor escríbenos al 📱 *${STAFF_COORDINATION_PHONE}* y la confirmamos a manita, así no se pierde tu horario.`;

/** Reparte el precio del pack en soles con céntimos que suman el total. */
function splitPackPrice(total: number, parts: number, index: number): number {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const rem = cents - base * parts;
  return (base + (index >= 0 && index < rem ? 1 : 0)) / 100;
}

/** Copy Vanessa — abono fijo sin completed. Placeholders: {monto} {tolerancia} */
/** Paso 1→2: enviamos resumen; esperamos respuesta antes de pedir datos. */
export const AWAITING_DEPOSIT_DATOS = "awaiting_deposit_datos";
/** Paso 2→3: pedimos boleta; esperamos datos antes de pedir adelanto. */
export const AWAITING_DEPOSIT_BOLETA = "awaiting_deposit_boleta";

export const DEFAULT_DEPOSIT_FIXED_DATOS = `*Datos para la boleta* 🪷

Envíanos en un mensaje:
🪷 Nombre y apellido
🪻 Celular / WhatsApp
🪷 DNI / CE`;

export const DEFAULT_DEPOSIT_FIXED_ADELANTO =
  `*Adelanto para reservar tu cupo* ✨

Realiza un adelanto de S/{monto} vía Yape o Plin al:

📲 932 535 512
ZM Lash and Nails Beauty

Cuando pagues, mándanos el print de pantalla para confirmar tu cita 💜

*Importante:*
⏰ Tolerancia el día de tu cita: {tolerancia} minutos.

📅 Si por algún motivo ya no puedes venir, avísanos con anticipación.

Detrás de cada cita hay otra personita esperando un espacio.

⚠️ *El adelanto no es reembolsable* si cancelas, no asistes o tienes un imprevisto.

Puedes reprogramar *una sola vez*, avisando con mínimo 24 horas de anticipación y sujeto a disponibilidad; tu adelanto se mantiene a tu favor.

Si somos nosotras quienes no podemos atenderte, reprogramamos sin costo o te reembolsamos el adelanto.

📝 Al enviar tu pago aceptas estas condiciones: zmlashnails.com/terminos-y-condiciones

¡Gracias por confiar en ZM Lash and Nails Beauty! 🌸✨`;

/**
 * Cuando el total del carrito es menor al abono fijo habitual (S/25): se pide
 * el pago completo. Mezcla A+B (producto 12-sep-2026) — no decir "adelanto".
 */
export const DEFAULT_DEPOSIT_FIXED_FULL_PAYMENT =
  `*Pago para confirmar tu cita* ✨

Tu servicio es S/{monto}, así que para reservar el cupo te pedimos el *pago completo* (no un adelanto parcial). Como es menor al abono habitual de S/{abono_fijo}, el pago cubre el total y el día de tu cita no queda saldo.

Realiza el pago vía Yape o Plin al:

📲 932 535 512
ZM Lash and Nails Beauty

Cuando pagues, mándanos el print de pantalla para confirmar tu cita 💜

*Importante:*
⏰ Tolerancia el día de tu cita: {tolerancia} minutos.

📅 Si por algún motivo ya no puedes venir, avísanos con anticipación.

Detrás de cada cita hay otra personita esperando un espacio.

⚠️ *El pago no es reembolsable* si cancelas, no asistes o tienes un imprevisto.

Puedes reprogramar *una sola vez*, avisando con mínimo 24 horas de anticipación y sujeto a disponibilidad; tu pago se mantiene a tu favor.

Si somos nosotras quienes no podemos atenderte, reprogramamos sin costo o te reembolsamos el pago.

📝 Al enviar tu pago aceptas estas condiciones: zmlashnails.com/terminos-y-condiciones

¡Gracias por confiar en ZM Lash and Nails Beauty! 🌸✨`;

/** Monolito legacy (tests / CMS viejo). Preferir burbujas en `buildFixedDepositBubblesFromConfig`. */
export const DEFAULT_DEPOSIT_FIXED_INSTRUCTIONS =
  `${DEFAULT_DEPOSIT_FIXED_DATOS}

${DEFAULT_DEPOSIT_FIXED_ADELANTO}
`;

function fixedDepositAmountFromConfig(config: WabaConfigMap): number {
  return Math.round(
    getConfigPositiveNumber(
      config,
      "deposit_fixed_amount",
      getLoadedWabaRules()?.deposit.fixedAmount ?? FIXED_DEPOSIT_AMOUNT,
      ["amount", "value", "number"],
    ),
  );
}

function fixedDepositToleranceFromConfig(config: WabaConfigMap): number {
  return Math.round(
    getConfigPositiveNumber(config, "deposit_fixed_tolerance_minutes", 5, [
      "minutes",
      "value",
      "number",
    ]),
  );
}

function applyDepositPlaceholders(
  template: string,
  monto: number,
  tolerance: number,
  abonoFijo?: number,
): string {
  const montoStr = String(Math.round(monto));
  const abonoStr = String(Math.round(abonoFijo ?? FIXED_DEPOSIT_AMOUNT));
  return template
    .replaceAll("{monto}", montoStr)
    .replaceAll("{abono_fijo}", abonoStr)
    .replaceAll("{tolerancia}", String(tolerance))
    .replace(
      /\s*_?si te equivocaste o quieres cambiar algo, escribe_?\s+\*cancelar\*\s+_?para volver a empezar\.?_?\s*$/i,
      "",
    )
    .trim();
}

export type FixedDepositBubbleOpts = {
  /** Si true: total &lt; abono fijo → copy de pago completo (no "adelanto"). */
  fullPayment?: boolean;
};

/**
 * Tres burbujas: resumen (caller) + datos boleta + adelanto/pago completo.
 * Si el CMS aún tiene el monolito "1. … 2. …", se parte; si no, defaults.
 * Con `fullPayment`, no se usa el CMS de adelanto (habla de "adelanto").
 */
export function buildFixedDepositBubblesFromConfig(
  config: WabaConfigMap,
  monto: number,
  opts?: FixedDepositBubbleOpts,
): { datos: string; adelanto: string } {
  const tolerance = fixedDepositToleranceFromConfig(config);
  const abonoFijo = fixedDepositAmountFromConfig(config);
  const fill = (t: string) =>
    applyDepositPlaceholders(t, monto, tolerance, abonoFijo);

  if (opts?.fullPayment) {
    return {
      datos: fill(DEFAULT_DEPOSIT_FIXED_DATOS),
      adelanto: fill(DEFAULT_DEPOSIT_FIXED_FULL_PAYMENT),
    };
  }

  const cms = getConfigText(
    config,
    "deposit_fixed_instructions_text",
    "",
  ).trim();

  if (cms) {
    const filled = fill(cms);
    // Partir monolito Vanessa: bloque 1 (datos) / bloque 2 (adelanto)
    const splitOnTwo = filled.split(/\n(?=\s*2\.\s*Realiza un adelanto)/i);
    if (splitOnTwo.length >= 2) {
      const rawDatos = splitOnTwo[0]!
        .replace(/^Sigue estos pasos[^\n]*\n*/i, "")
        .replace(/^\s*1\.\s*/i, "")
        .trim();
      const datos = rawDatos.startsWith("*")
        ? rawDatos
        : `*Datos para la boleta* 🪷\n\n${
          rawDatos.replace(
            /^Envíanos tus datos para la boleta:\s*/i,
            "Envíanos en un mensaje:\n",
          )
        }`;
      const adelanto = splitOnTwo.slice(1).join("\n").trim();
      return {
        datos,
        adelanto: adelanto.startsWith("*") ? adelanto : adelanto.replace(
          /^2\.\s*Realiza un adelanto/i,
          "*Adelanto para reservar tu cupo* ✨\n\nRealiza un adelanto",
        ),
      };
    }
    // CMS solo con copy de adelanto (sin paso 1)
    if (/adelanto|Yape|Plin/i.test(filled) && !/\bDNI\b/i.test(filled)) {
      return {
        datos: fill(DEFAULT_DEPOSIT_FIXED_DATOS),
        adelanto: filled,
      };
    }
  }

  return {
    datos: fill(DEFAULT_DEPOSIT_FIXED_DATOS),
    adelanto: fill(DEFAULT_DEPOSIT_FIXED_ADELANTO),
  };
}

export function buildFixedDepositInstructionsFromConfig(
  config: WabaConfigMap,
  monto: number,
  opts?: FixedDepositBubbleOpts,
): string {
  const { datos, adelanto } = buildFixedDepositBubblesFromConfig(
    config,
    monto,
    opts,
  );
  return `${datos}\n\n${adelanto}`;
}

/** Abono fijo nunca debe superar el total del servicio (ej. S/5 no puede pedir abono S/25). */
function capFixedDepositToTotal(
  fixedAmount: number,
  totalPrice: number,
): number {
  return totalPrice > 0 ? Math.min(fixedAmount, totalPrice) : fixedAmount;
}

/** True cuando el monto a cobrar es el total del carrito (menor al abono fijo habitual). */
function isFullPrepayDeposit(
  fixedAmount: number,
  monto: number,
  totalPrice: number,
): boolean {
  return totalPrice > 0 && monto < fixedAmount && monto >= totalPrice;
}

/** Paso 2: pedir datos de boleta (tras respuesta al resumen). */
export async function sendFixedDepositDatosStep(
  supabase: SupabaseClient,
  phone: string,
): Promise<void> {
  const config = await loadWabaConfig(supabase);
  const session = await getSession(supabase, phone);
  const totalPrice = session
    ? await resolveCartTotalPrice(supabase, session)
    : 0;
  const fixedAmount = fixedDepositAmountFromConfig(config);
  const monto = capFixedDepositToTotal(fixedAmount, totalPrice);
  const { datos } = buildFixedDepositBubblesFromConfig(config, monto, {
    fullPayment: isFullPrepayDeposit(fixedAmount, monto, totalPrice),
  });
  await sendMessage(phone, datos);
  await upsertSession(supabase, phone, {
    step: AWAITING_DEPOSIT_BOLETA,
    awaiting_screenshot: false,
    deposit_mode: "fixed",
  });
}

/** Paso 3: pedir adelanto/pago completo + pasar a voucher. */
export async function sendFixedDepositAdelantoStep(
  supabase: SupabaseClient,
  phone: string,
): Promise<void> {
  const config = await loadWabaConfig(supabase);
  const session = await getSession(supabase, phone);
  const totalPrice = session
    ? await resolveCartTotalPrice(supabase, session)
    : 0;
  const fixedAmount = fixedDepositAmountFromConfig(config);
  const monto = capFixedDepositToTotal(fixedAmount, totalPrice);
  const { adelanto } = buildFixedDepositBubblesFromConfig(config, monto, {
    fullPayment: isFullPrepayDeposit(fixedAmount, monto, totalPrice),
  });
  await sendMessage(phone, adelanto);
  await upsertSession(supabase, phone, {
    step: "awaiting_payment_screenshot",
    awaiting_screenshot: true,
    deposit_mode: "fixed",
  });
}

async function resolveFixedDepositAmount(
  supabase: SupabaseClient,
): Promise<number> {
  return fixedDepositAmountFromConfig(await loadWabaConfig(supabase));
}

/** Total del carrito de la sesión (cart_items con precio, o cart_service_ids legacy). */
async function resolveCartTotalPrice(
  supabase: SupabaseClient,
  session: Record<string, unknown> & { cartItems?: CartItem[] },
): Promise<number> {
  const cartItems = session.cartItems ?? [];
  const useCartItems = cartItems.length > 0 &&
    cartItems.some((i) => i.price > 0);
  if (useCartItems) {
    return cartItems.reduce((sum, it) => sum + it.quantity * it.price, 0);
  }
  const cartIds = JSON.parse(
    (session.cart_service_ids as string) ?? "[]",
  ) as string[];
  if (!cartIds.length) return 0;
  const { data: svcs } = await supabase
    .from("services")
    .select("price")
    .in("id", [...new Set(cartIds)]);
  return (svcs ?? []).reduce(
    (sum: number, s: { price: string | number }) =>
      sum + parseFloat(String(s.price)),
    0,
  );
}

/**
 * INSERT de cita con chequeo de error. Si falla, loguea y avisa a la clienta
 * (no enviar "cita confirmada" fantasma).
 */
async function insertAppointmentChecked(
  supabase: SupabaseClient,
  phone: string,
  row: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<{ id: string } | null> {
  const { data: appt, error } = await supabase
    .from("appointments")
    .insert(row)
    .select()
    .single();

  if (error || !appt?.id) {
    console.error(
      "[WABA] INSERT appointments falló:",
      error?.message ?? "sin id",
    );
    await logWaError(supabase, {
      phone,
      step: "booking_insert",
      msgType: "text",
      error: error ?? new Error("appointments insert sin id"),
      context,
      fallbackSent: true,
    });
    await sendMessage(phone, BOOKING_INSERT_FAIL_MESSAGE);
    return null;
  }
  return appt as { id: string };
}

/**
 * Si la sesión tiene party_booking listo, crea 1–2 citas (nombres/horarios por miembro).
 * Devuelve true si consumió el finalize (caller no debe crear cita normal).
 */
async function tryFinalizePartyAppointments(
  supabase: SupabaseClient,
  phone: string,
  session: Record<string, unknown> & { cartItems?: CartItem[] },
  opts: {
    kind: "confirmed" | "deposit";
    screenshotUrl?: string | null;
    depositAmount?: number;
  },
): Promise<boolean> {
  const party = parsePartyBooking(
    (session as { party_booking?: string | null }).party_booking,
  );
  if (!party || party.collecting !== "ready") return false;

  const members = party.members.filter((m) => m.service_ids.length > 0);
  if (members.length === 0) return false;

  const creating = partyCreatingCount(party);
  if (
    await shouldBlockAdditionalBooking(supabase, phone, {
      creatingCount: creating,
    })
  ) {
    await sendMessage(phone, ADDITIONAL_BOOKING_BLOCK_MESSAGE);
    return true;
  }

  const clientData = await findClientByWaRecipient(supabase, phone);
  const apptPhone = appointmentPhoneForRecipient(phone);
  const created: {
    id: string;
    member: PartyMember;
    price: number;
    dateLima: string;
  }[] = [];
  // Duración configurada del pack/promo (composición de TODOS los miembros): cada cita la guarda
  // para que el motor de capacidad reserve el tiempo real (p. ej. 2 lifting simultáneos = 75).
  const partyCatalog = await loadCatalog(supabase);
  const partySlotMinutes = members.length > 1 && party.mode === "together"
    ? (partyCatalog.packSlotMinutes?.get(
      compositionKey(members.flatMap((m) => m.service_ids)),
    ) ?? null)
    : null;

  for (const member of members) {
    const { data: svcs } = await supabase
      .from("services")
      .select("id, name, price, duration, category_id")
      .in("id", member.service_ids);
    type Svc = {
      id: string;
      name: string;
      price: string | number;
      duration: number | null;
      category_id: string | null;
    };
    const ordered = orderedServicesFromIds(
      member.service_ids,
      svcs ?? [],
    ) as Svc[];
    if (!ordered.length) continue;

    const catalogSum = ordered.reduce(
      (s, svc) => s + parseFloat(String(svc.price)),
      0,
    );
    const memberIndex = members.indexOf(member);
    const price = party.pack_price != null && members.length > 0
      ? splitPackPrice(party.pack_price, members.length, memberIndex)
      : catalogSum;
    const duration = partySlotMinutes ??
      ordered.reduce((s, svc) => s + (svc.duration ?? 60), 0);
    const names = ordered.map((s) => s.name).join(" + ");
    const iso = member.datetime_iso ??
      (session.parsed_datetime as string) ??
      new Date().toISOString();
    const dateLima = toLimaLocalTimestamp(new Date(iso));

    const otherNames = members
      .filter((m) => m !== member)
      .map((m) => partyMemberLabel(m))
      .join(", ");
    const noteParty = party.mode === "together"
      ? `Multi-cita WABA (${partyMemberLabel(member)}${
        otherNames ? ` + ${otherNames}` : ""
      }).`
      : `Cita a nombre de terceros vía WABA (${partyMemberLabel(member)}).`;

    const appt = await insertAppointmentChecked(
      supabase,
      phone,
      {
        client_id: member.role === "primary" ? (clientData?.id ?? null) : null,
        client_name: member.name?.trim() ||
          (member.role === "primary"
            ? (clientData?.name ?? "Cliente WhatsApp")
            : "Acompañante"),
        client_phone: apptPhone,
        client_document: member.dni ??
          (member.role === "primary"
            ? ((clientData as { dni?: string | null })?.dni ?? null)
            : null),
        service_id: ordered[0].id,
        service_ids: ordered.map((s) => s.id),
        employee_id: null,
        date: dateLima,
        status: "scheduled",
        price: price.toString(),
        duration,
        source: "whatsapp",
        whatsapp_phone: phone,
        deposit_amount: "0",
        notes: `${noteParty} ${names}`,
      },
      {
        flow: "tryFinalizePartyAppointments",
        branch: party.mode ?? "party",
        date: dateLima,
        member: member.role,
      },
    );
    if (!appt) {
      // Rollback parcial
      for (const prev of created) {
        await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", prev.id);
      }
      return true;
    }

    await supabase.from("appointment_services").insert(
      ordered.map((svc) => ({
        appointment_id: appt.id,
        service_id: svc.id,
        employee_id: null,
        price: parseFloat(String(svc.price)).toString(),
        duration: svc.duration ?? 60,
      })),
    );
    created.push({ id: appt.id, member, price, dateLima });
  }

  if (!created.length) {
    await sendMessage(phone, BOOKING_INSERT_FAIL_MESSAGE);
    return true;
  }

  const totalPrice = created.reduce((s, c) => s + c.price, 0);
  const allNames = created
    .map((c) =>
      `${partyMemberLabel(c.member)}: ${c.member.service_ids.length} svc`
    )
    .join(" · ");
  const serviceLabelParts: string[] = [];
  for (const c of created) {
    const { data: svcs } = await supabase
      .from("services")
      .select("name")
      .in("id", c.member.service_ids);
    const n = (svcs ?? []).map((s: { name: string }) => s.name).join(" + ");
    serviceLabelParts.push(`*${partyMemberLabel(c.member)}*: ${n}`);
  }
  const servicesLine = serviceLabelParts.map((l) => `🌸 ${l}`).join("\n");
  const datesLine = created
    .map(
      (c) =>
        `📅 ${partyMemberLabel(c.member)}: ${
          formatSessionDatetimeIso(
            new Date(c.member.datetime_iso ?? c.dateLima).toISOString(),
          )
        }`,
    )
    .join("\n");

  if (opts.kind === "deposit") {
    const depositAmount = opts.depositAmount ?? 0;
    const verificationIds: string[] = [];
    // Una verificación por cita (schema 1:1 appointment_id)
    for (const c of created) {
      const share = totalPrice > 0
        ? Math.ceil(depositAmount * (c.price / totalPrice))
        : depositAmount;
      const { data: verification } = await supabase
        .from("appointment_verifications")
        .insert({
          appointment_id: c.id,
          client_phone: apptPhone ?? phone,
          client_name: c.member.name?.trim() ||
            (clientData?.name ?? "Cliente WhatsApp"),
          service_name: serviceLabelParts.join(" | "),
          appointment_date: c.dateLima,
          amount_deposit: share,
          amount_total: c.price,
          payment_screenshot_url: opts.screenshotUrl ?? null,
          status: "payment_submitted",
          kind: "deposit",
        })
        .select("id")
        .maybeSingle();
      if (verification?.id) verificationIds.push(verification.id);
    }

    await upsertSession(supabase, phone, {
      step: "completed",
      awaiting_screenshot: false,
      cart_service_ids: "[]",
      cart_items: "[]",
      selected_day: null,
      parsed_datetime: null,
      party_booking: null,
      deposit_mode: null,
      verification_id: verificationIds[0] ?? null,
    });

    await notifyAdmins(
      supabase,
      "💰 Multi-cita WABA (abono enviado)",
      `${clientData?.name ?? "Cliente"} — ${created.length} citas — total S/ ${
        totalPrice.toFixed(0)
      }`,
      {
        screen: "ValidacionPagos",
        verificationId: verificationIds[0] ?? "",
        appointmentId: created[0].id,
        phone,
      },
    );

    const inHours = isBusinessHours();
    await sendMessage(
      phone,
      (inHours
        ? `✅ ¡Recibido! Tu comprobante está siendo revisado.\n\n`
        : `✅ ¡Gracias! Tus citas quedan reservadas provisionalmente.\n\n`) +
        `📋 *Resumen:*\n${servicesLine}\n${datesLine}\n` +
        `• Adelanto: S/ ${formatSoles(depositAmount)}\n` +
        `• Total: S/ ${formatSoles(totalPrice)}\n\n` +
        (inHours
          ? `Validaremos tu pago en breve. ¡Gracias! 💜`
          : `Validaremos tu pago a primera hora del próximo día hábil. 💜`),
    );
    await askClientIdentityIfNeeded(supabase, phone);

    if (verificationIds[0] && opts.screenshotUrl) {
      const {
        classifyInboundImage,
        paymentMethodFromExtraction,
        EMPTY_PAYMENT_EXTRACTION,
      } = await import("../lib/image-classify.ts");
      const { sendPaymentVerificationTemplate } = await import(
        "../lib/payment-template.ts"
      );
      const classified = await classifyInboundImage(opts.screenshotUrl, {
        supabase,
        phoneNumber: phone,
      });
      const extraction =
        classified.kind === "comprobante_pago" && classified.extraction
          ? classified.extraction
          : EMPTY_PAYMENT_EXTRACTION;
      await supabase
        .from("appointment_verifications")
        .update({
          payment_method: paymentMethodFromExtraction(extraction.app_origen),
        })
        .eq("id", verificationIds[0]);
      void sendPaymentVerificationTemplate({
        verificationId: verificationIds[0],
        imageUrl: opts.screenshotUrl,
        clientName: (clientData?.name ?? phone).slice(0, 60),
        serviceName: serviceLabelParts.join(" · ").slice(0, 60),
        appointmentDateLabel: formatSessionDatetimeIso(
          created[0].member.datetime_iso ?? created[0].dateLima,
        ).slice(0, 60),
        extraction,
      }).catch((err) =>
        console.error("[WABA] party sendPaymentVerificationTemplate:", err)
      );
    }

    void allNames;
    return true;
  }

  await upsertSession(supabase, phone, {
    step: "completed",
    awaiting_screenshot: false,
    cart_service_ids: "[]",
    cart_items: "[]",
    selected_day: null,
    parsed_datetime: null,
    party_booking: null,
    deposit_mode: null,
  });

  await notifyAdmins(
    supabase,
    "📅 Multi-cita agendada (WABA)",
    `${clientData?.name ?? "Cliente"} — ${created.length} citas — total S/ ${
      totalPrice.toFixed(0)
    }`,
    { screen: "Agenda", appointmentId: created[0].id, phone },
  );

  const inHours = isBusinessHours();
  await sendMessage(
    phone,
    (inHours
      ? `✅ *¡Citas confirmadas!* 💜\n\n`
      : `✅ *¡Citas anotadas!* 💜\n\n`) +
      `📋 *Resumen:*\n${servicesLine}\n${datesLine}\n` +
      `💰 Total: S/ ${formatSoles(totalPrice)}\n\n` +
      (inHours
        ? `El pago se realiza el día de la cita. ¡Te esperamos! 🌸`
        : `En cuanto abramos te confirmamos. ¡Gracias! 🌸`),
  );
  await askClientIdentityIfNeeded(supabase, phone);

  void allNames;
  return true;
}

/**
 * Crea la cita directamente (sin solicitar pago) y envía confirmación al cliente.
 * Reemplaza el flujo de abono 20% + screenshot.
 */
export async function sendConfirmedBookingSummary(
  supabase: SupabaseClient,
  phone: string,
  session: Record<string, unknown> & { cartItems?: CartItem[] },
): Promise<void> {
  if (
    await tryFinalizePartyAppointments(supabase, phone, session, {
      kind: "confirmed",
    })
  ) {
    return;
  }

  const cartItems = session.cartItems ?? [];
  const useCartItems = cartItems.length > 0 &&
    cartItems.some((i) => i.price > 0);

  let totalPrice = 0;
  let servicesLine = "";
  let allServiceNames = "";
  const categoryIds: string[] = [];

  if (useCartItems) {
    // Reusar la lógica de líneas usada en el flujo de pago (service|pack)
    const lines: {
      name: string;
      quantity: number;
      unitPrice: number;
      duration?: number;
      category_id?: string;
      service_id?: string;
    }[] = [];
    for (const it of cartItems) {
      if (it.item_type === "service") {
        const { data: svc } = await supabase
          .from("services")
          .select("id, name, duration, category_id")
          .eq("id", it.item_id)
          .maybeSingle();
        lines.push({
          name: (svc as { name: string })?.name ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
          duration: (svc as { duration?: number })?.duration ?? 60,
          category_id: (svc as { category_id?: string })?.category_id,
          service_id: (svc as { id?: string })?.id ?? it.item_id,
        });
        if ((svc as { category_id?: string })?.category_id) {
          categoryIds.push((svc as { category_id: string }).category_id);
        }
      } else {
        const { data: pack } = await supabase
          .from("packs")
          .select("title, short_name")
          .eq("id", it.item_id)
          .maybeSingle();
        const name =
          (pack as { short_name?: string; title: string })?.short_name ||
          (pack as { title?: string })?.title ||
          it.item_id;
        lines.push({
          name: name as string,
          quantity: it.quantity,
          unitPrice: it.price,
        });
      }
    }
    totalPrice = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    allServiceNames = lines.map((l) => l.name).join(" + ");
    servicesLine = lines.length > 1
      ? lines
        .map(
          (l) =>
            `🌸 ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.name} — S/ ${
              formatSoles(l.quantity * l.unitPrice)
            }`,
        )
        .join("\n")
      : `💅 ${
        lines.map((
          l,
        ) => (l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name)).join(
          " + ",
        )
      }`;
  } else {
    const cartIds = JSON.parse(
      (session.cart_service_ids as string) ?? "[]",
    ) as string[];
    if (!cartIds.length) return;
    const { data: svcs } = await supabase
      .from("services")
      .select("id, name, price, category_id")
      .in("id", [...new Set(cartIds)]);
    type SvcRow = {
      id: string;
      name: string;
      price: string | number;
      category_id?: string | null;
    };
    const services: SvcRow[] = orderedServicesFromIds(cartIds, svcs ?? []);
    totalPrice = services.reduce(
      (sum: number, s: SvcRow) => sum + parseFloat(String(s.price)),
      0,
    );
    allServiceNames = services.map((s: SvcRow) => s.name).join(" + ");
    servicesLine = services.length > 1
      ? services
        .map(
          (s: SvcRow) =>
            `🌸 ${s.name} — S/ ${formatSoles(parseFloat(String(s.price)))}`,
        )
        .join("\n")
      : `💅 Servicio: ${services.map((s: SvcRow) => s.name).join(" + ")}`;
    services.forEach((s: SvcRow) => {
      const cid = s.category_id ?? undefined;
      if (cid) categoryIds.push(cid);
    });
  }

  // Buscar clienta por BSUID o phone_country + phone_normalized
  const clientData = await findClientByWaRecipient(supabase, phone);
  const apptPhone = appointmentPhoneForRecipient(phone);

  const appointmentDate = (session.parsed_datetime as string) ??
    new Date().toISOString();
  const appointmentDateLima = toLimaLocalTimestamp(new Date(appointmentDate));

  const createdAppts: { id: string }[] = [];
  if (useCartItems) {
    // Crear una sola cita con múltiples servicios (appointment_services) como en el flujo legacy
    const lines = await expandCartItemsToLines(supabase, cartItems);
    const totalDuration = lines.reduce((s, l) => s + (l.duration ?? 60), 0);
    const total = lines.reduce((s, l) => s + l.price, 0);
    allServiceNames = await cartItemsToDisplayLabel(supabase, cartItems);
    const { data: svcsForNames } = await supabase
      .from("services")
      .select("id, name, category_id")
      .in("id", [...new Set(lines.map((l) => l.service_id))]);
    const catIds = new Set<string>();
    for (const line of lines) {
      const svc = (svcsForNames ?? []).find(
        (s: { id: string }) => s.id === line.service_id,
      );
      if ((svc as { category_id?: string })?.category_id) {
        catIds.add((svc as { category_id: string }).category_id);
      }
    }
    categoryIds.splice(0, categoryIds.length, ...[...catIds]);
    totalPrice = total;

    const blockedExtra = await shouldBlockAdditionalBooking(supabase, phone);
    const overlapsExisting = !blockedExtra &&
      (await newBookingOverlapsExisting(
        supabase,
        phone,
        new Date(appointmentDate),
        totalDuration,
      ));
    if (blockedExtra || overlapsExisting) {
      await sendMessage(
        phone,
        blockedExtra
          ? ADDITIONAL_BOOKING_BLOCK_MESSAGE
          : BOOKING_OVERLAP_MESSAGE,
      );
      return;
    }

    const appt = await insertAppointmentChecked(
      supabase,
      phone,
      {
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? "Cliente WhatsApp",
        client_phone: apptPhone,
        client_document: (clientData as { dni?: string | null })?.dni ?? null,
        service_id: lines[0]?.service_id ?? null,
        service_ids: lines.map((l) => l.service_id),
        employee_id: null,
        date: appointmentDateLima,
        status: "scheduled",
        price: total.toString(),
        duration: totalDuration,
        source: "whatsapp",
        whatsapp_phone: phone,
        deposit_amount: "0",
        notes: `Cita agendada vía WhatsApp.${
          lines.length > 1 ? ` (${allServiceNames})` : ""
        }`,
      },
      {
        flow: "sendConfirmedBookingSummary",
        branch: "cart_items",
        date: appointmentDateLima,
      },
    );

    if (!appt) return;

    createdAppts.push(appt);
    await supabase.from("appointment_services").insert(
      lines.map((l) => ({
        appointment_id: appt.id,
        service_id: l.service_id,
        pack_id: l.pack_id ?? null,
        employee_id: null,
        price: l.price.toString(),
        duration: l.duration ?? 60,
      })),
    );
  } else {
    // Carrito legacy (solo ids): una sola cita
    const cartIds = JSON.parse(
      (session.cart_service_ids as string) ?? "[]",
    ) as string[];
    const { data: svcsData } = await supabase
      .from("services")
      .select("id, name, price, duration, category_id")
      .in("id", [...new Set(cartIds)]);
    type AllSvcRow = {
      id: string;
      name: string;
      price: string | number;
      duration: number | null;
      category_id: string | null;
    };
    const allServices: AllSvcRow[] = orderedServicesFromIds(
      cartIds,
      svcsData ?? [],
    );
    if (!allServices.length) return;
    totalPrice = allServices.reduce(
      (s, svc) => s + parseFloat(String(svc.price)),
      0,
    );
    allServiceNames = allServices.map((s: AllSvcRow) => s.name).join(" + ");
    categoryIds.splice(
      0,
      categoryIds.length,
      ...([
        ...new Set(
          allServices.map((s: AllSvcRow) => s.category_id).filter(Boolean),
        ),
      ] as string[]),
    );
    const totalDuration = allServices.reduce(
      (s, svc) => s + (svc.duration ?? 60),
      0,
    );

    const blockedExtraLegacy = await shouldBlockAdditionalBooking(
      supabase,
      phone,
    );
    const overlapsExistingLegacy = !blockedExtraLegacy &&
      (await newBookingOverlapsExisting(
        supabase,
        phone,
        new Date(appointmentDate),
        totalDuration,
      ));
    if (blockedExtraLegacy || overlapsExistingLegacy) {
      await sendMessage(
        phone,
        blockedExtraLegacy
          ? ADDITIONAL_BOOKING_BLOCK_MESSAGE
          : BOOKING_OVERLAP_MESSAGE,
      );
      return;
    }

    const appt = await insertAppointmentChecked(
      supabase,
      phone,
      {
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? "Cliente WhatsApp",
        client_phone: apptPhone,
        client_document: (clientData as { dni?: string | null })?.dni ?? null,
        service_id: allServices[0].id,
        service_ids: allServices.map((s: AllSvcRow) => s.id),
        employee_id: null,
        date: appointmentDateLima,
        status: "scheduled",
        price: totalPrice.toString(),
        duration: totalDuration,
        source: "whatsapp",
        whatsapp_phone: phone,
        deposit_amount: "0",
        notes: `Cita agendada vía WhatsApp.${
          allServices.length > 1 ? ` (${allServiceNames})` : ""
        }`,
      },
      {
        flow: "sendConfirmedBookingSummary",
        branch: "legacy_cart",
        date: appointmentDateLima,
      },
    );
    if (!appt) return;

    createdAppts.push(appt);
    await supabase.from("appointment_services").insert(
      allServices.map((svc: AllSvcRow) => ({
        appointment_id: appt.id,
        service_id: svc.id,
        employee_id: null,
        price: parseFloat(String(svc.price)).toString(),
        duration: svc.duration ?? 60,
      })),
    );
  }

  // Salvaguarda: nunca confirmar sin fila en appointments
  if (!createdAppts.length) {
    console.error("[WABA] sendConfirmedBookingSummary sin citas creadas");
    await sendMessage(phone, BOOKING_INSERT_FAIL_MESSAGE);
    return;
  }

  await upsertSession(supabase, phone, {
    step: "completed",
    awaiting_screenshot: false,
    cart_service_ids: "[]",
    cart_items: "[]",
    selected_day: null,
    parsed_datetime: null,
  });

  const firstApptId = createdAppts[0]?.id ?? "";
  await notifyAdmins(
    supabase,
    "📅 Nueva cita agendada (WABA)",
    `${clientData?.name ?? "Cliente"} — ${allServiceNames} — ${
      formatSessionDatetimeIso(appointmentDate)
    }`,
    { screen: "Agenda", appointmentId: firstApptId, phone },
  );

  const dateStr = formatSessionDatetimeIso(appointmentDate);
  const inHours = isBusinessHours();
  const consideraciones = getConsideracionesPreviasWhatsApp(categoryIds);
  const consideracionesBlock = consideraciones ? `\n\n${consideraciones}` : "";

  await sendMessage(
    phone,
    inHours
      ? `✅ *¡Tu cita está confirmada!* 💜\n\n` +
        `📋 *Resumen:*\n` +
        `${servicesLine}\n` +
        `📅 Fecha: ${dateStr}\n` +
        `💰 Total: S/ ${formatSoles(totalPrice)}\n\n` +
        `Nuestro equipo te atenderá con gusto. El pago se realiza el día de tu cita.\n\n` +
        `¡Te esperamos! 🌸${consideracionesBlock}`
      : `✅ *¡Tu cita está anotada!* 💜\n\n` +
        `📋 *Resumen:*\n` +
        `${servicesLine}\n` +
        `📅 Fecha: ${dateStr}\n` +
        `💰 Total: S/ ${formatSoles(totalPrice)}\n\n` +
        `En cuanto abramos te confirmamos. El pago se realiza el día de tu cita. ¡Gracias! 🌸${consideracionesBlock}`,
  );

  // Dato adicional: nombre + DNI/CE si faltan en BD (no bloquea la cita)
  await askClientIdentityIfNeeded(supabase, phone);
}

/**
 * Envía el resumen de la reserva con total, fecha y monto del depósito.
 * Actualiza la sesión a step awaiting_payment_screenshot.
 * @param opts.advanceRate — 0.2 (domingo) o 0.5 (feriado especial); default 0.2
 * @param opts.fixedAmount — S/ fijo (historial nuevas/no-show); gana sobre advanceRate
 */
export async function sendPaymentSummary(
  supabase: SupabaseClient,
  phone: string,
  session: Record<string, unknown> & { cartItems?: CartItem[] },
  opts?: {
    advanceRate?: number;
    fixedAmount?: number;
    /** Evita un 2º loadWabaConfig si el caller ya lo cargó. */
    wabaConfig?: WabaConfigMap;
  },
) {
  const cartItems = session.cartItems ?? [];
  const useCartItems = cartItems.length > 0 &&
    cartItems.some((i) => i.price > 0);

  let totalPrice: number;
  let servicesLine: string;

  if (useCartItems) {
    const lines: {
      name: string;
      quantity: number;
      unitPrice: number;
      duration?: number;
    }[] = [];
    for (const it of cartItems) {
      if (it.item_type === "service") {
        const { data: svc } = await supabase
          .from("services")
          .select("name, duration")
          .eq("id", it.item_id)
          .maybeSingle();
        lines.push({
          name: (svc as { name: string })?.name ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
          duration: (svc as { duration?: number })?.duration ?? 60,
        });
      } else {
        const { data: pack } = await supabase
          .from("packs")
          .select("title, short_name")
          .eq("id", it.item_id)
          .maybeSingle();
        const name =
          (pack as { short_name?: string; title: string })?.short_name ||
          (pack as { title?: string })?.title ||
          it.item_id;
        lines.push({
          name: name as string,
          quantity: it.quantity,
          unitPrice: it.price,
        });
      }
    }
    totalPrice = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    servicesLine = lines.length > 1
      ? lines
        .map(
          (l) =>
            `🌸 ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.name} — S/ ${
              formatSoles(l.quantity * l.unitPrice)
            }`,
        )
        .join("\n")
      : `💅 ${
        lines.map((
          l,
        ) => (l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name)).join(
          " + ",
        )
      }`;
  } else {
    const cartIds = JSON.parse(
      (session.cart_service_ids as string) ?? "[]",
    ) as string[];
    if (!cartIds.length) return;
    const { data: svcs } = await supabase
      .from("services")
      .select("id, name, price")
      .in("id", [...new Set(cartIds)]);
    type SvcRow = { id: string; name: string; price: string | number };
    const services: SvcRow[] = orderedServicesFromIds(cartIds, svcs ?? []);
    totalPrice = services.reduce(
      (sum: number, s: SvcRow) => sum + parseFloat(String(s.price)),
      0,
    );
    servicesLine = services.length > 1
      ? services
        .map(
          (s: SvcRow) =>
            `🌸 ${s.name} — S/ ${formatSoles(parseFloat(String(s.price)))}`,
        )
        .join("\n")
      : `💅 Servicio: ${services.map((s: SvcRow) => s.name).join(" + ")}`;
  }

  const dateStr = session.parsed_datetime
    ? formatSessionDatetimeIso(session.parsed_datetime as string)
    : "fecha acordada";

  const useFixed = typeof opts?.fixedAmount === "number" &&
    Number.isFinite(opts.fixedAmount) &&
    opts.fixedAmount > 0;

  if (useFixed) {
    // Paso 1/2: resumen + datos en el mismo mensaje — el cierre "Responde
    // para indicarte cómo confirmarlo" era relleno vago: cualquier respuesta
    // (salvo ubicación/horario/FAQ/cancelar) igual terminaba en pedir estos
    // mismos datos (`sendFixedDepositDatosStep`), así que se fusiona aquí y
    // se salta directo a `AWAITING_DEPOSIT_BOLETA` (Cielo …625683, 13-sep-2026).
    const config = opts?.wabaConfig ?? (await loadWabaConfig(supabase));
    const fixedAmount = fixedDepositAmountFromConfig(config);
    const monto = capFixedDepositToTotal(fixedAmount, totalPrice);
    const { datos } = buildFixedDepositBubblesFromConfig(config, monto, {
      fullPayment: isFullPrepayDeposit(fixedAmount, monto, totalPrice),
    });
    await sendMessage(
      phone,
      `📋 *Resumen de tu cita:*\n\n` +
        `${servicesLine}\n` +
        `📅 Fecha: ${dateStr}\n` +
        `💰 Total: S/ ${formatSoles(totalPrice)}\n\n` +
        datos,
    );
    await upsertSession(supabase, phone, {
      step: AWAITING_DEPOSIT_BOLETA,
      awaiting_screenshot: false,
      deposit_mode: "fixed",
    });
    return;
  }

  const advanceRate = opts?.advanceRate ?? 0.2;
  const pct = formatAdvancePercent(advanceRate);
  const deposit = Math.ceil(totalPrice * advanceRate);

  const advanceNote = advanceRate >= 0.5
    ? `\n📅 *Feriado — previa cita:* sin el adelanto del ${pct}% no podemos reservar el turno. ` +
      `Tras validar tu pago te confirmamos aquí. Dudas urgentes: 📱 *${YAPE_PLIN_NUMBER}*.\n`
    : `\n📅 *Domingo — cita previa:* sin el adelanto del ${pct}% no podemos reservar el turno. ` +
      `Tras validar tu pago te confirmamos aquí. Dudas urgentes: 📱 *${YAPE_PLIN_NUMBER}*.\n`;

  await sendMessage(
    phone,
    `📋 *Resumen de tu reserva:*\n\n` +
      `${servicesLine}\n` +
      `📅 Fecha: ${dateStr}\n` +
      `💰 Total: S/ ${formatSoles(totalPrice)}\n\n` +
      advanceNote +
      `Para confirmar tu cita, realiza un adelanto del *${pct} (S/ ${
        formatSoles(deposit)
      })* vía:\n\n` +
      `${getMediosDePago()}\n\n` +
      `Luego envíame:\n` +
      `• Foto del voucher o captura de pantalla del comprobante\n` +
      `• Nombre completo\n` +
      `• Número de DNI o CE\n` +
      `• Teléfono\n\n` +
      `_El saldo restante (S/ ${
        formatSoles(totalPrice - deposit)
      }) se paga el día de tu cita._\n\n` +
      `_Si te equivocaste o quieres cambiar algo, escribe_ *Cancelar* _para volver a empezar._`,
  );

  await upsertSession(supabase, phone, {
    step: "awaiting_payment_screenshot",
    awaiting_screenshot: true,
    deposit_mode: "rate",
  });
}

/**
 * Recalcula el precio de cada ítem del carrito contra el día ISO real de la
 * cita elegida (no el día en que se escribió el mensaje) y persiste el
 * carrito corregido antes de mostrar el resumen/pago. Avisa a la clienta si
 * algún precio cambió (ej. promo "Lunes a Miércoles" cotizada para un
 * viernes — caso Brescia Macutela, 13-ago-2026).
 */
async function recomputeAndPersistCartPricesForDate(
  supabase: SupabaseClient,
  phone: string,
  chosenDate: Date,
): Promise<void> {
  const session = await getSession(supabase, phone);
  const cartItems = session?.cartItems ?? [];
  if (!cartItems.length) return;

  const catalog = await loadCatalog(supabase);
  const isoWeekday = limaIsoWeekday(chosenDate);
  const { items, adjustments } = recomputeCartItemsForWeekday(
    catalog,
    cartItems,
    isoWeekday,
  );
  if (!adjustments.length) return;

  await upsertSession(supabase, phone, {
    cart_items: JSON.stringify(items),
  });

  const lines = adjustments
    .map(
      (a) =>
        `• ${a.name}: S/ ${formatSoles(a.before)} → S/ ${formatSoles(a.after)}`,
    )
    .join("\n");
  await sendMessage(
    phone,
    `Una precisión sobre tu cita 💜 el descuento que viste tiene días específicos de vigencia, así que ajustamos el precio para la fecha que elegiste:\n\n${lines}`,
  );
}

/**
 * Tras elegir fecha/hora: sin completed en historial → abono fijo S/25;
 * domingo / feriado 50% → %; L–S con completed → confirma directo.
 */
export async function finalizeBookingAfterDatetimeSelection(
  supabase: SupabaseClient,
  phone: string,
  chosenDate: Date,
  dateKey: string,
): Promise<void> {
  await upsertSession(supabase, phone, {
    parsed_datetime: chosenDate.toISOString(),
    employee_assignments: JSON.stringify({}),
    reschedule_appointment_id: null,
  });
  const { holdDuoPackForCompanionName } = await import("./party-booking.ts");
  if (await holdDuoPackForCompanionName(supabase, phone, chosenDate)) return;
  await recomputeAndPersistCartPricesForDate(supabase, phone, chosenDate);
  const sessionNow = await getSession(supabase, phone);

  // Historial gana sobre fecha (domingo/feriado): siempre S/25 fijo
  if (await clientRequiresFixedDeposit(supabase, phone)) {
    const wabaConfig = await loadWabaConfig(supabase);
    const fixedAmount = fixedDepositAmountFromConfig(wabaConfig);
    await sendPaymentSummary(supabase, phone, sessionNow ?? {}, {
      fixedAmount,
      wabaConfig,
    });
    return;
  }

  const advanceRate = getAdvancePaymentRate(dateKey);
  if (advanceRate != null) {
    await sendPaymentSummary(supabase, phone, sessionNow ?? {}, {
      advanceRate,
    });
    return;
  }
  await upsertSession(supabase, phone, {
    step: "awaiting_payment_info",
    deposit_mode: null,
  });
  const sessionConfirmed = await getSession(supabase, phone);
  await sendConfirmedBookingSummary(supabase, phone, sessionConfirmed ?? {});
}

/**
 * Procesa la captura de pago: crea citas y verificación, notifica a admins y
 * envía confirmación. El pago se registra al aprobar la verificación.
 */
export async function processPaymentScreenshot(
  supabase: SupabaseClient,
  phoneNumber: string,
  screenshotUrl: string | null,
  session: Awaited<ReturnType<typeof getSession>>,
): Promise<void> {
  if (!session) return;

  // Multi-cita / party listo → 1–2 appointments + verificaciones (no 1 cita del carrito sumado)
  {
    const partyEarly = parsePartyBooking(
      (session as { party_booking?: string | null }).party_booking,
    );
    if (partyEarly?.collecting === "ready") {
      const cartItemsEarly =
        (session as { cartItems?: CartItem[] }).cartItems ?? [];
      let totalForDeposit = 0;
      if (
        cartItemsEarly.length > 0 && cartItemsEarly.some((i) => i.price > 0)
      ) {
        const lines = await expandCartItemsToLines(supabase, cartItemsEarly);
        totalForDeposit = lines.reduce((s, l) => s + l.price, 0);
      } else {
        for (const m of partyEarly.members) {
          if (!m.service_ids.length) continue;
          const { data: svcs } = await supabase
            .from("services")
            .select("price")
            .in("id", m.service_ids);
          for (const s of svcs ?? []) {
            totalForDeposit += parseFloat(
              String((s as { price: string }).price),
            );
          }
        }
      }
      const dateKeyEarly = toLimaLocalTimestamp(
        new Date(
          (session.parsed_datetime as string) ?? new Date().toISOString(),
        ),
      ).slice(0, 10);
      const depositModeEarly =
        (session as { deposit_mode?: string | null }).deposit_mode ?? null;
      const isFixedEarly = depositModeEarly === "fixed";
      const advanceRateEarly = isFixedEarly
        ? null
        : (getAdvancePaymentRate(dateKeyEarly) ?? 0.2);
      const depositAmountEarly = isFixedEarly
        ? capFixedDepositToTotal(
          await resolveFixedDepositAmount(supabase),
          totalForDeposit,
        )
        : Math.ceil(totalForDeposit * (advanceRateEarly ?? 0.2));
      if (
        await tryFinalizePartyAppointments(supabase, phoneNumber, session, {
          kind: "deposit",
          screenshotUrl,
          depositAmount: depositAmountEarly,
        })
      ) {
        return;
      }
    }
  }

  // Buscar clienta por BSUID o phone_country + phone_normalized
  const clientData = await findClientByWaRecipient(supabase, phoneNumber);
  const apptPhone = appointmentPhoneForRecipient(phoneNumber);

  const appointmentDate = (session.parsed_datetime as string) ??
    new Date().toISOString();
  const appointmentDateLima = toLimaLocalTimestamp(new Date(appointmentDate));
  const dateKey = appointmentDateLima.slice(0, 10);
  const depositMode =
    (session as { deposit_mode?: string | null }).deposit_mode ?? null;
  const isFixedDeposit = depositMode === "fixed";
  const advanceRate = isFixedDeposit
    ? null
    : (getAdvancePaymentRate(dateKey) ?? 0.2);
  const cartItems = (session as { cartItems?: CartItem[] }).cartItems ?? [];
  const useCartItems = cartItems.length > 0 &&
    cartItems.some((i) => i.price > 0);

  let allServiceNames: string;
  let totalPrice: number;
  let categoryIds: string[] = [];
  const createdAppts: { id: string; price: number }[] = [];

  if (useCartItems) {
    const lines = await expandCartItemsToLines(supabase, cartItems);
    totalPrice = lines.reduce((s, l) => s + l.price, 0);
    const serviceIds = [...new Set(lines.map((l) => l.service_id))];
    const { data: svcsForNames } = await supabase
      .from("services")
      .select("id, name, category_id")
      .in("id", serviceIds);
    const catIds = new Set<string>();
    for (const line of lines) {
      const svc = (svcsForNames ?? []).find(
        (s: { id: string }) => s.id === line.service_id,
      );
      if ((svc as { category_id?: string })?.category_id) {
        catIds.add((svc as { category_id: string }).category_id);
      }
    }
    categoryIds = [...catIds];
    allServiceNames = await cartItemsToDisplayLabel(supabase, cartItems);
    const totalDuration = lines.reduce((s, l) => s + (l.duration ?? 60), 0);
    const catalogForCap = await loadCatalog(supabase);
    const cap = overlapCapForCart(serviceIds, catalogForCap);

    // Capacidad del salón: el horario pudo ocuparse mientras la clienta pagaba.
    if (
      !(await hasSlotCapacityForServices(
        supabase,
        catalogForCap,
        new Date(appointmentDate),
        totalDuration,
        serviceIds,
        cap,
      ))
    ) {
      await notifyHeldSlotLost(supabase, {
        phone: phoneNumber,
        heldAt: new Date(appointmentDate),
        serviceIds: serviceIds,
        durationMinutes: totalDuration,
        catalog: catalogForCap,
        cap,
        clientName: clientData?.name ?? null,
        alreadyPaid: true,
        screenshotUrl,
      });
      return;
    }

    // Una sola cita con employee_id null (Vanessa asigna desde AsignarChicas)
    const appt = await insertAppointmentChecked(
      supabase,
      phoneNumber,
      {
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? "Cliente WhatsApp",
        client_phone: apptPhone,
        client_document: (clientData as { dni?: string | null })?.dni ?? null,
        service_id: lines[0].service_id,
        service_ids: lines.map((l) => l.service_id),
        employee_id: null,
        date: appointmentDateLima,
        status: "scheduled",
        price: totalPrice.toString(),
        duration: totalDuration,
        source: "whatsapp",
        whatsapp_phone: phoneNumber,
        deposit_amount: "0",
        notes: `Reserva vía WhatsApp. Pago pendiente de validación.${
          lines.length > 1 ? ` (${allServiceNames})` : ""
        }`,
      },
      {
        flow: "processPaymentScreenshot",
        branch: "cart_items",
        date: appointmentDateLima,
      },
    );
    if (!appt) return;

    createdAppts.push({ id: appt.id, price: totalPrice });
    // Insertar líneas en appointment_services
    await supabase.from("appointment_services").insert(
      lines.map((l) => ({
        appointment_id: appt.id,
        service_id: l.service_id,
        pack_id: l.pack_id ?? null,
        employee_id: null,
        price: l.price.toString(),
        duration: l.duration ?? 60,
      })),
    );
  } else {
    const cartIds = JSON.parse(
      (session.cart_service_ids as string) ?? "[]",
    ) as string[];
    const { data: svcsData } = await supabase
      .from("services")
      .select("id, name, price, duration, category_id")
      .in("id", [...new Set(cartIds)]);
    type AllSvcRow = {
      id: string;
      name: string;
      price: string | number;
      duration: number | null;
      category_id: string | null;
    };
    const allServices: AllSvcRow[] = orderedServicesFromIds(
      cartIds,
      svcsData ?? [],
    );
    totalPrice = allServices.reduce(
      (s, svc) => s + parseFloat(String(svc.price)),
      0,
    );
    allServiceNames = allServices.map((s: AllSvcRow) => s.name).join(" + ");
    categoryIds = [
      ...new Set(
        allServices.map((s: AllSvcRow) => s.category_id).filter(Boolean),
      ),
    ] as string[];
    const totalDuration = allServices.reduce(
      (s, svc) => s + (svc.duration ?? 60),
      0,
    );
    const catalogForCap = await loadCatalog(supabase);
    const cap = overlapCapForCart(
      allServices.map((s: AllSvcRow) => s.id),
      catalogForCap,
    );

    // Capacidad del salón: el horario pudo ocuparse mientras la clienta pagaba.
    if (
      !(await hasSlotCapacityForServices(
        supabase,
        catalogForCap,
        new Date(appointmentDate),
        totalDuration,
        allServices.map((s: AllSvcRow) => s.id),
        cap,
      ))
    ) {
      await notifyHeldSlotLost(supabase, {
        phone: phoneNumber,
        heldAt: new Date(appointmentDate),
        serviceIds: allServices.map((s: AllSvcRow) => s.id),
        durationMinutes: totalDuration,
        catalog: catalogForCap,
        cap,
        clientName: clientData?.name ?? null,
        alreadyPaid: true,
        screenshotUrl,
      });
      return;
    }

    // Una sola cita con employee_id null (Vanessa asigna desde AsignarChicas)
    const appt = await insertAppointmentChecked(
      supabase,
      phoneNumber,
      {
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? "Cliente WhatsApp",
        client_phone: apptPhone,
        client_document: (clientData as { dni?: string | null })?.dni ?? null,
        service_id: allServices[0].id,
        service_ids: allServices.map((s: AllSvcRow) => s.id),
        employee_id: null,
        date: appointmentDateLima,
        status: "scheduled",
        price: totalPrice.toString(),
        duration: totalDuration,
        source: "whatsapp",
        whatsapp_phone: phoneNumber,
        deposit_amount: "0",
        notes: `Reserva vía WhatsApp. Pago pendiente de validación.${
          allServices.length > 1 ? ` (${allServiceNames})` : ""
        }`,
      },
      {
        flow: "processPaymentScreenshot",
        branch: "legacy_cart",
        date: appointmentDateLima,
      },
    );
    if (!appt) return;

    createdAppts.push({ id: appt.id, price: totalPrice });
    // Insertar líneas en appointment_services
    await supabase.from("appointment_services").insert(
      allServices.map((svc: AllSvcRow) => ({
        appointment_id: appt.id,
        service_id: svc.id,
        employee_id: null,
        price: parseFloat(String(svc.price)).toString(),
        duration: svc.duration ?? 60,
      })),
    );
  }

  const depositAmount = isFixedDeposit
    ? capFixedDepositToTotal(
      await resolveFixedDepositAmount(supabase),
      totalPrice,
    )
    : Math.ceil(totalPrice * (advanceRate ?? 0.2));
  if (!createdAppts.length) {
    console.error("[WABA] processPaymentScreenshot sin citas creadas");
    return;
  }
  const firstApptId = createdAppts[0]?.id ?? null;

  const { data: verification, error: verificationErr } = await supabase
    .from("appointment_verifications")
    .insert({
      appointment_id: firstApptId,
      client_phone: apptPhone ?? phoneNumber,
      client_name: clientData?.name ?? "Cliente WhatsApp",
      service_name: allServiceNames,
      // appointment_date es timestamp WITHOUT time zone (hora Lima literal, igual que appointments.date) —
      // usar appointmentDateLima, no el crudo appointmentDate (evita filas guardadas en UTC real).
      appointment_date: appointmentDateLima,
      amount_deposit: depositAmount,
      amount_total: totalPrice,
      payment_screenshot_url: screenshotUrl,
      pre_service_photo_url: (session.pre_service_photo_url as string) ?? null,
      pre_service_photo_url_2: (session.pre_service_photo_url_2 as string) ??
        null,
      status: "payment_submitted",
      kind: "deposit",
    })
    .select()
    .single();

  // Sin fila de verificación Vanessa no ve el pago en /ValidacionPagos ni recibe la
  // plantilla: dejar rastro en wa_error_log y avisar al equipo (la cita ya existe y la
  // clienta ya pagó, así que el ack a la clienta sigue; la validación queda manual).
  if (verificationErr || !verification?.id) {
    console.error(
      "[WABA] INSERT appointment_verifications falló:",
      verificationErr?.message ?? "sin id",
    );
    await logWaError(supabase, {
      phone: phoneNumber,
      step: "payment_verification_insert",
      msgType: "image",
      error: verificationErr ?? new Error("verification insert sin id"),
      context: {
        appointmentId: firstApptId,
        depositAmount,
        totalPrice,
        appointmentDateLima,
      },
      fallbackSent: false,
    });
    await notifyAdmins(
      supabase,
      "⚠️ Pago sin registro de validación",
      `${
        clientData?.name ?? "Cliente"
      } (${phoneNumber}) envió comprobante pero no se pudo registrar. Revisar en el chat WA y validar a mano.`,
      {
        screen: "Agenda",
        appointmentId: firstApptId ?? "",
        phone: phoneNumber,
      },
    );
  }

  await upsertSession(supabase, phoneNumber, {
    awaiting_screenshot: false,
    verification_id: verification?.id ?? null,
    step: "completed",
    cart_service_ids: "[]",
    cart_items: "[]",
    selected_day: null,
    parsed_datetime: null,
    deposit_mode: null,
  });

  const inHours = isBusinessHours();
  const servicesLine = createdAppts.length > 1
    ? allServiceNames
      .split(" + ")
      .map((n) => `🌸 ${n}`)
      .join("\n")
    : `🌸 Servicio: ${allServiceNames}`;
  const consideraciones = getConsideracionesPreviasWhatsApp(categoryIds);
  const consideracionesBlock = consideraciones ? `\n\n${consideraciones}` : "";
  await sendMessage(
    phoneNumber,
    (inHours
      ? `✅ ¡Recibido! Tu comprobante está siendo revisado.\n\n` +
        `📋 *Resumen de tu cita:*\n` +
        `${servicesLine}\n` +
        `• Fecha: ${formatSessionDatetimeIso(appointmentDate)}\n` +
        `• Adelanto: S/ ${depositAmount}\n\n` +
        `Validaremos tu pago en breve y recibirás confirmación aquí. ¡Gracias por tu confianza! 💜`
      : `✅ ¡Gracias! Tu cita está reservada provisionalmente.\n\n` +
        `📋 *Resumen de tu cita:*\n` +
        `${servicesLine}\n` +
        `• Fecha: ${formatSessionDatetimeIso(appointmentDate)}\n` +
        `• Adelanto: S/ ${depositAmount}\n\n` +
        `Estamos fuera de horario, pero nuestro equipo validará tu pago a primera hora del próximo día hábil. ¡Te esperamos! 💜`) +
      consideracionesBlock,
  );

  await notifyAdmins(
    supabase,
    "💳 Nuevo pago por validar",
    `${clientData?.name ?? "Cliente"} reservó ${allServiceNames} para ${
      formatSessionDatetimeIso(appointmentDate)
    }`,
    {
      screen: "ValidacionPagos",
      verificationId: verification?.id ?? "",
      appointmentId: firstApptId ?? "",
      phone: phoneNumber,
    },
  );
  await notifyAdmins(
    supabase,
    "Nueva cita agendada",
    `${clientData?.name ?? "Cliente"} — ${allServiceNames} · ${
      formatSessionDatetimeIso(appointmentDate)
    }`,
    { screen: "Agenda", appointmentId: firstApptId ?? "", phone: phoneNumber },
  );

  // Dato adicional tras crear cita domingo (no bloquea)
  await askClientIdentityIfNeeded(supabase, phoneNumber);

  // Plantilla a Vanessa (fuera de ventana 24h) + OCR Haiku Vision si hay imagen
  if (verification?.id && screenshotUrl) {
    const {
      classifyInboundImage,
      paymentMethodFromExtraction,
      EMPTY_PAYMENT_EXTRACTION,
    } = await import("../lib/image-classify.ts");
    const { sendPaymentVerificationTemplate } = await import(
      "../lib/payment-template.ts"
    );
    const classified = await classifyInboundImage(screenshotUrl, {
      supabase,
      phoneNumber,
    });
    const extraction =
      classified.kind === "comprobante_pago" && classified.extraction
        ? classified.extraction
        : EMPTY_PAYMENT_EXTRACTION;
    await supabase
      .from("appointment_verifications")
      .update({
        payment_method: paymentMethodFromExtraction(extraction.app_origen),
      })
      .eq("id", verification.id);
    void sendPaymentVerificationTemplate({
      verificationId: verification.id,
      imageUrl: screenshotUrl,
      clientName: (clientData?.name ?? phoneNumber).slice(0, 60),
      serviceName: allServiceNames.slice(0, 60),
      appointmentDateLabel: formatSessionDatetimeIso(appointmentDate).slice(
        0,
        60,
      ),
      extraction,
    }).catch((err) =>
      console.error("[WABA] sendPaymentVerificationTemplate:", err)
    );
  } else if (verification?.id) {
    console.warn(
      "[WABA] processPaymentScreenshot: sin screenshotUrl — no se envía plantilla",
    );
  }
}
