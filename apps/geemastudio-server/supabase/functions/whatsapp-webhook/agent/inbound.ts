// inbound.ts — Entrada no textual del agente.
// El comprobante llama a processPaymentScreenshot (montos del sistema).
// El modelo no ve la imagen ni decide el monto.

import { agentOwnsStep, isAgentEnabledFor } from "./agent.ts";
import {
  AGENT_AUDIO_TURN,
  imageTurnForAgent,
  isClassicTemplateButton,
  isPaymentVerifyPayload,
  RETIRED_PRE_SERVICE_STEPS,
  sessionDefersToClassic,
  tapToAgentUtterance,
} from "./inbound-route.ts";
import { handleAwaitingPaymentScreenshot } from "../handlers/steps.ts";
import {
  handlePaymentVerificationButtonTap,
  isAuthorizedPaymentVerifyTap,
} from "../handlers/payment-verification-button.ts";
import { persistInboundWaAudio } from "../lib/inbound-audio.ts";
import {
  getSession,
  markSessionFromAd,
  type SupabaseClient,
  upsertSession,
} from "../lib/supabase.ts";
import { inboundSilenceReason } from "../handlers/dispatch/anti-spam.ts";
import { isSessionStale } from "../handlers/booking-flow.ts";
import { matchesReclamacionesIntent } from "../lib/reclamaciones-handoff.ts";
import { isKnownCtwaCampaignCopy } from "../lib/meta-ads-cta.ts";
import { notifyAdminsClientChat } from "../lib/notify.ts";
import {
  getConfigBoolean,
  getConfigText,
  type WabaConfigMap,
} from "../lib/waba-config.ts";
import { DEFAULT_UBICACION_TEXT } from "../lib/salon-location.ts";
import { getButtonReplyText } from "../lib/parse-message.ts";

export type AgentInboundRoute =
  | { kind: "classic" }
  | { kind: "handled" }
  | { kind: "agent"; text: string };

function buttonPayload(message: Record<string, unknown>): string {
  const button = message.button;
  if (!button || typeof button !== "object") return "";
  const payload = (button as Record<string, unknown>).payload;
  return typeof payload === "string" ? payload.trim() : "";
}

function imageCaption(message: Record<string, unknown>): string {
  const image = message.image;
  if (!image || typeof image !== "object") return "";
  const caption = (image as Record<string, unknown>).caption;
  return typeof caption === "string" ? caption : "";
}

/**
 * Lo que `dispatch()` hacía antes de contestar y el agente se saltaba:
 * marca la atribución CTWA (`from_ad_at`, que alimenta ads-bounce y la venta
 * emocional) y avisa al staff del chat (push "Meta Ads · chat WA" / nueva clienta).
 * Nunca frena el turno.
 */
export async function announceAgentInbound(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  messageText: string;
  messagePreview: string;
  interactiveId?: string;
  isNew: boolean;
  fromAd: boolean;
  referralHeadline?: string | null;
}): Promise<void> {
  try {
    const session = await getSession(opts.supabase, opts.phoneNumber);
    // Mismas condiciones que el dispatcher: anuncio en clienta nueva o sesión
    // inactiva (no re-atribuir mid-flujo), o copy CTWA cuando Meta omite referral.
    const ctwaByCopy = !opts.fromAd && !opts.interactiveId &&
      !session?.from_ad_at && opts.messageText.trim() !== "" &&
      isKnownCtwaCampaignCopy(opts.messageText);
    if (
      ctwaByCopy ||
      (opts.fromAd && !opts.interactiveId &&
        (opts.isNew || isSessionStale(session)))
    ) {
      await markSessionFromAd(opts.supabase, opts.phoneNumber);
    }
    await notifyAdminsClientChat(opts.supabase, {
      phone: opts.phoneNumber,
      clientName: opts.contactName,
      messagePreview: opts.messagePreview,
      isNew: opts.isNew,
      fromAd: opts.fromAd,
      referralHeadline: opts.referralHeadline,
    });
  } catch (err) {
    console.error("[AGENT] announceAgentInbound:", err);
  }
}

/**
 * Decide el turno cuando el flag del agente está prendido.
 * `handled`: ya se respondió (comprobante o tap de verificación).
 * `agent`: hay que llamar a runAgent con `text`.
 * `classic`: sigue el dispatcher (party, curso, no-show, plantillas, menús).
 */
export async function routeAgentInbound(opts: {
  supabase: SupabaseClient;
  wabaConfig: WabaConfigMap;
  phoneNumber: string;
  contactName: string;
  message: Record<string, unknown>;
  messageText: string;
  interactiveId?: string;
  interactiveTitle?: string | null;
  fromAd?: boolean;
}): Promise<AgentInboundRoute> {
  if (!isAgentEnabledFor(opts.wabaConfig, opts.phoneNumber)) {
    return { kind: "classic" };
  }

  const msgType = String(opts.message.type ?? "");
  const payload = buttonPayload(opts.message);
  if (msgType === "button" && isPaymentVerifyPayload(payload)) {
    if (!isAuthorizedPaymentVerifyTap(opts.phoneNumber)) {
      console.warn(
        `[pay-verify] tap ignorado (no admin) …${opts.phoneNumber.slice(-4)}`,
      );
      return { kind: "handled" };
    }
    await handlePaymentVerificationButtonTap(opts.supabase, payload, {
      replyPhone: opts.phoneNumber,
    });
    return { kind: "handled" };
  }

  const buttonTitle = msgType === "button"
    ? (getButtonReplyText(opts.message) ?? "")
    : "";
  if (buttonTitle && isClassicTemplateButton(buttonTitle)) {
    return { kind: "classic" };
  }

  let session = await getSession(opts.supabase, opts.phoneNumber);
  // Pausa del staff, bloqueados/anti-spam y Libro de Reclamaciones viven en el
  // dispatcher (silencio, push "respondió" y pausa + aviso): el agente no los toca.
  if (session?.bot_paused_at) return { kind: "classic" };
  if (
    inboundSilenceReason(opts.phoneNumber, opts.messageText, opts.wabaConfig)
  ) {
    return { kind: "classic" };
  }
  if (
    (msgType === "text" || !msgType) &&
    matchesReclamacionesIntent(opts.messageText)
  ) {
    return { kind: "classic" };
  }
  if (sessionDefersToClassic(session)) return { kind: "classic" };

  if (session?.step && RETIRED_PRE_SERVICE_STEPS.has(session.step)) {
    await upsertSession(opts.supabase, opts.phoneNumber, {
      step: "browsing",
      awaiting_screenshot: false,
    });
    session = await getSession(opts.supabase, opts.phoneNumber);
  }

  const onPaymentStep = session?.step === "awaiting_payment_screenshot" ||
    Boolean(session?.awaiting_screenshot);

  if (msgType === "image" && onPaymentStep) {
    const ubicacionText = getConfigText(
      opts.wabaConfig,
      "ubicacion_text",
      DEFAULT_UBICACION_TEXT,
    );
    const horariosText = getConfigText(opts.wabaConfig, "horarios_text", "");
    const handledPay = await handleAwaitingPaymentScreenshot(
      opts.supabase,
      opts.phoneNumber,
      opts.message,
      opts.messageText,
      session,
      { ubicacionText, horariosText },
    );
    return { kind: handledPay ? "handled" : "classic" };
  }

  if (msgType === "image") {
    if (
      getConfigBoolean(opts.wabaConfig, "image_classification_enabled", true)
    ) {
      const { tryHandlePaymentScreenshotDetected } = await import(
        "../handlers/payment-screenshot-detected.ts"
      );
      const detected = await tryHandlePaymentScreenshotDetected({
        supabase: opts.supabase,
        phoneNumber: opts.phoneNumber,
        contactName: opts.contactName,
        message: opts.message,
        session: session as Record<string, unknown> | null,
      });
      if (detected) return { kind: "handled" };
    }

    const { tryHandleServiceReferenceImage } = await import(
      "../handlers/reference-image.ts"
    );
    const referenced = await tryHandleServiceReferenceImage({
      supabase: opts.supabase,
      phoneNumber: opts.phoneNumber,
      contactName: opts.contactName,
      message: opts.message,
      session: session as Record<string, unknown> | null,
    });
    if (referenced) return { kind: "handled" };

    // Sin cita ni comprobante: foto de diseño → guarda, pausa el bot, push al
    // staff y acuse. El agente no ve la imagen, así que no puede cotizarla.
    // QA genérico no pausa (devuelve false) y sigue al agente.
    const { tryHandleDesignImageTakeover } = await import(
      "../lib/inbound-image.ts"
    );
    const takenOver = await tryHandleDesignImageTakeover({
      supabase: opts.supabase,
      phoneNumber: opts.phoneNumber,
      contactName: opts.contactName,
      message: opts.message,
      session: session as Record<string, unknown> | null,
    });
    if (takenOver) return { kind: "handled" };

    return {
      kind: "agent",
      text: imageTurnForAgent(imageCaption(opts.message), Boolean(opts.fromAd)),
    };
  }

  if (msgType === "audio") {
    const audio = opts.message.audio as Record<string, string> | undefined;
    if (audio?.id) {
      await persistInboundWaAudio(opts.supabase, {
        phone: opts.phoneNumber,
        mediaId: audio.id,
      });
    }
    return { kind: "agent", text: AGENT_AUDIO_TURN };
  }

  if (opts.interactiveId) {
    const utterance = tapToAgentUtterance(opts.interactiveId);
    if (utterance) return { kind: "agent", text: utterance };
    return { kind: "classic" };
  }

  if (
    msgType === "text" && opts.messageText.trim() &&
    agentOwnsStep(session?.step)
  ) {
    return { kind: "agent", text: opts.messageText };
  }

  return { kind: "classic" };
}
