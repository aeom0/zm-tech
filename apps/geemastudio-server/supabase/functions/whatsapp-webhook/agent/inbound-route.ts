// inbound-route.ts — Decisiones puras de qué inbound atiende el agente.
// El dinero (comprobante, aprobar/rechazar pago) no pasa por el modelo.

import { detectRetouchTemplateButton } from "../handlers/retouch-reengage.ts";

/**
 * Espera base de agrupación cuando el turno lo va a llevar el agente.
 * El bot viejo usa 4.5 s para no contestar un fragmento con un menú
 * (CTWA + precio ~5 s). El agente serializa turnos, así que un seguimiento
 * suelto es el turno siguiente y no un menú duplicado.
 * La quietud de 1.5 s del trailing-edge se mantiene.
 */
export const AGENT_COALESCE_WINDOW_MS = 1500;

/** Pasos que siguen en el dispatcher: máquinas de estado, no charla. */
export const CLASSIC_ONLY_STEPS = new Set([
  "awaiting_curso_lead",
  "awaiting_no_show_reason",
]);

/**
 * Fotos previas al servicio: el dispatcher ya las apagó (vuelve a browsing).
 * El agente hace lo mismo y trata la imagen como cualquier otra foto.
 */
export const RETIRED_PRE_SERVICE_STEPS = new Set([
  "awaiting_pre_service_photo",
  "awaiting_pre_service_photo_2",
]);

export function isPaymentVerifyPayload(payload: string): boolean {
  const p = payload.trim();
  return p.startsWith("pay_verify_approve:") ||
    p.startsWith("pay_verify_reject:");
}

/** Acompañante (party) o un paso que el agente no absorbe. */
export function sessionDefersToClassic(
  session: {
    step?: string | null;
    party_booking?: string | null;
  } | null,
): boolean {
  if (!session) return false;
  if (session.step && CLASSIC_ONLY_STEPS.has(session.step)) return true;
  const party = session.party_booking;
  return typeof party === "string" && party.trim().length > 0 &&
    party.trim() !== "null";
}

/**
 * Botones de plantilla (recordatorio, retoque, tardanza). Siguen en el
 * dispatcher: confirman cita, no-show o política, no son charla.
 */
export function isClassicTemplateButton(title: string): boolean {
  const raw = title.trim();
  if (!raw) return false;
  if (detectRetouchTemplateButton(raw)) return true;
  const t = raw.toLowerCase();
  if (t.includes("confirmo") || t === "confirmar") return true;
  if (t.includes("no podré asistir") || t.includes("no podre asistir")) {
    return true;
  }
  if (t.includes("reprogramar")) return true;
  if (
    t.includes("llegar tarde") || t.includes("llegaré tarde") ||
    t.includes("llegare tarde")
  ) return true;
  if (t.includes("voy tarde") && !t.includes("no podré")) return true;
  return false;
}

/** Tap de lista que el agente puede resolver con herramientas. null = dispatcher. */
export function tapToAgentUtterance(id: string): string | null {
  if (id === "mi_cita") {
    return "La clienta quiere ver su cita. Usa consultar_mi_cita y responde con lo que devuelva.";
  }
  return null;
}

export function imageTurnForAgent(caption: string, fromAd: boolean): string {
  const cap = caption.trim();
  const ad = fromAd ? " Llegó desde un anuncio." : "";
  if (cap) {
    return `La clienta envió una foto con este texto: ${cap}.${ad} Responde a eso. No afirmes detalles del diseño que no estén escritos.`;
  }
  return `La clienta envió una foto sin texto.${ad} Pregunta con calidez qué quiere mostrar y no inventes lo que se ve.`;
}

export const AGENT_AUDIO_TURN =
  "La clienta envió una nota de voz. No puedes oírla. Pídele, con calidez y en una frase, que lo escriba en texto. No escales solo por el audio.";
