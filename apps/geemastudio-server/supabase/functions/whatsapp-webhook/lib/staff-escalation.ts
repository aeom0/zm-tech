/**
 * Escalamiento a una persona del equipo cuando la clienta habla de DINERO sobre una
 * reserva ya pagada (devolución / reembolso / cancelar pidiendo el adelanto).
 *
 * Haiku decide el texto (acción `escalate_staff`). Este regex corre antes, en el dispatcher:
 * si coincide, pausa el bot y avisa al staff en ese turno; Haiku igual contesta, y si Haiku
 * falla se manda la política fija. Es idempotente — si el bot ya está pausado no repite el push.
 *
 * Caso Luciana Eléspuru …6431 (4-oct-2026): "quisiera cancelar mi reserva, ¿me podría
 * hacer devolución del dinero?" → el bot (Haiku sin instrucción) respondió "para gestionar
 * la devolución comunícate con el equipo", insinuando un reembolso que la política niega.
 */
import { srtaLabel } from "./client-address.ts";
import type { SupabaseClient } from "./supabase.ts";
import { WABA_PANEL_BASE } from "./panel-url.ts";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

const REFUND_WORDS =
  /\b(devoluci\w*|devuelv\w*|devolv\w*|devuelt\w*|reembols\w*|rembols\w*|reintegr\w*|retorn\w*\s+(?:mi|el)\s+(?:dinero|plata|pago|adelanto))\b/;

const CANCEL_WORDS =
  /\b(cancel\w*|anul\w*|ya\s+no\s+(?:quiero|voy|puedo|podre)|no\s+(?:voy\s+a\s+)?(?:puedo|podre|ire)\s+(?:ir|asistir|venir)|no\s+quiero\s+(?:la|mi|el)\s+(?:cita|reserva|servicio))\b/;

/** Petición en primera persona: "mi dinero", "me devuelvan". El monto S/25 solo no cuenta. */
const PERSONAL_MONEY_ASK =
  /\b(?:mi|mis)\s+(?:dinero|plata|adelanto|pago|abono|yape|plin|deposito)\b|\bme\s+(?:devuelv\w*|devolv\w*|reembols\w*|rembols\w*|reintegr\w*|regres\w*)/;

/**
 * Pedido directo de la plata aunque no diga "mi" ni "cancelar":
 * "quiero la devolución del dinero", "devuélvanme el dinero".
 */
const REFUND_DEMAND =
  /\b(?:quiero|quisiera|necesito|exijo|solicito|pido)\b[\s\S]{0,48}\b(?:devoluci\w*|reembols\w*|reintegr\w*)\b|\b(?:devuelvanme|devuelveme|regresenme|regresame)\b|\bdevoluci\w*\s+del\s+(?:dinero|plata|pago|adelanto|yape|plin)\b/;

/**
 * Pregunta de regla, previa a pagar: "¿se devuelve el adelanto?", "¿el adelanto de S/25 se devuelve?",
 * "si cancelo, ¿se devuelve?". No es un pedido de plata.
 */
const POLICY_QUESTION =
  /\b(?:se\s+(?:puede\s+)?(?:devolver|devuelve)|hay\s+devoluci\w*|el\s+adelanto\s+se\s+devuelve|se\s+puede\s+hacer\s+(?:una\s+)?devoluci\w*)\b/;

/** Pedido en primera persona que sí debe escalar aunque la frase también pregunte la regla. */
const FIRST_PERSON_DEMAND =
  /\b(?:quiero|quisiera|necesito|exijo|solicito|pido|devuelvanme|devuelveme|regresenme|regresame)\b|\bme\s+(?:devuelv\w*|devolv\w*|reembols\w*|reintegr\w*|regres\w*|podria\s+hacer|puedes\s+hacer|pueden\s+hacer)\b/;

/**
 * La clienta pide plata de vuelta por una reserva ya pagada. La pregunta informativa
 * previa a pagar ("¿se devuelve el adelanto?", aunque cite S/25) no escala.
 */
export function matchesRefundIntent(text: string): boolean {
  const t = normalize(text);
  if (!t.trim() || !REFUND_WORDS.test(t)) return false;
  if (POLICY_QUESTION.test(t) && !FIRST_PERSON_DEMAND.test(t)) return false;
  return (
    CANCEL_WORDS.test(t) ||
    PERSONAL_MONEY_ASK.test(t) ||
    REFUND_DEMAND.test(t)
  );
}

export type EscalationReason = "refund" | "cancel_refund" | "money" | string;

/**
 * Pausa el bot y avisa al staff. Devuelve `true` si escaló ahora, `false` si el bot ya
 * estaba pausado (no repite push) o falló el update.
 */
export async function escalateToStaff(
  supabase: SupabaseClient,
  opts: {
    phone: string;
    clientName?: string | null;
    reason: EscalationReason;
    preview?: string;
  },
): Promise<boolean> {
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("bot_paused_at")
    .eq("phone", opts.phone)
    .maybeSingle();
  if (sess?.bot_paused_at) return false;

  // Imports perezosos: mantiene los matchers puros (sin env de Supabase al cargar).
  const { upsertSession } = await import("./supabase.ts");
  const { notifyAdmins } = await import("./notify.ts");
  await upsertSession(supabase, opts.phone, {
    bot_paused_at: new Date().toISOString(),
  });

  const who = (opts.clientName || "Clienta").trim().split(/\s+/)[0];
  const quote = opts.preview ? ` — "${opts.preview.slice(0, 100)}"` : "";
  try {
    const salonFault = opts.reason === "salon_fault";
    await notifyAdmins(
      supabase,
      salonFault
        ? "⚠️⏸️ Falla del salón con adelanto · Revisar YA"
        : "💸⏸️ Cancelación con adelanto · Revisar YA",
      salonFault
        ? `${who} reporta que el salón canceló o no pudo atenderla${quote}. Corresponde reprogramar sin costo o reembolsar el adelanto. Bot en pausa, toma el chat.`
        : `${who} pide cancelar o recuperar su adelanto${quote}. Bot en pausa, toma el chat.`,
      {
        type: "waba_chat",
        reason: String(opts.reason),
        phone: opts.phone,
        client_name: who.slice(0, 80),
        url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(opts.phone)}`,
      },
    );
  } catch (err) {
    console.error("[staff-escalation] push:", err);
  }
  return true;
}

/**
 * Lenguaje que insinúa que el adelanto se puede recuperar. Haiku NUNCA debe emitirlo
 * (Luciana …6431: "para gestionar la devolución…"). "reembolsable" (política) sí se permite.
 */
const REFUND_PROMISE_OUT =
  /\b(devoluci\w*|devolver\w*|devolveremos|devuelv\w*|reembolso\w*|reintegr\w*|reembolsar\w*)\b/i;

export function containsRefundPromise(text: string): boolean {
  return REFUND_PROMISE_OUT.test(text.normalize("NFC"));
}

/** Falla del salón: sin política ni promesas; una persona resuelve. */
export function buildSalonFaultMessage(
  contactName: string | null | undefined,
): string {
  const srta = srtaLabel(contactName);
  const hello = srta ? `${srta}, sentimos` : "Sentimos";
  return (
    `${hello} mucho el inconveniente 💜 Ya avisamos a nuestro equipo para que una persona te escriba por este chat y lo resuelva contigo.`
  );
}

/** Política sin derivar al equipo (para consultas informativas previas al pago). */
export function buildRefundPolicyOnlyMessage(
  contactName: string | null | undefined,
): string {
  const srta = srtaLabel(contactName);
  const hello = srta ? `${srta}, te` : "Te";
  return (
    `${hello} cuento cómo funciona 💜 El adelanto asegura tu cupo y no es reembolsable cuando la cancelación es de la clienta. ` +
    `Lo que podemos ofrecerte es re-programar tu cita una sola vez, con aviso de mínimo 24 horas de anticipación y sujeto a disponibilidad, manteniendo tu adelanto.`
  );
}

/** Respaldo cuando Haiku no pudo responder: política fija, sin prometer reembolso. */
export function buildRefundFallbackMessage(
  contactName: string | null | undefined,
): string {
  const srta = srtaLabel(contactName);
  const hello = srta ? `${srta}, entendemos` : "Entendemos";
  return (
    `${hello} 💜 Te cuento cómo funciona: el adelanto asegura tu cupo y no es reembolsable cuando la cancelación es de la clienta; ` +
    `lo que podemos ofrecerte es re-programar tu cita una sola vez, con aviso de mínimo 24 horas de anticipación y sujeto a disponibilidad, manteniendo tu adelanto.\n\n` +
    `Ya avisamos a nuestro equipo para que una persona te escriba por este chat y revise tu caso contigo.`
  );
}
