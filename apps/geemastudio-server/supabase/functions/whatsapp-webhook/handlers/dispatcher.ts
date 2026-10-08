// dispatcher.ts — Orquestador WABA (Plan 08 Fase 1)

import { isStalePaymentRestart } from "../lib/stale-payment-session.ts";
import {
  sendImage as _sendImage,
  sendInteractiveList as _sendInteractiveList,
  sendMessage as _sendMessage,
} from "../wa-api.ts";
import {
  DEFAULT_UBICACION_TEXT,
  formatCartSummaryFromLines,
} from "../format.ts";
import {
  DEFAULT_ESTACIONAMIENTO_TEXT,
  matchesParkingOrMovilidadQuestion,
} from "../lib/salon-location.ts";
import { srtaLabel } from "../lib/client-address.ts";
import { getInteractiveId, getInteractiveTitle } from "../lib/parse-message.ts";
import {
  type CartItem,
  clearCart,
  expandCartItemsToServiceIds,
  getSession,
  upsertSession,
} from "../lib/supabase.ts";
import {
  isValidSalonSlot,
  LIMA_UTC_OFFSET_HOURS,
  WA_IDS,
} from "../lib/constants.ts";
import { runIntentShadowLog } from "../lib/intent-shadow.ts";
import { nextHaikuFallbackState } from "../lib/haiku-fallback.ts";
import {
  parseTimePagePayload,
  sendCartOptions,
  sendCategoriesAndPromosListFromCatalog,
  sendCategoriesList,
  sendMenuWithPromos,
} from "./menu.ts";
import { overlapCapForCart } from "../lib/services-catalog.ts";
import { hasSlotCapacityForServices, sendTimeSelector } from "./agenda.ts";
import { finalizeBookingAfterDatetimeSelection } from "./payment.ts";
import { handleAwaitingPaymentScreenshot } from "./steps.ts";
import {
  attachPeMobileToBsuidClient,
  AWAITING_CLIENT_IDENTITY,
  buildIdentityStatusReply,
  fetchClientIdentityRow,
  IDENTITY_ASK_MESSAGE,
  isIdentityEscapeMessage,
  looksLikeIdentityAttempt,
  matchesAlreadyHaveDataIntent,
  parseClientIdentity,
  updateClientIdentity,
} from "./client-identity.ts";
import {
  AWAITING_NO_SHOW_REASON,
  NO_SHOW_REASON_ASK_MESSAGE,
  NO_SHOW_REASON_THANKS_MESSAGE,
} from "./no-show.ts";
import {
  detectAITrigger,
  handleAIMessage,
  isAIRateLimited,
  matchesMarketingOptOut,
} from "./ai-assistant.ts";
import {
  ADDITIONAL_BOOKING_BLOCK_MESSAGE,
  BOOKING_OVERLAP_MESSAGE,
  CLOSING_AGREEMENT_ACK,
  finalizeRescheduleAppointment,
  getPendingAppointmentsForPhone,
  markDepositForfeitRiskIfLateChange,
  matchesCancelCitaIntent,
  matchesClosingAgreementIntent,
  matchesTimeCorrectionIntent,
  newBookingOverlapsExisting,
  NO_CONFIRMED_APPOINTMENT_ARRIVAL_MESSAGE,
  sendMiCitaMenu,
  sendPendingAppointmentContext,
  shouldBlockAdditionalBooking,
  STAFF_COORDINATION_PHONE,
  textImpliesExistingAppointment,
  wasSlotTakenRecentlySent,
} from "./pending-appointment.ts";
import {
  AWAITING_CURSO_LEAD,
  buildTimeInputFromParsedHour,
  COMPLAINT_MESSAGE,
  CURSO_LEAD_THANKS_TEXT,
  DEFAULT_CLASES_TEXT,
  DEFAULT_CURSOS_EXTENSIONES_TEXT,
  DEFAULT_RETIRO_OTRO_SALON_TEXT,
  formatAvailableHours,
  formatHour12,
  formatHoursHint,
  getSessionSelectedDay,
  isMostlyLocationQuestion,
  isMostlyOpenHoursQuestion,
  isMostlyPartyIntent,
  isMostlyRetiroInfoQuestion,
  isMostlyTimeChoice,
  isSessionStale,
  looksLikeCursoLeadData,
  looksLikeServiceBrowseIntent,
  matchesCartCorrectionIntent,
  matchesComplaintIntent,
  matchesCursoLeadReply,
  matchesDateCorrectionIntent,
  matchesFirstMessageBookingIntent,
  matchesLocationQuestion,
  matchesMidAgendaBrowseOrAddIntent,
  matchesOpenHoursQuestion,
  matchesRetiroInfoQuestion,
  matchesServiceChangeIntent,
  matchesThirdPartyBookingIntent,
  mentionsConflictingCatalogMidCart,
  messageMentionsCalendarDate,
  parseTimeSlot,
  parseTimeText,
  resendDatetimeSelectors,
  sessionHasCart,
  shouldSkipDatetimeResendAfterHaiku,
  stickySelectedDayFromText,
  tryAnswerSpecificHourAvailability,
  tryCompleteBookingFromText,
  trySoftRescheduleFromText,
} from "./booking-flow.ts";
import {
  isDeclineIntent,
  isShortAffirmativeText,
  remapMenuTextUserInput,
} from "./menu-remap.ts";
import { clientTypedPortion } from "../lib/reply-context.ts";
import { shouldSkipDesignPauseForQa } from "../lib/design-staff-hours.mjs";
import {
  buildPersonalAdviceHandoffMessage,
  matchesPersonalAdviceIntent,
} from "../lib/personal-advice-handoff.ts";
import {
  buildReclamacionesMessage,
  matchesReclamacionesIntent,
} from "../lib/reclamaciones-handoff.ts";
import {
  buildRefundFallbackMessage,
  escalateToStaff,
  matchesRefundIntent,
} from "../lib/staff-escalation.ts";
import {
  notifyAdmins,
  notifyAdminsClientChat,
  notifyAdminsPausedClientReply,
} from "../lib/notify.ts";
import { hasExplicitTime } from "../parse-datetime-es.ts";
import {
  getConfigBoolean,
  getConfigText,
  getHaikuRuntimeSettings,
  getHaikuTriggerKeywordsFromWaba,
} from "../lib/waba-config.ts";
import {
  buildEmotionalDeclineReply,
  isCtwaEmotionalEligible,
} from "../lib/emotional-selling.ts";

import type { DispatchContext, DispatchRuntime } from "./dispatch/runtime.ts";
export type { DispatchContext } from "./dispatch/runtime.ts";
import { inboundSilenceReason } from "./dispatch/anti-spam.ts";
import {
  handleLocationQuestion,
  tryHandOffUnrecognizedToHaiku,
} from "./dispatch/haiku-handoff.ts";
import {
  applyPendingPriceCtaBeforeDatetimeTap,
  markBrowseEpisodeClosed,
  proceedToBookingWithCurrentCart,
  tryAcceptPendingPortfolioCta,
  tryAcceptPendingPriceCta,
  trySwapCartFromStaleCatalogTap,
} from "./dispatch/cart-booking.ts";
import {
  formatHourOnlyLima,
  hasRecentOutboundPendingPrompt,
  matchesNaturalClosingIntent,
  matchesTardanzaIntent,
  sendTardanzaPolicy,
  wasAppointmentReminderRecentlySent,
} from "./dispatch/closing-intents.ts";
export {
  hasRecentOutboundPendingPrompt,
  isOutboundPendingPrompt,
  matchesNaturalClosingIntent,
  matchesTardanzaIntent,
  PENDING_PROMPT_CLOSING_WINDOW_MS,
} from "./dispatch/closing-intents.ts";
import { buildCampaignPromoImages } from "./dispatch/campaign-images.ts";
import {
  CART_NAV_IDS,
  ECHO_TITLES,
  MENU_MAIN_OPTIONS,
  SALUDOS,
} from "./dispatch/menu-ids.ts";
import {
  tryHandleCtwaEntry,
  tryHandleCtwaInterestStep,
} from "./dispatch/ctwa.ts";
import { tryHandleMenuTaps } from "./dispatch/menu-taps.ts";
import { WABA_PANEL_BASE } from "../lib/panel-url.ts";

export async function dispatch(ctx: DispatchContext): Promise<void> {
  const {
    message,
    phoneNumber,
    contactName,
    messageText,
    isNew,
    supabase,
    catalog,
    wabaConfig,
    fromAd,
    referralHeadline,
    phoneCountry,
    messagePreview: messagePreviewIn,
    inboundReceivedAt,
  } = ctx;

  const messagePreview = messagePreviewIn?.trim() ||
    messageText.trim() ||
    (typeof message?.type === "string" ? `[${message.type}]` : "[mensaje]");

  const sendMessage = (to: string, body: string) => _sendMessage(to, body);
  const sendImage = (to: string, url: string, caption?: string) =>
    _sendImage(to, url, caption);
  const sendInteractiveList = (
    to: string,
    header: string,
    body: string,
    btn: string,
    sections: Parameters<typeof _sendInteractiveList>[4],
  ) => _sendInteractiveList(to, header, body, btn, sections);

  // ── WABA CMS: contenidos configurables con fallback hardcoded ────────────────
  // Las 4 imágenes son opcionales — solo se envían si tienen URL configurada
  const metaAdsImageUrl = getConfigText(
    wabaConfig,
    "meta_ads_hero_image_url",
    "",
  );
  const metaAdsCaption = getConfigText(
    wabaConfig,
    "meta_ads_hero_caption",
    "Promoción activa de ZM Lash & Nails Beauty",
  );
  const metaAdsImage2Url = getConfigText(
    wabaConfig,
    "meta_ads_image_2_url",
    "",
  );
  const metaAdsImage2Caption = getConfigText(
    wabaConfig,
    "meta_ads_image_2_caption",
    "",
  );
  const metaAdsImage3Url = getConfigText(
    wabaConfig,
    "meta_ads_image_3_url",
    "",
  );
  const metaAdsImage3Caption = getConfigText(
    wabaConfig,
    "meta_ads_image_3_caption",
    "",
  );
  const metaAdsImage4Url = getConfigText(
    wabaConfig,
    "meta_ads_image_4_url",
    "",
  );
  const metaAdsImage4Caption = getConfigText(
    wabaConfig,
    "meta_ads_image_4_caption",
    "",
  );
  const metaAdsExtensionesImage1Url = getConfigText(
    wabaConfig,
    "meta_ads_extensiones_image_1_url",
    "",
  );
  const metaAdsExtensionesImage1Caption = getConfigText(
    wabaConfig,
    "meta_ads_extensiones_image_1_caption",
    "",
  );
  const metaAdsExtensionesImage2Url = getConfigText(
    wabaConfig,
    "meta_ads_extensiones_image_2_url",
    "",
  );
  const metaAdsExtensionesImage2Caption = getConfigText(
    wabaConfig,
    "meta_ads_extensiones_image_2_caption",
    "",
  );
  const metaAdsLiftingImage1Url = getConfigText(
    wabaConfig,
    "meta_ads_lifting_image_1_url",
    "",
  );
  const metaAdsLiftingImage1Caption = getConfigText(
    wabaConfig,
    "meta_ads_lifting_image_1_caption",
    "",
  );
  const metaAdsLiftingImage2Url = getConfigText(
    wabaConfig,
    "meta_ads_lifting_image_2_url",
    "",
  );
  const metaAdsLiftingImage2Caption = getConfigText(
    wabaConfig,
    "meta_ads_lifting_image_2_caption",
    "",
  );
  const metaAdsUnasImage1Url = getConfigText(
    wabaConfig,
    "meta_ads_unas_image_1_url",
    "",
  );
  const metaAdsUnasImage1Caption = getConfigText(
    wabaConfig,
    "meta_ads_unas_image_1_caption",
    "",
  );
  const metaAdsUnasImage2Url = getConfigText(
    wabaConfig,
    "meta_ads_unas_image_2_url",
    "",
  );
  const metaAdsUnasImage2Caption = getConfigText(
    wabaConfig,
    "meta_ads_unas_image_2_caption",
    "",
  );
  const metaAdsServicesText = getConfigText(
    wabaConfig,
    "meta_ads_services_text",
    `✨ ¡Hola{nombre}!\n¿Qué servicio te interesa: extensiones, lifting, uñas u otro? Cuéntame y te paso precios y opciones 😊\n\n(Ubicación y horarios te los pasamos cuando agendes o si los pides.)`,
  );
  const campaignPromoImages = buildCampaignPromoImages({
    image1Url: metaAdsImageUrl,
    image1Caption: metaAdsCaption,
    image2Url: metaAdsImage2Url,
    image2Caption: metaAdsImage2Caption,
    image3Url: metaAdsImage3Url,
    image3Caption: metaAdsImage3Caption,
    image4Url: metaAdsImage4Url,
    image4Caption: metaAdsImage4Caption,
  });
  const extensionesPromoImages = buildCampaignPromoImages({
    image1Url: metaAdsExtensionesImage1Url,
    image1Caption: metaAdsExtensionesImage1Caption,
    image2Url: metaAdsExtensionesImage2Url,
    image2Caption: metaAdsExtensionesImage2Caption,
  });
  const liftingPromoImages = buildCampaignPromoImages({
    image1Url: metaAdsLiftingImage1Url,
    image1Caption: metaAdsLiftingImage1Caption,
    image2Url: metaAdsLiftingImage2Url,
    image2Caption: metaAdsLiftingImage2Caption,
  });
  const unasPromoImages = buildCampaignPromoImages({
    image1Url: metaAdsUnasImage1Url,
    image1Caption: metaAdsUnasImage1Caption,
    image2Url: metaAdsUnasImage2Url,
    image2Caption: metaAdsUnasImage2Caption,
  });
  const tardanzaImageUrl = getConfigText(
    wabaConfig,
    "tardanza_image_url",
    "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/campanas/tardanza-policy.jpg",
  );
  const tardanzaText = getConfigText(
    wabaConfig,
    "tardanza_message_text",
    "¡Gracias por avisarnos! 💜 Te recordamos que manejamos una tolerancia de *hasta 10 minutos*. Si llegas después, la cita podría ser reprogramada según disponibilidad.\n\nPara coordinarlo directamente escríbele a nuestro equipo al 📱 *932 535 512* 🌸",
  );
  const horariosText = getConfigText(
    wabaConfig,
    "horarios_text",
    "🕐 *Horarios de Atención*\n\n📅 Lunes a Sábado (con cita previa)\n⏰ 10:00 AM - 6:00 PM\n\n📅 Domingos\n⏰ 10:30 AM - 1:00 PM (previa cita + adelanto 20%)\n\n📅 Feriados\n⏰ 10:00 AM - 12:00 PM (cuando el CC abre)\n🚫 23, 28 y 29 jul: *cerrado* (CC no abre)",
  );
  const ubicacionText = getConfigText(
    wabaConfig,
    "ubicacion_text",
    DEFAULT_UBICACION_TEXT,
  );
  const clasesText = getConfigText(
    wabaConfig,
    "clases_text",
    DEFAULT_CLASES_TEXT,
  );
  const cursosExtensionesText = getConfigText(
    wabaConfig,
    "cursos_extensiones_text",
    DEFAULT_CURSOS_EXTENSIONES_TEXT,
  );
  const retiroOtroSalonText = getConfigText(
    wabaConfig,
    "retiro_otro_salon_text",
    DEFAULT_RETIRO_OTRO_SALON_TEXT,
  );

  const haikuRuntime = getHaikuRuntimeSettings(wabaConfig);

  const msgType = message?.type;
  const hasInteractive = message &&
    typeof (message as Record<string, unknown>).interactive === "object";
  let session = await getSession(supabase, phoneNumber);

  const rt: DispatchRuntime = {
    ctx,
    session,
    senders: { sendMessage, sendImage, sendInteractiveList },
    cms: {
      ubicacionText,
      horariosText,
      tardanzaText,
      tardanzaImageUrl,
      clasesText,
      cursosExtensionesText,
      retiroOtroSalonText,
      metaAdsServicesText,
      campaignPromoImages,
      extensionesPromoImages,
      liftingPromoImages,
      unasPromoImages,
    },
    haikuRuntime,
    msgType: typeof msgType === "string" ? msgType : undefined,
    hasInteractive: Boolean(hasInteractive),
    messagePreview,
    userInput: "",
    lower: "",
    interactiveId: null,
    isInteractive: false,
  };

  // ── Anti-spam: silenciar mensajes de bots de terceros ────────────────────────
  const silence = inboundSilenceReason(phoneNumber, messageText, wabaConfig);
  if (silence === "blocked") {
    console.log(`[ANTI-SPAM] Número bloqueado: ${phoneNumber}`);
    return;
  }

  // Constancia NPS (PDF) — Vanessa/QA. Antes de pausa para no tragárselo.
  if (msgType === "document") {
    const { tryHandleSunatNpsOcr } = await import("./expense-ocr.ts");
    const handledNps = await tryHandleSunatNpsOcr({
      supabase,
      phoneNumber,
      message: message as Record<string, unknown>,
    });
    if (handledNps) return;
  }

  if (messageText.trim()) {
    void attachPeMobileToBsuidClient(supabase, phoneNumber, messageText);
  }

  // Staff takeover (foto diseño / pausa manual). Sigue logueando inbound; no auto-responde.
  if (session?.bot_paused_at) {
    if (msgType === "image") {
      const { persistInboundWaImage, tryHandleDesignImageTakeover } =
        await import("../lib/inbound-image.ts");
      // Reusa takeover: otra foto → push + reafirma pausa (sin ack spam)
      const handled = await tryHandleDesignImageTakeover({
        supabase,
        phoneNumber,
        contactName,
        message,
        session: session as Record<string, unknown>,
      });
      if (!handled) {
        // QA u otro edge: al menos persistir URL
        const imageData = message.image as Record<string, string> | undefined;
        if (imageData?.id) {
          await persistInboundWaImage(supabase, {
            phone: phoneNumber,
            mediaId: imageData.id,
            caption: imageData.caption ?? null,
          });
        }
      }
    } else if (msgType === "audio") {
      // Otro audio con bot ya pausado → persiste + push (sin ack spam)
      const { tryHandleAudioTakeover } = await import(
        "../lib/inbound-audio.ts"
      );
      await tryHandleAudioTakeover({
        supabase,
        phoneNumber,
        contactName,
        message,
        session: session as Record<string, unknown>,
      });
    } else {
      // Texto/botón/etc. en pausa → avisar staff (debounce 3 min)
      void notifyAdminsPausedClientReply(supabase, {
        phone: phoneNumber,
        clientName: contactName,
        messagePreview: messagePreview || messageText || `[${msgType}]`,
      }).catch((err) => console.error("[WABA] paused reply push:", err));
    }
    console.log(
      `[WABA] bot pausado, skip auto-reply: ${phoneNumber.slice(-4)}`,
    );
    return;
  }

  if (silence === "spam") {
    console.log(
      `[ANTI-SPAM] Mensaje ignorado de ${phoneNumber}: "${
        messageText.slice(0, 80)
      }"`,
    );
    return;
  }

  // ── Libro de Reclamaciones: enlace + pausa del bot + push al staff ─────────
  // Trámite formal (Indecopi): en cualquier paso (incluido pago/adelanto), antes del
  // resto del flujo. Con el bot ya pausado no llega aquí (lo cubre el push de "pausado").
  if (
    (msgType === "text" || !msgType) &&
    messageText.trim() &&
    matchesReclamacionesIntent(messageText) &&
    !shouldSkipDesignPauseForQa(phoneNumber)
  ) {
    await upsertSession(supabase, phoneNumber, {
      bot_paused_at: new Date().toISOString(),
    });
    await sendMessage(phoneNumber, buildReclamacionesMessage(contactName));
    const reclamoName = (contactName || "Clienta").trim().split(/\s+/)[0];
    try {
      await notifyAdmins(
        supabase,
        "📕⏸️ Reclamo · Revisar YA",
        `${reclamoName} pide el Libro de Reclamaciones o quiere dejar un reclamo — bot en pausa, toma el chat.`,
        {
          type: "waba_chat",
          reason: "libro_reclamaciones",
          phone: phoneNumber,
          client_name: reclamoName.slice(0, 80),
          url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(phoneNumber)}`,
        },
      );
    } catch (err) {
      console.error("[reclamaciones] push:", err);
    }
    return;
  }

  void notifyAdminsClientChat(supabase, {
    phone: phoneNumber,
    clientName: contactName,
    messagePreview,
    isNew,
    fromAd,
    referralHeadline,
  }).catch((err) => console.error("[WABA] push chat notify:", err));

  // ── Modo sombra (piloto): regex vs Haiku — solo log, no afecta el flujo ─────
  // Dispara en paralelo (void) antes del waterfall de texto libre en
  // browsing/awaiting_datetime. Skip QA + copy CTWA (ahorro tokens) dentro de
  // runIntentShadowLog. Fallos de tabla/API se tragan en silencio.
  if (
    (msgType === "text" || !msgType) &&
    messageText.trim() &&
    (!session?.step ||
      session.step === "browsing" ||
      session.step === "awaiting_datetime")
  ) {
    const wamid = typeof (message as { id?: unknown })?.id === "string"
      ? (message as { id: string }).id
      : null;
    void runIntentShadowLog({
      supabase,
      phone: phoneNumber,
      wamid,
      step: session?.step ?? null,
      hasCart: sessionHasCart(session ?? null),
      messageText,
      session: session ?? null,
    });
  }

  // Multi-cita / terceros — Haiku-primero (`isMostlyPartyIntent`):
  // puro → party; mixto precio/promo/servicio → Haiku; si Haiku falla → party.
  // No interceptar depósito (screenshot ni pasos resumen→datos→adelanto)
  if (
    msgType === "text" &&
    messageText.trim() &&
    session?.step !== "awaiting_payment_screenshot" &&
    session?.step !== "awaiting_deposit_datos" &&
    session?.step !== "awaiting_deposit_boleta" &&
    !session?.awaiting_screenshot &&
    matchesThirdPartyBookingIntent(messageText)
  ) {
    if (!isMostlyPartyIntent(messageText)) {
      const handed = await tryHandOffUnrecognizedToHaiku({
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
        wabaConfig,
        haikuRuntime,
        session: session ?? null,
        prompt: messageText,
      });
      if (handed) return;
    }
    const { startPartyBookingFlow } = await import("./party-booking.ts");
    await startPartyBookingFlow(supabase, phoneNumber, messageText);
    return;
  }

  if (msgType === "text" && messageText.trim()) {
    const { maybeStartDuoPackFromConfirm } = await import("./party-booking.ts");
    if (
      await maybeStartDuoPackFromConfirm(
        supabase,
        phoneNumber,
        messageText,
        catalog,
      )
    ) {
      return;
    }
  }

  // Party: capturar nombre (guest/primary) en texto libre
  if (msgType === "text" && messageText.trim()) {
    const { tryHandlePartyText } = await import("./party-booking.ts");
    if (await tryHandlePartyText(supabase, phoneNumber, messageText)) {
      return;
    }
  }

  // ── Button reply de plantillas (ej. recordatorio_cita_zm) ───────────────────
  // Las respuestas a botones quick-reply de PLANTILLA llegan como msgType
  // "button" con el texto en message.button.text (ya propagado a messageText por
  // index.ts). Los botones interactivos del propio bot llegan como "interactive".
  {
    let buttonTitle = "";
    if (msgType === "interactive") {
      const interactive = message?.interactive as
        | Record<string, unknown>
        | undefined;
      if (interactive?.type === "button_reply") {
        buttonTitle =
          (interactive.button_reply as Record<string, string>)?.title ?? "";
      }
    } else if (msgType === "button") {
      const button = message?.button as Record<string, string> | undefined;
      const payPayload = (button?.payload ?? "").trim();
      if (
        payPayload.startsWith("pay_verify_approve:") ||
        payPayload.startsWith("pay_verify_reject:")
      ) {
        const {
          handlePaymentVerificationButtonTap,
          isAuthorizedPaymentVerifyTap,
        } = await import("./payment-verification-button.ts");
        if (!isAuthorizedPaymentVerifyTap(phoneNumber)) {
          console.warn(
            `[pay-verify] tap ignorado (no admin) …${phoneNumber.slice(-4)}`,
          );
          return;
        }
        await handlePaymentVerificationButtonTap(supabase, payPayload, {
          replyPhone: phoneNumber,
        });
        return;
      }
      buttonTitle = (button?.text ?? button?.payload ?? messageText).trim();
    }

    if (buttonTitle) {
      const buttonLower = buttonTitle.toLowerCase();
      const isConfirm = buttonTitle === "Confirmo mi cita" ||
        buttonLower.includes("confirmo") ||
        buttonLower === "confirmar";
      const isNoShow = buttonTitle === "No podré asistir" ||
        buttonLower.includes("no podré asistir") ||
        buttonLower.includes("no podre asistir");
      const isReschedule = buttonTitle === "Necesito reprogramar" ||
        buttonLower.includes("reprogramar") ||
        buttonLower.includes("cancelar");
      const isLateArrival = buttonTitle === "Voy a llegar tarde" ||
        buttonLower.includes("voy a llegar tarde") ||
        buttonLower.includes("llegaré tarde") ||
        buttonLower.includes("llegare tarde") ||
        (buttonLower.includes("voy tarde") &&
          !buttonLower.includes("no podré"));

      // Plantilla retoque_reenganche_zm: Agendar / Otro servicio / Más adelante
      const { detectRetouchTemplateButton, handleRetouchTemplateButton } =
        await import("./retouch-reengage.ts");
      const retouchKind = detectRetouchTemplateButton(buttonTitle);
      if (retouchKind) {
        const handled = await handleRetouchTemplateButton({
          kind: retouchKind,
          phoneNumber,
          contactName,
          supabase,
          catalog,
          session: session as Record<string, unknown> | null,
          proceedToBooking: async () => {
            const fresh = await getSession(supabase, phoneNumber);
            await proceedToBookingWithCurrentCart(
              supabase,
              phoneNumber,
              fresh,
              catalog,
            );
          },
        });
        if (handled) return;
      }

      if (isConfirm) {
        const pendingConfirm = await getPendingAppointmentsForPhone(
          supabase,
          phoneNumber,
        );
        if (pendingConfirm.length === 0) {
          await _sendMessage(
            phoneNumber,
            "No encontramos una cita pendiente con este número 💜 Si ya viniste o quieres agendar de nuevo, escribe *menu* o *agendar*.",
          );
          return;
        }
        await _sendMessage(
          phoneNumber,
          "¡Perfecto! ✨ Tu cita está confirmada. ¡Te esperamos! 💜",
        );
        await markBrowseEpisodeClosed(supabase, phoneNumber);
        return;
      }
      // Same-day / recordatorio: botón "Voy a llegar tarde" (Yelitza …1186)
      if (isLateArrival) {
        const pendingLate = await getPendingAppointmentsForPhone(
          supabase,
          phoneNumber,
        );
        if (pendingLate.length === 0) {
          await _sendMessage(
            phoneNumber,
            NO_CONFIRMED_APPOINTMENT_ARRIVAL_MESSAGE,
          );
          return;
        }
        await sendTardanzaPolicy({
          supabase,
          phone: phoneNumber,
          text: tardanzaText,
          imageUrl: tardanzaImageUrl,
          sendMessage,
          sendImage,
        });
        return;
      }
      // Recordatorio same-day: primero pedir motivo, luego menú Mi cita
      if (isNoShow) {
        const pending = await getPendingAppointmentsForPhone(
          supabase,
          phoneNumber,
        );
        const apptId = pending.length === 1 ? pending[0].id : null;
        await upsertSession(supabase, phoneNumber, {
          step: AWAITING_NO_SHOW_REASON,
          reschedule_appointment_id: apptId,
        });
        await _sendMessage(phoneNumber, NO_SHOW_REASON_ASK_MESSAGE);
        return;
      }
      if (isReschedule) {
        // La reprogramación la maneja Haiku por ahora: conversa fecha/hora con
        // la clienta en lenguaje natural en lugar de un mensaje fijo.
        const rescheduleMsg = "Necesito reprogramar mi cita";
        const haikuKeywords = getHaikuTriggerKeywordsFromWaba(wabaConfig);
        const trigger = detectAITrigger(rescheduleMsg, haikuKeywords) ?? {
          type: "free_question" as const,
          originalMessage: rescheduleMsg,
        };
        if (
          !(await isAIRateLimited(
            supabase,
            phoneNumber,
            haikuRuntime.rate_limit_per_hour,
          ))
        ) {
          const handled = await handleAIMessage(
            { phoneNumber, contactName, catalog, supabase, phoneCountry },
            trigger,
            wabaConfig,
          );
          if (handled) return;
        }
        // Fallback si Haiku falla o está rate-limited
        await _sendMessage(
          phoneNumber,
          "Entendido 💜 ¿Para cuándo te gustaría reprogramar tu cita? Dinos qué día y horario te funciona mejor.",
        );
        return;
      }
    }
  }

  // REMINDER_TEXT_CONFIRM: confirmación de asistencia en texto libre = mismo handler
  // que «Confirmo mi cita» (botón). Cierre neutro y directo, sin abrir la puerta a
  // cambios de servicio/horario (Vanessa, 06-ago — caso Pilar Palacios: Haiku había
  // respondido "¿Es correcto o necesitas cambiar algo?" ante un simple "sí asistiré").
  // Solo si NO hay un flujo activo en curso (no pisar Haiku, identidad, awaiting_datetime, etc.)
  // y solo si de verdad se envió un recordatorio reciente (no basta con tener una cita pendiente).
  {
    const trimmedMsg = messageText.trim();
    const exactConfirm =
      /^(s[ií]|ok|dale|va|listo|confirmo|confirmar)([\s!,.💚💜✨👍]*)$/iu.test(
        trimmedMsg,
      );
    // Frases naturales de confirmación de asistencia (con saludo/texto alrededor),
    // ej. "Hola Vane, si asistiré". Se excluye cualquier "no" para no confirmar
    // negaciones ("no podré asistir", "no voy a poder", etc.). Sin "s[ií]" suelto:
    // esa alternativa matcheaba "si" como conjunción condicional en cualquier parte
    // del mensaje ("si me desocupo antes voy"), confirmando asistencia sobre texto
    // dudoso — el caso de Pilar ya queda cubierto por "asistir[ée]" sin necesitarla.
    const phraseConfirm = !/\bno\b/i.test(trimmedMsg) &&
      /\b(asistir[ée]|voy a (ir|estar)|ah[ií] estar[ée]|confirmo(?:\s+mi\s+asistencia)?)\b/i
        .test(
          trimmedMsg,
        );
    const confirmText = (msgType === "text" || !msgType) &&
      (!session?.step || session.step === "browsing") &&
      (exactConfirm || phraseConfirm);
    if (confirmText) {
      const pendingConfirm = await getPendingAppointmentsForPhone(
        supabase,
        phoneNumber,
      );
      if (
        pendingConfirm.length > 0 &&
        (await wasAppointmentReminderRecentlySent(supabase, phoneNumber))
      ) {
        const srta = srtaLabel(contactName);
        const hora = formatHourOnlyLima(pendingConfirm[0]!.date);
        const closing = srta && hora
          ? `Perfecto ${srta} 🌷, la esperamos a las ${hora} 🤗`
          : "¡Perfecto! ✨ Tu cita está confirmada. ¡Te esperamos! 💜";
        await _sendMessage(phoneNumber, closing);
        await markBrowseEpisodeClosed(supabase, phoneNumber);
        return;
      }
    }
  }

  if (await tryHandleCtwaInterestStep(rt)) return;
  session = rt.session;

  // ── awaiting_no_show_reason: motivo tras "No podré asistir" (recordatorio 3h) ──
  if (session?.step === AWAITING_NO_SHOW_REASON) {
    const reason = messageText.trim();
    const apptId = session.reschedule_appointment_id as string | null;
    if (reason && apptId) {
      const { error: reasonErr } = await supabase
        .from("appointments")
        .update({ no_show_reason: reason.slice(0, 2000) })
        .eq("id", apptId);
      if (reasonErr) {
        console.error("[WABA] no_show_reason update:", reasonErr.message);
      }
    }
    await upsertSession(supabase, phoneNumber, {
      step: "browsing",
      reschedule_appointment_id: null,
    });
    await sendMessage(phoneNumber, NO_SHOW_REASON_THANKS_MESSAGE);
    await sendMiCitaMenu(phoneNumber, supabase);
    return;
  }

  // ── awaiting_curso_lead: respuesta al formulario de curso de extensiones ──
  if (session?.step === AWAITING_CURSO_LEAD) {
    const raw = messageText.trim();
    if (!raw || getInteractiveId(message)) {
      await sendMessage(phoneNumber, cursosExtensionesText);
      return;
    }
    const rawLower = raw.toLowerCase();
    if (
      /\b(menu|menú|agendar|servicios|promos?|ubicaci[oó]n|horarios?)\b/.test(
        rawLower,
      ) ||
      matchesComplaintIntent(raw)
    ) {
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      if (session) session.step = "browsing";
      // caer al flujo normal
    } else if (matchesCursoLeadReply(rawLower) || looksLikeCursoLeadData(raw)) {
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      await sendMessage(phoneNumber, CURSO_LEAD_THANKS_TEXT);
      const who = contactName?.trim() ||
        raw.split(/\n/)[0]?.trim().slice(0, 40) ||
        phoneNumber.slice(-4);
      await notifyAdmins(
        supabase,
        `Curso extensiones · Revisar YA · ${who}`,
        raw.slice(0, 180),
        {
          type: "waba_chat",
          phone: phoneNumber,
          url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(phoneNumber)}`,
        },
      );
      return;
    } else {
      await sendMessage(
        phoneNumber,
        "Para enviarte la info del curso, necesito *nombre y apellidos*, tu *WhatsApp* y si eres nivel *principiante* o *medio* 💜",
      );
      return;
    }
  }

  // ── awaiting_client_identity: dato adicional post-cita (no bloqueó la creación) ──
  if (session?.step === AWAITING_CLIENT_IDENTITY) {
    const raw = messageText.trim();
    if (!raw || getInteractiveId(message)) {
      await sendMessage(phoneNumber, IDENTITY_ASK_MESSAGE);
      return;
    }
    // Parsear antes de escape: "Hola, Nombre Apellido DNI …" no es menú
    const parsed = parseClientIdentity(raw, { senderPhone: phoneNumber });
    if (!parsed && isIdentityEscapeMessage(raw, phoneNumber)) {
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      await clearCart(supabase, phoneNumber);
      await sendMenuWithPromos(phoneNumber, supabase);
      return;
    }
    if (!parsed) {
      // "Ya tienen mis datos" → explicar qué hay y qué falta (Maribel)
      if (matchesAlreadyHaveDataIntent(raw)) {
        const clientRow = await fetchClientIdentityRow(supabase, phoneNumber);
        await sendMessage(phoneNumber, buildIdentityStatusReply(clientRow));
        return;
      }
      // Intento de ficha mal formado → pedir de nuevo
      if (looksLikeIdentityAttempt(raw)) {
        await sendMessage(
          phoneNumber,
          "No pude leer bien los datos 🙏 Envíame *nombre y apellido* y tu *DNI o CE* en un solo mensaje (ej: María García 87654321).",
        );
        return;
      }
      // Queja / corrección / texto ajeno (Pati): salir del paso sin spamear DNI
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      await sendMessage(
        phoneNumber,
        "Dale, cuando quieras me pasas el DNI para completar tu ficha 💜 Tu cita ya está anotada.",
      );
      return;
    }
    const result = await updateClientIdentity(supabase, phoneNumber, parsed);
    if (!result.ok && result.reason === "dni_taken") {
      await sendMessage(
        phoneNumber,
        "Ese documento ya está registrado en otra ficha 🙏 Verifica el número o escríbenos al *932 535 512*.",
      );
      return;
    }
    if (!result.ok) {
      await sendMessage(
        phoneNumber,
        "No pude guardar tus datos ahora. Tu cita sigue confirmada 💜 Si quieres, reenvía nombre + DNI/CE o escríbenos al *932 535 512*.",
      );
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      return;
    }
    await upsertSession(supabase, phoneNumber, { step: "browsing" });
    await sendMessage(
      phoneNumber,
      "Listo, gracias — ya actualicé tu ficha 💜 ¡Nos vemos en tu cita!",
    );
    return;
  }

  // ── awaiting_payment_info: cita ya anotada, responder preguntas sin romper flujo ───────────
  if (session?.step === "awaiting_payment_info") {
    const msgLowerPI = messageText.trim().toLowerCase();
    // Si es un saludo/menu → limpiar y mostrar menú
    if (SALUDOS.some((s) => msgLowerPI.includes(s))) {
      await clearCart(supabase, phoneNumber);
      await sendMenuWithPromos(phoneNumber, supabase);
      return;
    }
    // Si cancela → limpiar y menú
    if (
      msgLowerPI.includes("cancelar") ||
      msgLowerPI.includes("empezar de nuevo") ||
      msgLowerPI.includes("menu") ||
      msgLowerPI.includes("menú")
    ) {
      await clearCart(supabase, phoneNumber);
      await sendMenuWithPromos(phoneNumber, supabase);
      return;
    }
    // Cualquier otra pregunta/duda → Haiku con contexto de cita ya confirmada o mensaje corto
    const haikuKeywords = getHaikuTriggerKeywordsFromWaba(wabaConfig);
    const trigger = detectAITrigger(messageText, haikuKeywords);
    if (
      trigger &&
      !(await isAIRateLimited(
        supabase,
        phoneNumber,
        getHaikuRuntimeSettings(wabaConfig).rate_limit_per_hour,
      ))
    ) {
      const handled = await handleAIMessage(
        { phoneNumber, contactName, catalog, supabase, phoneCountry },
        trigger,
        wabaConfig,
      );
      if (handled) return;
    }
    // Fallback: recordar que la cita ya está anotada
    await sendMessage(
      phoneNumber,
      "Tu cita ya está anotada 💜 El pago se realiza el día de la cita. Si tienes alguna duda, escríbenos al 📱 *932 535 512*.",
    );
    return;
  }

  // ── completed: cita ya creada — Haiku primero, bot solo si ella no responde ──
  if (session?.step === "completed") {
    // Corrección de hora / nueva fecha sobre la cita activa — ANTES de Haiku.
    // El prompt de Haiku para "CITA PROGRAMADA" le dice a la clienta "escribe
    // la hora — el sistema la aplica", pero sin este check el mensaje caía
    // directo a Haiku (que solo puede hablar, no tocar la BD) y halucinaba
    // una confirmación falsa sin mover la cita — casos H/I de
    // `waba:validate:special-overlap` (22-ago-2026).
    if (
      !getInteractiveId(message) &&
      messageText.trim() &&
      !sessionHasCart(session ?? null)
    ) {
      const softDone = await trySoftRescheduleFromText(
        supabase,
        phoneNumber,
        messageText,
        catalog,
      );
      if (softDone) return;
    }
    // Menú completo solo con la palabra explícita (Melisa …9414: "No"/"Ok"
    // reabrían el catálogo). El resto del texto, incluidas frases cortas
    // ("sí", "no", "ya?", "hola?"), lo lee Haiku. El bot queda de respaldo.
    const isExplicitMenuWord =
      messageText.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") ===
        "menu";
    if (isExplicitMenuWord) {
      await sendMenuWithPromos(phoneNumber, supabase);
      return;
    }
    if (!getInteractiveId(message) && messageText.trim()) {
      const haikuKeywords = getHaikuTriggerKeywordsFromWaba(wabaConfig);
      // detectAITrigger descarta ≤3 chars y saludos cortos. Aquí igual van a
      // Haiku: un "Hola?" con el abono en revisión no es un cierre genérico
      // (Ana Paula …5112, 1-oct-2026).
      const trigger = detectAITrigger(messageText, haikuKeywords) ?? {
        type: "fallback" as const,
        originalMessage: messageText.trim(),
      };
      if (
        !(await isAIRateLimited(
          supabase,
          phoneNumber,
          haikuRuntime.rate_limit_per_hour,
        ))
      ) {
        const handled = await handleAIMessage(
          { phoneNumber, contactName, catalog, supabase, phoneCountry },
          trigger,
          wabaConfig,
        );
        if (handled) return;
      }
    }
    if (
      !getInteractiveId(message) &&
      messageText.trim() &&
      (matchesClosingAgreementIntent(messageText) ||
        isDeclineIntent(messageText.trim().toLowerCase()))
    ) {
      await sendMessage(phoneNumber, CLOSING_AGREEMENT_ACK);
      return;
    }
    await sendMessage(
      phoneNumber,
      "¡Perfecto! 💜 Cualquier cosa aquí estamos. Escribe *menu* si quieres ver más servicios.",
    );
    return;
  }

  // awaiting_pre_service_photo / awaiting_pre_service_photo_2: flujo desactivado
  if (
    session?.step === "awaiting_pre_service_photo" ||
    session?.step === "awaiting_pre_service_photo_2"
  ) {
    await upsertSession(supabase, phoneNumber, {
      step: "browsing",
      awaiting_screenshot: false,
    });
  }

  // Pago abandonado hace horas + saludo/"agendar": reiniciar, no seguir en el paso de pago
  if (
    msgType === "text" &&
    isStalePaymentRestart(
      session as Parameters<typeof isStalePaymentRestart>[0],
      messageText,
    )
  ) {
    await clearCart(supabase, phoneNumber);
    await upsertSession(supabase, phoneNumber, { party_booking: null });
    session = (await getSession(supabase, phoneNumber)) ?? session;
  }

  // Abono fijo S/25: resumen → (espera) datos → (espera) adelanto → voucher
  if (
    session?.step === "awaiting_deposit_datos" ||
    session?.step === "awaiting_deposit_boleta"
  ) {
    const { handleFixedDepositSteps } = await import("./steps.ts");
    const handledDeposit = await handleFixedDepositSteps(
      supabase,
      phoneNumber,
      message,
      messageText,
      session,
      {
        ubicacionText,
        horariosText,
        tryHaikuOnUnmatchedIdentity: (text: string) =>
          tryHandOffUnrecognizedToHaiku({
            phoneNumber,
            contactName,
            catalog,
            supabase,
            phoneCountry,
            wabaConfig,
            haikuRuntime,
            session,
            prompt: text,
          }),
      },
    );
    if (handledDeposit) return;
    session = (await getSession(supabase, phoneNumber)) ?? session;
  }

  // Depósito (S/25 fijo o domingo 20%): procesar comprobante antes del flujo general
  if (
    session?.step === "awaiting_payment_screenshot" ||
    session?.awaiting_screenshot
  ) {
    const handledPay = await handleAwaitingPaymentScreenshot(
      supabase,
      phoneNumber,
      message,
      messageText,
      session,
      { ubicacionText, horariosText },
    );
    if (handledPay) return;
    session = (await getSession(supabase, phoneNumber)) ?? session;
  }

  // Foto de referencia (diseño/color) con cita scheduled — no pisa Treysy ni pago
  if (msgType === "image") {
    const imageClassificationEnabled = getConfigBoolean(
      wabaConfig,
      "image_classification_enabled",
      true,
    );
    if (imageClassificationEnabled) {
      const { tryHandlePaymentScreenshotDetected } = await import(
        "./payment-screenshot-detected.ts"
      );
      const handledPayment = await tryHandlePaymentScreenshotDetected({
        supabase,
        phoneNumber,
        contactName,
        message,
        session: session as Record<string, unknown> | null,
      });
      if (handledPayment) return;
    }

    const { tryHandleServiceReferenceImage } = await import(
      "./reference-image.ts"
    );
    const handledRef = await tryHandleServiceReferenceImage({
      supabase,
      phoneNumber,
      contactName,
      message,
      session: session as Record<string, unknown> | null,
    });
    if (handledRef) return;

    // Sin cita scheduled (o mid-agenda): foto de efectos → push + pausa staff
    const { tryHandleDesignImageTakeover } = await import(
      "../lib/inbound-image.ts"
    );
    const handledDesign = await tryHandleDesignImageTakeover({
      supabase,
      phoneNumber,
      contactName,
      message,
      session: session as Record<string, unknown> | null,
    });
    if (handledDesign) return;
  }

  // Nota de voz → push + pausa staff (el equipo escucha y responde manualmente)
  if (msgType === "audio") {
    const { tryHandleAudioTakeover } = await import("../lib/inbound-audio.ts");
    const handledAudio = await tryHandleAudioTakeover({
      supabase,
      phoneNumber,
      contactName,
      message,
      session: session as Record<string, unknown> | null,
    });
    if (handledAudio) return;
  }

  // Link de referencia (Pinterest/IG/…) con cita scheduled — antes de Haiku
  if (msgType === "text" && messageText.trim()) {
    const { tryHandleServiceReferenceUrl } = await import(
      "./reference-image.ts"
    );
    const handledUrl = await tryHandleServiceReferenceUrl({
      supabase,
      phoneNumber,
      contactName,
      messageText,
      session: session as Record<string, unknown> | null,
    });
    if (handledUrl) return;
  }

  const interactiveId = getInteractiveId(message);
  const isInteractive = msgType === "interactive" || hasInteractive;
  let userInput = (interactiveId || messageText).trim();
  const lower = userInput.toLowerCase();

  rt.interactiveId = interactiveId ?? null;
  rt.userInput = userInput;
  rt.lower = lower;
  rt.isInteractive = Boolean(isInteractive);
  rt.session = session;

  // ── STOP: baja de marketing antes de cualquier saludo/menú/flujo (también en
  // el primer mensaje: sin esto caía al saludo de entrada y no se registraba).
  if (
    !interactiveId && messageText.trim() && matchesMarketingOptOut(messageText)
  ) {
    const handledOptOut = await handleAIMessage(
      { phoneNumber, contactName, catalog, supabase, phoneCountry },
      { type: "opt_out", originalMessage: messageText.trim() },
      wabaConfig,
    );
    if (handledOptOut) return;
  }

  // ── "Ya" / "ya gracias" = acuerdo cerrado (PE) — no menú ni re-agendar ─────
  if (
    !interactiveId &&
    messageText.trim() &&
    matchesClosingAgreementIntent(messageText)
  ) {
    const pendClose = await getPendingAppointmentsForPhone(
      supabase,
      phoneNumber,
    );
    if (pendClose.length > 0 || session?.step === "completed") {
      await clearCart(supabase, phoneNumber);
      await upsertSession(supabase, phoneNumber, { step: "completed" });
      await sendMessage(phoneNumber, CLOSING_AGREEMENT_ACK);
      return;
    }
    // Sin cita en BD pero cree que quedó: no abrir menú; guía suave si hay carrito
    if (sessionHasCart(session ?? null)) {
      await sendMessage(
        phoneNumber,
        "Perfecto 💜 Para dejar tu cita anotada, elige la *hora* con los botones de abajo (así queda confirmada en el sistema).",
      );
      if (session?.step === "awaiting_datetime") {
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
      }
      return;
    }
    await sendMessage(phoneNumber, CLOSING_AGREEMENT_ACK);
    return;
  }

  // ── Cancelar cita existente (antes de NEGACIONES genéricas) ─────────────────
  // Plata de vuelta (devolución/reembolso del adelanto): Haiku-primero. El regex solo
  // garantiza el escalamiento al staff (pausa + push) y es el respaldo si Haiku falla —
  // nunca el bot improvisando "gestiona tu devolución" (Luciana …6431, 4-oct-2026).
  if (!interactiveId && messageText && matchesRefundIntent(messageText)) {
    const pendRefund = await getPendingAppointmentsForPhone(
      supabase,
      phoneNumber,
    );
    for (const p of pendRefund) {
      await markDepositForfeitRiskIfLateChange(supabase, p.id);
    }
    await escalateToStaff(supabase, {
      phone: phoneNumber,
      clientName: contactName,
      reason: "refund",
      preview: messageText,
    });
    const handedRefund = await tryHandOffUnrecognizedToHaiku({
      phoneNumber,
      contactName,
      catalog,
      supabase,
      phoneCountry,
      wabaConfig,
      haikuRuntime,
      session: session ?? null,
      prompt: messageText,
    });
    if (!handedRefund) {
      await sendMessage(phoneNumber, buildRefundFallbackMessage(contactName));
    }
    return;
  }

  if (!interactiveId && messageText && matchesCancelCitaIntent(lower)) {
    const pendCtx = await getPendingAppointmentsForPhone(supabase, phoneNumber);
    if (pendCtx.length > 0) {
      for (const p of pendCtx) {
        await markDepositForfeitRiskIfLateChange(supabase, p.id);
      }
      await sendMessage(
        phoneNumber,
        "Entendemos 💜 Para cancelar o reprogramar tu cita, elige una opción abajo.\n\nSi es urgente, escríbenos al 📱 *932 535 512*.",
      );
      await sendMiCitaMenu(phoneNumber, supabase);
    } else {
      await sendMessage(
        phoneNumber,
        "No encontramos una cita activa con este número. Si ya agendaste por otro medio, escríbenos al 📱 *932 535 512* y te ayudamos 🌸",
      );
    }
    return;
  }

  // Corrección de carrito / cambio de servicio (no es despedida)
  if (!interactiveId && messageText && matchesCartCorrectionIntent(lower)) {
    if (session?.step === "awaiting_datetime") {
      await upsertSession(supabase, phoneNumber, {
        step: "browsing",
        selected_day: null,
        parsed_datetime: null,
      });
    }
    await sendMessage(
      phoneNumber,
      "Entiendo 💜 Revisemos tu selección. Puedes *vaciar* para empezar de cero, *agregar* otro servicio o *agendar* con lo que ya tienes.",
    );
    if (sessionHasCart(session ?? null)) {
      const cartItems = session?.cartItems ?? [];
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
      await sendCartOptions(
        phoneNumber,
        formatCartSummaryFromLines(lines),
        true,
      );
    } else {
      await sendCategoriesAndPromosListFromCatalog(
        phoneNumber,
        catalog.categories,
        catalog.promotions.length > 0,
      );
    }
    return;
  }

  // Asesoría personalizada (rasgo de ojo/rostro + qué le queda): pausa el bot y
  // pasa a Vanessa/Stephani. Antes del decline: "no quiero una mirada triste".
  if (
    !interactiveId &&
    messageText &&
    matchesPersonalAdviceIntent(lower) &&
    !shouldSkipDesignPauseForQa(phoneNumber)
  ) {
    await upsertSession(supabase, phoneNumber, {
      bot_paused_at: new Date().toISOString(),
    });
    await sendMessage(
      phoneNumber,
      buildPersonalAdviceHandoffMessage(contactName),
    );
    const advisorName = (contactName || "Clienta").trim().split(/\s+/)[0];
    void notifyAdmins(
      supabase,
      "💜⏸️ Asesoría personalizada",
      `${advisorName} pide recomendación de mirada — bot en pausa, toma el chat.`,
      {
        type: "waba_chat",
        reason: "personal_advice",
        phone: phoneNumber,
        client_name: advisorName.slice(0, 80),
        url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(phoneNumber)}`,
      },
    ).catch((err) => console.error("[personal-advice] push:", err));
    return;
  }

  // Negaciones/despedidas: limpiar carrito, suprimir nudges futuros y responder amablemente
  if (!interactiveId && messageText && isDeclineIntent(lower)) {
    const declineServiceIds = session?.cartItems?.length
      ? await expandCartItemsToServiceIds(supabase, session.cartItems)
      : (session?.serviceIds ?? []);
    const useEmotionalDecline = Boolean(session?.from_ad_at) &&
      declineServiceIds.length > 0 &&
      isCtwaEmotionalEligible(session?.from_ad_at, declineServiceIds, catalog);
    await clearCart(supabase, phoneNumber);
    const declineMsg = useEmotionalDecline
      ? buildEmotionalDeclineReply(wabaConfig)
      : "¡Está bien! 💜 Cuando quieras agendar o ver nuestros servicios, aquí estaremos. ¡Que tengas un lindo día! 🌸";
    await _sendMessage(phoneNumber, declineMsg);
    return;
  }

  if (!interactiveId && messageText) {
    const remap = remapMenuTextUserInput({
      messageText,
      lower,
      session: session ?? null,
    });
    if (remap.kind === "remapped") {
      userInput = remap.userInput;
    } else if (remap.kind === "short_affirmative_with_cart") {
      // Carrito ya tiene ítems → AGENDAR_YA; limpiar CTAs cortos pendientes
      // (precio y/o portafolio) para que no queden vivos hasta el TTL.
      const sessCta = session as {
        pending_price_cta_service_id?: string | null;
        pending_portfolio_cta_at?: string | null;
      } | null;
      const clearCta: Record<string, null> = {};
      if (sessCta?.pending_price_cta_service_id) {
        clearCta.pending_price_cta_service_id = null;
        clearCta.pending_price_cta_at = null;
      }
      if (sessCta?.pending_portfolio_cta_at) {
        clearCta.pending_portfolio_cta_at = null;
      }
      if (Object.keys(clearCta).length > 0) {
        await upsertSession(supabase, phoneNumber, clearCta);
      }
      userInput = WA_IDS.AGENDAR_YA;
    } else if (
      await tryAcceptPendingPriceCta({
        supabase,
        phoneNumber,
        catalog,
        session: session as {
          pending_price_cta_service_id?: string | null;
          pending_price_cta_at?: string | null;
        } | null,
        messageText,
      })
    ) {
      return;
    } else if (
      await tryAcceptPendingPortfolioCta({
        supabase,
        phoneNumber,
        catalog,
        session: session as {
          pending_portfolio_cta_at?: string | null;
        } | null,
        messageText,
      })
    ) {
      return;
    }
  }

  // Soft reschedule (sin carrito) ANTES de P0 — "mejor el 22 a las 4pm" no debe ir a Mi cita
  if (
    !interactiveId &&
    messageText.trim() &&
    !sessionHasCart(session ?? null)
  ) {
    const softDone = await trySoftRescheduleFromText(
      supabase,
      phoneNumber,
      messageText,
      catalog,
    );
    if (softDone) return;
  }

  // Sticky fecha antes de cerrar cita (última intención gana)
  if (
    !interactiveId &&
    messageText.trim() &&
    (!session?.step ||
      session.step === "browsing" ||
      session.step === "awaiting_datetime")
  ) {
    await stickySelectedDayFromText(
      supabase,
      phoneNumber,
      messageText,
      session,
    );
    session = (await getSession(supabase, phoneNumber)) ?? session;
  }

  // ── Reclamo/garantía → derivar al equipo (con o sin carrito) ───────────────
  // Caso Lili 04/05-ago: el 1.er mensaje ("se bajaron…") llegó en browsing sin
  // carrito → Haiku hizo add_to_cart; el guard solo vivía dentro de sessionHasCart.
  if (
    !interactiveId &&
    messageText.trim() &&
    matchesComplaintIntent(messageText) &&
    (!session?.step ||
      session.step === "browsing" ||
      session.step === "awaiting_datetime")
  ) {
    await _sendMessage(phoneNumber, COMPLAINT_MESSAGE);
    return;
  }

  // ── P0: carrito + fecha/hora en texto → confirmar cita sin Haiku ───────────
  // Incluye awaiting_datetime (última fecha gana: "21 agosto medio dia" con sticky viejo)
  if (
    !interactiveId &&
    messageText.trim() &&
    sessionHasCart(session ?? null) &&
    (!session?.step ||
      session.step === "browsing" ||
      session.step === "awaiting_datetime")
  ) {
    const fastDone = await tryCompleteBookingFromText(
      supabase,
      phoneNumber,
      messageText,
      session ?? null,
      catalog,
    );
    if (fastDone) return;

    // Pregunta por una hora puntual ("¿tienen las 5?") en vez de confirmarla:
    // sin esto caía a Haiku, que solo puede prometer "dame un momento" sin
    // ningún seguimiento real (caso Valeria …9022, 23-sep-2026).
    const hourAnswered = await tryAnswerSpecificHourAvailability(
      supabase,
      phoneNumber,
      messageText,
      session ?? null,
      catalog,
    );
    if (hourAnswered) return;
  }

  const skipSaludoForBooking = !interactiveId &&
    !!messageText.trim() &&
    (matchesFirstMessageBookingIntent(lower) ||
      userInput === "agendar_cita" ||
      userInput === WA_IDS.AGENDAR_YA ||
      userInput === "consultar_horarios");

  // skipSaludoForCatalog: solo cuando la intención es navegar el catálogo explícitamente.
  // "precio", "cuánto", preguntas de servicio específico → NO saltar, van a Haiku.
  const skipSaludoForCatalog = !interactiveId &&
    !!messageText.trim() &&
    [
      "ver servicios",
      "ver el catálogo",
      "ver catalogo",
      "mostrar servicios",
      "ver packs",
      "ver pack",
      "tienen packs",
      "ofrecen",
    ].some((k) => lower.includes(k));

  const hasActiveFlow = session?.step && session.step !== "browsing";
  if (
    hasActiveFlow &&
    (lower.includes("menu") ||
      lower.includes("menú") ||
      lower.includes("inicio"))
  ) {
    await clearCart(supabase, phoneNumber);
    await sendMenuWithPromos(phoneNumber, supabase);
    return;
  }

  // ── Citas pendientes: Mi cita / corrección (si soft no aplicó)
  if (!interactiveId && messageText.trim()) {
    const pendCtx = await getPendingAppointmentsForPhone(supabase, phoneNumber);
    if (
      pendCtx.length > 0 &&
      (textImpliesExistingAppointment(messageText) ||
        matchesTimeCorrectionIntent(messageText))
    ) {
      await sendPendingAppointmentContext(phoneNumber, supabase, pendCtx);
      return;
    }
  }

  rt.session = session;
  rt.userInput = userInput;
  rt.lower = userInput.toLowerCase();
  if (
    await tryHandleCtwaEntry(rt, {
      skipSaludoForBooking,
      skipSaludoForCatalog,
    })
  ) {
    return;
  }
  session = rt.session;

  if (skipSaludoForBooking && (!session?.step || session.step === "browsing")) {
    if (sessionHasCart(session ?? null)) {
      const fastDone = await tryCompleteBookingFromText(
        supabase,
        phoneNumber,
        messageText,
        session ?? null,
        catalog,
      );
      if (fastDone) return;
      await proceedToBookingWithCurrentCart(
        supabase,
        phoneNumber,
        session ?? null,
        catalog,
      );
      return;
    }
    // Sin carrito: Haiku antes del dead-end estático — mismo patrón que Camino A
    // CTWA (`2023b73`). Cubre copy de campaña sin referral Meta / from_ad_at
    // (análisis 05-ago [P2], PE.…4523 "quiero agendar mi cita").
    {
      const haikuKeywords = getHaikuTriggerKeywordsFromWaba(wabaConfig);
      let trigger = detectAITrigger(
        messageText,
        haikuKeywords,
        sessionHasCart(session ?? null),
      );
      if (!trigger) {
        trigger = { type: "fallback", originalMessage: messageText.trim() };
      }
      if (
        !(await isAIRateLimited(
          supabase,
          phoneNumber,
          haikuRuntime.rate_limit_per_hour,
        ))
      ) {
        await upsertSession(supabase, phoneNumber, { step: "browsing" });
        const handled = await handleAIMessage(
          { phoneNumber, contactName, catalog, supabase, phoneCountry },
          trigger,
          wabaConfig,
        );
        if (handled) return;
      }
    }
    await sendMessage(
      phoneNumber,
      "Para agendar, primero elige el servicio o pack que quieres 💜 Después te paso al calendario.",
    );
    await sendCategoriesAndPromosListFromCatalog(
      phoneNumber,
      catalog.categories,
      catalog.promotions.length > 0,
    );
    return;
  }

  if (!userInput && !messageText.trim()) {
    // "button" cubre quick-reply de plantilla con texto vacío (button.text/payload
    // ausentes); sin esto el mensaje se descartaba en silencio, sin respuesta.
    if (msgType === "interactive" || msgType === "button") {
      const title = getInteractiveTitle(message)?.trim();
      const prompt = title ||
        "La clienta tocó una opción del menú que no llegó con id. Ayúdala a continuar con naturalidad.";
      const handed = await tryHandOffUnrecognizedToHaiku({
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
        wabaConfig,
        haikuRuntime,
        session: session ?? null,
        prompt,
      });
      if (handed) return;
      await sendCategoriesAndPromosListFromCatalog(
        phoneNumber,
        catalog.categories,
        catalog.promotions.length > 0,
      );
      return;
    }
    // Imagen/sticker sin caption: no cortar — awaiting_datetime debe reenviar calendario
    // (Treysy: foto mid-agenda → menú/silencio). Otros tipos sin texto: silencio.
    if (msgType !== "image" && msgType !== "sticker") {
      return;
    }
  }

  if (!isInteractive && messageText.trim()) {
    const msgLower = messageText.trim().toLowerCase();
    // Detectar ecos de títulos/descripciones de rows interactivos que Meta envía como texto extra
    const isCategoryEcho = catalog.categories.some(
      (c) => c.name.toLowerCase() === msgLower,
    );
    const isServiceEcho = catalog.services.some(
      (s) =>
        s.name.toLowerCase() === msgLower ||
        (s.short_name ?? "").toLowerCase() === msgLower,
    );
    const isPackEcho = catalog.packs.some(
      (p) =>
        p.title.toLowerCase() === msgLower ||
        (p.short_name ?? "").toLowerCase() === msgLower,
    );
    if (
      isCategoryEcho ||
      isServiceEcho ||
      isPackEcho ||
      ECHO_TITLES.includes(msgLower)
    ) {
      // Solo silenciar si el último outbound fue una lista interactiva reciente (<3s).
      // Los ecos reales de Meta llegan en <2s tras la lista. Si el último outbound fue
      // un mensaje de texto (Haiku), la clienta está respondiendo a esa pregunta — no silenciar.
      const { data: lastOut } = await supabase
        .from("wa_messages")
        .select("msg_type, created_at")
        .eq("phone", phoneNumber)
        .eq("direction", "out")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastOutWasInteractive = lastOut?.msg_type === "interactive";
      const refMs = inboundReceivedAt ?? Date.now();
      const lastOutAgeMs = lastOut?.created_at
        ? refMs - new Date(lastOut.created_at).getTime()
        : Infinity;
      // Silenciar solo si la lista salió <3s antes de que llegó ESTE inbound (no tras coalesce).
      // Meta envía ecos en <2s; a 4s+ suele ser intención real (caso 5267 — P3).
      if (lastOutWasInteractive && lastOutAgeMs < 3_000) {
        return;
      }
      // Si el último outbound fue texto (Haiku respondiendo), dejar pasar el mensaje
    }
  }

  if (
    MENU_MAIN_OPTIONS.includes(userInput) &&
    session?.step &&
    session.step !== "browsing"
  ) {
    await clearCart(supabase, phoneNumber);
  }

  // Tap a botón date_/time_ de una lista VIEJA (fuera de awaiting_datetime) —
  // Milagros …9602 (15-ago): reabrió el chat 2 días después y tocó el selector
  // de fecha de la sesión anterior (WhatsApp deja los botones tocables aunque
  // sean viejos). El gate de abajo exige step==="awaiting_datetime", así que
  // el ID caía sin dueño hasta el fallback genérico (sendMenuWithPromos),
  // mostrando el menú principal en vez de reconocer la fecha — "se enreda con
  // el reply". Si hay carrito activo, retomar el flujo con esa fecha/hora; si
  // no, avisar que el calendario venció en vez de responder algo genérico.
  if (
    session?.step !== "awaiting_datetime" &&
    (userInput.startsWith(WA_IDS.DATE_PREFIX) ||
      userInput.startsWith(WA_IDS.TIME_PREFIX) ||
      userInput.startsWith(WA_IDS.TIME_PAGE_PREFIX))
  ) {
    if (sessionHasCart(session ?? null)) {
      await upsertSession(supabase, phoneNumber, { step: "awaiting_datetime" });
      session = (await getSession(supabase, phoneNumber)) ?? session;
    } else {
      await sendMessage(
        phoneNumber,
        "Ese calendario ya no está activo 💜 Cuéntame qué servicio te gustaría agendar y te muestro las fechas disponibles.",
      );
      await sendMenuWithPromos(phoneNumber, supabase);
      return;
    }
  }

  // Melisa …9414 (27-sep-2026): Haiku cotizó "Baby Vol. Tecnológica 3D" y
  // preguntó "¿Te agendo este servicio?" (pending_price_cta_service_id), pero
  // la clienta confirmó tocando directamente fecha/hora en la lista
  // interactiva en vez de responder texto. tryAcceptPendingPriceCta() solo se
  // dispara con texto libre (!interactiveId && messageText más abajo) — sin
  // este bloque, el tap de fecha/hora agendaba el servicio VIEJO del carrito
  // en vez del recién cotizado. Aplicarlo ANTES de leer session.serviceIds.
  if (
    interactiveId &&
    (userInput.startsWith(WA_IDS.DATE_PREFIX) ||
      userInput.startsWith(WA_IDS.TIME_PREFIX) ||
      userInput.startsWith(WA_IDS.TIME_PAGE_PREFIX))
  ) {
    const ctaApplied = await applyPendingPriceCtaBeforeDatetimeTap({
      supabase,
      phoneNumber,
      catalog,
      session: session as {
        pending_price_cta_service_id?: string | null;
        pending_price_cta_at?: string | null;
        cartItems?: CartItem[];
      } | null,
    });
    if (ctaApplied) {
      session = (await getSession(supabase, phoneNumber)) ?? session;
    }
  }

  if (
    session?.step === "awaiting_datetime" &&
    !MENU_MAIN_OPTIONS.includes(userInput) &&
    !(CART_NAV_IDS as readonly string[]).includes(userInput)
  ) {
    // Imagen durante selección de fecha/hora → no menú; reenviar calendario
    if (msgType === "image" || msgType === "sticker") {
      await sendMessage(
        phoneNumber,
        "Para terminar tu cita, elige el *día* o la *hora* con los botones de abajo 💜",
      );
      await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
      return;
    }

    // Ubicación mid-agenda (Eli: "Donde queda?" mientras elige día).
    // Batch 3: pregunta pura → Maps (LION …9087 "dirección de la sede" es
    // isMostly=true). Mixto ("dónde queda y el lifting cuánto") → Haiku
    // primero, sin reenviar el selector; Maps de respaldo.
    if (matchesLocationQuestion(lower)) {
      const locResult = await handleLocationQuestion({
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
        wabaConfig,
        haikuRuntime,
        session: session ?? null,
        prompt: messageText,
        locLower: lower,
        ubicacionText,
        skipHaiku: Boolean(interactiveId) || isMostlyLocationQuestion(lower),
        requireClaim: true,
      });
      if (locResult === "maps") {
        const { resumeCompanionAskIfNeeded } = await import(
          "./party-booking.ts"
        );
        const asked = await resumeCompanionAskIfNeeded(
          supabase,
          phoneNumber,
          catalog,
        );
        if (!asked && sessionHasCart(session) && session) {
          await resendDatetimeSelectors(
            phoneNumber,
            supabase,
            session,
            catalog,
            {
              debounce: false,
            },
          );
        }
      }
      return;
    }

    // Movilidad/estacionamiento mid-agenda (Milagros …9602)
    if (matchesParkingOrMovilidadQuestion(lower)) {
      await sendMessage(phoneNumber, DEFAULT_ESTACIONAMIENTO_TEXT);
      if (sessionHasCart(session)) {
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog, {
          debounce: false,
        });
      }
      return;
    }

    if (matchesRetiroInfoQuestion(lower)) {
      await sendMessage(phoneNumber, retiroOtroSalonText);
      if (isMostlyRetiroInfoQuestion(lower)) {
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
        return;
      }
    }

    // Tap "Agendar cita" o texto agendar con carrito — reenviar calendario (no silencio)
    if (userInput === WA_IDS.AGENDAR_YA && sessionHasCart(session ?? null)) {
      await proceedToBookingWithCurrentCart(
        supabase,
        phoneNumber,
        session ?? null,
        catalog,
      );
      return;
    }

    // Lista vieja svc_/pack_ mid-agenda (Jessi …6106 / Bu …0782) — swap carrito
    if (
      await trySwapCartFromStaleCatalogTap({
        supabase,
        phoneNumber,
        catalog,
        session: session as {
          cartItems?: CartItem[];
          selected_day?: string | null;
          selected_date?: string | null;
          step?: string;
          serviceIds?: string[];
        } | null,
        userInput,
        isInteractive,
      })
    ) {
      return;
    }

    if (userInput.startsWith(WA_IDS.TIME_PAGE_PREFIX)) {
      const page = parseTimePagePayload(userInput);
      if (page) {
        const sKeep = await getSession(supabase, phoneNumber);
        await upsertSession(supabase, phoneNumber, {
          selected_day: page.dateKey,
          reschedule_appointment_id: sKeep?.reschedule_appointment_id ?? null,
        });
        const fresh = (await getSession(supabase, phoneNumber)) ?? session;
        await resendDatetimeSelectors(
          phoneNumber,
          supabase,
          fresh,
          catalog,
          { debounce: false, pageOffset: page.offset },
        );
        return;
      }
    }

    if (userInput.startsWith(WA_IDS.DATE_PREFIX)) {
      const dateKey = userInput.slice(WA_IDS.DATE_PREFIX.length);
      const sKeep = await getSession(supabase, phoneNumber);
      await upsertSession(supabase, phoneNumber, {
        selected_day: dateKey,
        reschedule_appointment_id: sKeep?.reschedule_appointment_id ?? null,
      });
      const serviceIds = session.serviceIds ?? [];
      const validSvcs = serviceIds
        .map((id: string) => catalog.servicesById.get(id))
        .filter(Boolean) as { duration: number }[];
      const totalDuration = validSvcs.reduce(
        (a: number, s: { duration: number }) => a + s.duration,
        0,
      );
      const cap = overlapCapForCart(serviceIds, catalog);
      const empIds = Object.values(session.employeeAssignments ?? {}).filter(
        Boolean,
      ) as string[];
      const minEmployeesFree = 1;
      await sendTimeSelector(
        phoneNumber,
        supabase,
        dateKey,
        empIds.length ? empIds : ((
          await supabase
            .from("employees")
            .select("id")
            .eq("is_active", true)
        ).data?.map((e: { id: string }) => e.id) ?? []),
        totalDuration,
        cap,
        minEmployeesFree,
        catalog,
        serviceIds,
      );
      return;
    }

    // Texto libre durante selección de fecha/hora
    if (!interactiveId && messageText.trim()) {
      // Pam 16-jul: "3,30 me viene bien" + pregunta en el mismo turno.
      // Si hay hora parseable + selected_day → cerrar cita ANTES de Haiku
      // (Haiku inventaba "¡Listo! Te esperamos" sin crear appointment).
      const slotInText = parseTimeSlot(messageText);
      if (
        slotInText !== null &&
        isMostlyTimeChoice(messageText) &&
        getSessionSelectedDay(session as Record<string, unknown>)
      ) {
        const fastDoneEarly = await tryCompleteBookingFromText(
          supabase,
          phoneNumber,
          messageText,
          session ?? null,
          catalog,
        );
        if (fastDoneEarly) return;
      }

      const promoOrPriceQuestion = [
        "promo",
        "precio",
        "cuánto",
        "cuanto",
        "descuento",
        "hay alguna",
        "pack",
        "oferta",
        "rebaja",
        "incluye",
        "combina",
        "ambas",
        "ambos",
        "las dos",
        "los dos",
        "por ambas",
        "por los dos",
        // Alcance del servicio en carrito (Yesenia: "cualquier diseño", retoque)
        "diseño",
        "diseno",
        "color",
        "retoque",
        "retiro",
        "builder",
        "rubber",
        "servicio",
        "igual",
        "cobrar",
        "cobro",
        "foto",
        "fotos",
        "modelo",
        "modelos",
        "trabajo",
        "trabajos",
        "ejemplo",
        "ejemplos",
        "portafolio",
        // Cambio de servicio mid-agenda (Patricia: esmalte / manicure)
        "esmalte",
        "manicure",
        "pedicure",
      ].some((k) => lower.includes(k)) ||
        /\bhoy\b|\bmanana\b|\bmañana\b|\bquisiera\b/i.test(messageText) ||
        (/\?/.test(messageText) && parseTimeText(messageText) === null);

      // UNANSWERED_PRICE: "cuánto es / el total" con carrito → resumen S/ (no solo Haiku vacío)
      const cartForPrice = session?.cartItems ?? [];
      const asksOwnCartPrice = cartForPrice.length > 0 &&
        !matchesServiceChangeIntent(messageText) &&
        /\b(cu[aá]nto|precios?|costo|cuesta|total|vale|sale)\b/i.test(lower) &&
        messageText.trim().length <= 48 &&
        !/\b(lifting|cejas|extensiones|microblading|depilaci[oó]n|otro|otra)\b/i
          .test(
            lower,
          );
      if (asksOwnCartPrice) {
        const { cartItemsToDisplayLabel } = await import("../lib/supabase.ts");
        const label = await cartItemsToDisplayLabel(supabase, cartForPrice);
        const total = cartForPrice.reduce(
          (a: number, i: { price: number; quantity: number }) =>
            a + (Number(i.price) || 0) * (i.quantity || 1),
          0,
        );
        await sendMessage(
          phoneNumber,
          `Tu selección:\n🌸 ${label.replace(/ \+ /g, "\n🌸 ")}\n\n*Total: S/ ${
            total.toFixed(0)
          }*\n\n📅 ¿Qué día y hora te quedan bien?`,
        );
        await resendDatetimeSelectors(phoneNumber, supabase, session!, catalog);
        return;
      }

      // Jessi …6106: nombra otra categoría (cejas/manicure) con Pack VIP en carrito
      // → no dejar que Haiku cotice otro pack a ciegas; aclarar conflicto.
      // Alberto VE …0417: "qué tienes para las uñas" / "quiero agregar" NO debe
      // spamear "Ver fechas" (debounce:false) — abrir catálogo o aclarar sin lista.
      if (
        mentionsConflictingCatalogMidCart(
          messageText,
          session as {
            cartItems?: CartItem[];
            serviceIds?: string[];
          } | null,
          catalog,
        )
      ) {
        const { cartItemsToDisplayLabel } = await import("../lib/supabase.ts");
        const cartItems = session?.cartItems ?? [];
        const label = await cartItemsToDisplayLabel(supabase, cartItems);
        const total = cartItems.reduce(
          (a: number, i: { price: number; quantity: number }) =>
            a + (Number(i.price) || 0) * (i.quantity || 1),
          0,
        );
        if (matchesMidAgendaBrowseOrAddIntent(messageText)) {
          // Alberto VE …0417 (13-sep, PR #119 en vivo): "también quisiera
          // extensiones" es una consulta real (precio/info), no solo un tap
          // de menú — responder con Haiku (precio + oferta de agregar) en vez
          // de saltar directo al catálogo crudo. Catálogo como respaldo si
          // Haiku no está disponible (rate-limit / flag off).
          const handed = await tryHandOffUnrecognizedToHaiku({
            phoneNumber,
            contactName,
            catalog,
            supabase,
            phoneCountry,
            wabaConfig,
            haikuRuntime,
            session: session ?? null,
            prompt: messageText,
          });
          if (handed) return;
          await upsertSession(supabase, phoneNumber, {
            step: "browsing",
            selected_day: null,
            parsed_datetime: null,
          });
          await sendMessage(
            phoneNumber,
            `Tienes en selección:\n🌸 ${
              label.replace(/ \+ /g, "\n🌸 ")
            }\n\n*Total: S/ ${total.toFixed(0)}*\n\n` +
              `Te muestro el catálogo para *agregar* (o escribe *cambiar a …* si quieres reemplazar) 👇`,
          );
          await sendCategoriesAndPromosListFromCatalog(
            phoneNumber,
            catalog.categories,
            catalog.promotions.length > 0,
          );
          return;
        }
        // Plan 13-sep "Haiku-primero informativo": si la frase no matchea
        // matchesMidAgendaBrowseOrAddIntent, no asumir que es ruido — puede
        // ser una pregunta real (efecto, precio) que ese regex nunca va a
        // cubrir por completo. Intentar Haiku antes del boilerplate; el
        // boilerplate queda como respaldo si Haiku falla/rate-limited.
        const handedUnmatched = await tryHandOffUnrecognizedToHaiku({
          phoneNumber,
          contactName,
          catalog,
          supabase,
          phoneCountry,
          wabaConfig,
          haikuRuntime,
          session: session ?? null,
          prompt: messageText,
        });
        if (handedUnmatched) return;
        await sendMessage(
          phoneNumber,
          `Ahora tienes en tu selección:\n🌸 ${
            label.replace(/ \+ /g, "\n🌸 ")
          }\n\n*Total: S/ ${total.toFixed(0)}*\n\n` +
            `Si quieres *agregar* otro servicio, escribe *agregar*.\n` +
            `Si quieres *cambiar* lo del carrito, escribe p. ej. *cambiar a manicure*.\n` +
            `Si sigues con esto, elige *día u hora* con los botones de abajo 👇`,
        );
        // No forzar lista nueva: el selector reciente sigue usable (anti-spam …0417).
        return;
      }

      // Corrección de día en texto libre ("no domingo", "mañana es sábado no
      // domingo") — antes de Haiku: Haiku no puede tocar selected_day y solo
      // devolvía una disculpa mientras resendDatetimeSelectors repetía el
      // mismo selector viejo (caso Angie 14/15-ago).
      // Si trae hora ("mejor mañana a las 3pm"), intentar cerrar la cita
      // aquí — no caer a Haiku (promoOrPriceQuestion matchea "mañana").
      if (matchesDateCorrectionIntent(messageText)) {
        const correctedIntent = messageMentionsCalendarDate(messageText)
          ? await stickySelectedDayFromText(
            supabase,
            phoneNumber,
            messageText,
            session,
          )
          : null;
        if (!correctedIntent) {
          // Corrección sin fecha concreta ("No domingo!!") — no adivinar:
          // limpiar selected_day y volver a mostrar el calendario de 7 días.
          // Solo selected_day (no existe columna selected_date en BD).
          await upsertSession(supabase, phoneNumber, {
            selected_day: null,
          });
        }
        session = (await getSession(supabase, phoneNumber)) ?? session;
        if (hasExplicitTime(messageText)) {
          const booked = await tryCompleteBookingFromText(
            supabase,
            phoneNumber,
            messageText,
            session ?? null,
            catalog,
          );
          if (booked) return;
        }
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
        return;
      }

      if (promoOrPriceQuestion || matchesServiceChangeIntent(messageText)) {
        if (await wasSlotTakenRecentlySent(supabase, phoneNumber)) {
          console.log(
            "[WABA] skip Haiku mid-datetime: SLOT_TAKEN reciente",
            phoneNumber.slice(-4),
          );
          await resendDatetimeSelectors(
            phoneNumber,
            supabase,
            session,
            catalog,
          );
          return;
        }
        const haikuKeywordsDt = getHaikuTriggerKeywordsFromWaba(wabaConfig);
        const triggerDt = detectAITrigger(messageText, haikuKeywordsDt) ?? {
          type: "free_question" as const,
          originalMessage: messageText,
        };
        if (
          !(await isAIRateLimited(
            supabase,
            phoneNumber,
            haikuRuntime.rate_limit_per_hour,
          ))
        ) {
          const handledDt = await handleAIMessage(
            { phoneNumber, contactName, catalog, supabase, phoneCountry },
            triggerDt,
            wabaConfig,
          );
          if (handledDt) {
            if (!shouldSkipDatetimeResendAfterHaiku(messageText)) {
              await resendDatetimeSelectors(
                phoneNumber,
                supabase,
                session,
                catalog,
              );
            }
            return;
          }
        }
      }

      const fastDone = await tryCompleteBookingFromText(
        supabase,
        phoneNumber,
        messageText,
        session ?? null,
        catalog,
      );
      if (fastDone) return;

      if (matchesOpenHoursQuestion(lower)) {
        // Plan 13-sep "Haiku-primero informativo" Batch 2: "hasta qué hora
        // cierran" solo (isMostly=true) sigue con el texto estático rápido;
        // si trae algo más ("hasta qué hora atienden para lifting mañana")
        // intentar Haiku antes — el estático queda de respaldo si falla.
        if (
          !interactiveId &&
          !isMostlyOpenHoursQuestion(lower) &&
          (await tryHandOffUnrecognizedToHaiku({
            phoneNumber,
            contactName,
            catalog,
            supabase,
            phoneCountry,
            wabaConfig,
            haikuRuntime,
            session: session ?? null,
            prompt: messageText,
          }))
        ) {
          return;
        }
        await sendMessage(phoneNumber, horariosText);
        await sendMessage(
          phoneNumber,
          "Cuando elijas hora, usa los botones de abajo o escribe por ejemplo *4 de la tarde* 💜",
        );
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
        return;
      }

      const parsedSlot = parseTimeSlot(messageText);
      if (parsedSlot !== null && isMostlyTimeChoice(messageText)) {
        const selectedDay = getSessionSelectedDay(
          session as Record<string, unknown>,
        );
        if (selectedDay) {
          const [y, mo, d] = selectedDay.split("-").map(Number);
          const dayOfWeek = new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay();
          if (
            isValidSalonSlot(
              parsedSlot.hour,
              parsedSlot.minute,
              dayOfWeek,
              selectedDay,
            )
          ) {
            userInput = buildTimeInputFromParsedHour(
              selectedDay,
              parsedSlot.hour,
              parsedSlot.minute,
            );
            // cae al bloque TIME_PREFIX abajo
          } else {
            const cartIds = (session?.serviceIds ?? []) as string[];
            const durHint = cartIds.reduce((a, id) => {
              const s = catalog.servicesById.get(id);
              return a + (s?.duration ?? 60);
            }, 0) || 60;
            const capHint = overlapCapForCart(cartIds, catalog);
            await sendMessage(
              phoneNumber,
              `Las ${
                formatHour12(parsedSlot.hour, parsedSlot.minute)
              } está fuera de nuestro horario 🕐\n\n` +
                `${formatHoursHint(selectedDay, dayOfWeek)}\n\n` +
                `Horarios con cupo: ${await formatAvailableHours(
                  supabase,
                  selectedDay,
                  durHint,
                  undefined,
                  capHint,
                  catalog,
                  cartIds,
                )}\n\n` +
                `Elige uno de los botones de abajo 👇`,
            );
            await resendDatetimeSelectors(
              phoneNumber,
              supabase,
              session,
              catalog,
            );
            return;
          }
        }
      }
    }

    if (userInput.startsWith(WA_IDS.TIME_PREFIX)) {
      const raw = userInput.slice(WA_IDS.TIME_PREFIX.length);
      const [datePart, timePart] = raw.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const hourLima = parseInt(timePart.slice(0, 2), 10);
      const minuteLima = parseInt(timePart.slice(2, 4) || "00", 10);
      const chosenDate = new Date(
        Date.UTC(
          year,
          month - 1,
          day,
          hourLima + LIMA_UTC_OFFSET_HOURS,
          minuteLima,
          0,
        ),
      );
      const sessionFresh = await getSession(supabase, phoneNumber);
      const rescheduleApptId = sessionFresh?.reschedule_appointment_id;
      if (rescheduleApptId) {
        await finalizeRescheduleAppointment(
          supabase,
          phoneNumber,
          rescheduleApptId,
          chosenDate,
          catalog,
        );
        return;
      }

      let serviceIds = session.serviceIds ?? [];
      let validServices = serviceIds
        .map((id: string) => catalog.servicesById.get(id))
        .filter(Boolean);
      if (validServices.length === 0) {
        // Haiku-first: el listado de categorías es fallback, no respuesta.
        // Si Haiku ya cotizó una oferta, la recuperamos y seguimos con la
        // hora que acaba de tocar (mismo cierre que un tap con carrito).
        const { recoverCartFromQuotedOffer } = await import(
          "../lib/pending-price-cta.ts"
        );
        if (
          await recoverCartFromQuotedOffer(supabase, phoneNumber, catalog)
        ) {
          session = (await getSession(supabase, phoneNumber)) ?? session;
          serviceIds = session.serviceIds ?? [];
          validServices = serviceIds
            .map((id: string) => catalog.servicesById.get(id))
            .filter(Boolean);
        }
        if (validServices.length === 0) {
          await clearCart(supabase, phoneNumber);
          await sendMessage(
            phoneNumber,
            "Se me cruzó tu selección 🙏 Cuéntame qué servicio te gustaría agendar y lo dejamos listo 💜",
          );
          return;
        }
      }

      const totalDurationPick = (
        validServices as { duration?: number }[]
      ).reduce((a, s) => a + (s.duration ?? 60), 0);
      let capPick = overlapCapForCart(serviceIds, catalog);
      // Party same-slot: necesitamos 2 sillas → exigir overlapping como si cap-1
      {
        const { parsePartyBooking } = await import("../lib/party-booking.ts");
        const partyNow = parsePartyBooking(
          (sessionFresh as { party_booking?: string | null })?.party_booking,
        );
        if (
          partyNow?.mode === "together" &&
          partyNow.slot_strategy === "same" &&
          (partyNow.collecting === "datetime_primary" ||
            partyNow.collecting === "ready")
        ) {
          capPick = Math.max(1, capPick - 1);
        }
      }
      const { partyCreatingCount, parsePartyBooking: parseParty } =
        await import("../lib/party-booking.ts");
      const partyForBlock = parseParty(
        (sessionFresh as { party_booking?: string | null })?.party_booking,
      );
      const blockedPick = await shouldBlockAdditionalBooking(
        supabase,
        phoneNumber,
        {
          creatingCount: partyForBlock?.collecting === "ready" ||
              (partyForBlock?.mode === "together" &&
                partyForBlock.slot_strategy === "same" &&
                partyForBlock.collecting === "datetime_primary")
            ? partyCreatingCount({
              ...partyForBlock!,
              collecting: "ready",
            })
            : 1,
        },
      );
      const overlapsPick = !blockedPick &&
        (await newBookingOverlapsExisting(
          supabase,
          phoneNumber,
          chosenDate,
          totalDurationPick,
        ));
      if (blockedPick || overlapsPick) {
        await sendMessage(
          phoneNumber,
          blockedPick
            ? ADDITIONAL_BOOKING_BLOCK_MESSAGE
            : BOOKING_OVERLAP_MESSAGE,
        );
        return;
      }

      // Capacidad: Vanessa (especial) y/o carriles Stephani/Karelis.
      if (
        !(await hasSlotCapacityForServices(
          supabase,
          catalog,
          chosenDate,
          totalDurationPick,
          serviceIds,
          capPick,
        ))
      ) {
        await sendMessage(
          phoneNumber,
          `Horarios con cupo: ${await formatAvailableHours(
            supabase,
            datePart,
            totalDurationPick,
            undefined,
            overlapCapForCart(serviceIds, catalog),
            catalog,
            serviceIds,
          )}\n\nElige uno de los botones de abajo 👇`,
        );
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
        return;
      }

      const dayOfWeekPick = new Date(
        Date.UTC(year, month - 1, day, 12),
      ).getUTCDay();
      if (!isValidSalonSlot(hourLima, minuteLima, dayOfWeekPick, datePart)) {
        await sendMessage(
          phoneNumber,
          `Ese horario (${
            formatHour12(hourLima, minuteLima)
          }) está fuera de nuestro horario 🕐\n\n` +
            `${formatHoursHint(datePart, dayOfWeekPick)}\n\n` +
            `Horarios con cupo: ${await formatAvailableHours(
              supabase,
              datePart,
              totalDurationPick,
              undefined,
              overlapCapForCart(serviceIds, catalog),
              catalog,
              serviceIds,
            )}`,
        );
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
        return;
      }

      const { onPartyDatetimeChosen } = await import("./party-booking.ts");
      const partyResult = await onPartyDatetimeChosen(
        supabase,
        phoneNumber,
        chosenDate,
      );
      if (!partyResult.finalize) return;

      await finalizeBookingAfterDatetimeSelection(
        supabase,
        phoneNumber,
        chosenDate,
        datePart,
      );
      return;
    }

    // Usuario escribió texto no reconocible
    if (messageText.trim()) {
      const pendDt = await getPendingAppointmentsForPhone(
        supabase,
        phoneNumber,
      );
      if (
        pendDt.length > 0 &&
        (textImpliesExistingAppointment(messageText) ||
          matchesTimeCorrectionIntent(messageText))
      ) {
        await sendPendingAppointmentContext(phoneNumber, supabase, pendDt);
        return;
      }

      if (isSessionStale(session)) {
        await sendMessage(
          phoneNumber,
          "💜 Retomemos tu cita — ya tienes servicios en tu selección. Elige fecha u hora con los botones de abajo 👇",
        );
        await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
        return;
      }

      // Antes del fallback rígido: Haiku para aclaraciones de servicio
      // (diseño, retoque, alcance) que no matchearon keywords arriba.
      if (!isMostlyTimeChoice(messageText)) {
        if (await wasSlotTakenRecentlySent(supabase, phoneNumber)) {
          console.log(
            "[WABA] skip Haiku fallback-datetime: SLOT_TAKEN reciente",
            phoneNumber.slice(-4),
          );
          await resendDatetimeSelectors(
            phoneNumber,
            supabase,
            session,
            catalog,
          );
          return;
        }
        const haikuKeywordsFb = getHaikuTriggerKeywordsFromWaba(wabaConfig);
        const triggerFb = detectAITrigger(messageText, haikuKeywordsFb) ?? {
          type: "free_question" as const,
          originalMessage: messageText,
        };
        if (
          !(await isAIRateLimited(
            supabase,
            phoneNumber,
            haikuRuntime.rate_limit_per_hour,
          ))
        ) {
          const handledFb = await handleAIMessage(
            { phoneNumber, contactName, catalog, supabase, phoneCountry },
            triggerFb,
            wabaConfig,
          );
          // Fix 13-sep (Alberto VE …0417): NO reenviar el selector de fecha/
          // hora justo después de que Haiku ya respondió — reusaba el
          // `session` cargado antes de la posible mutación de `selected_day`
          // dentro de `handleAIMessage` (mostraba el calendario de 7 días en
          // vez de las horas del día ya elegido) y, aun sin ese bug, tirar
          // otra burbuja con botones justo después de la respuesta no le da
          // chance a la clienta de contestar. Los botones ya enviados antes
          // en el flujo siguen activos; si escribe de nuevo, este mismo
          // bloque la atiende.
          if (handledFb) {
            return;
          }
        }
      }

      await sendMessage(
        phoneNumber,
        "Para elegir la hora, usa los *botones* de abajo o escribe por ejemplo *10 am* o *4 de la tarde* 💜",
      );
      await resendDatetimeSelectors(phoneNumber, supabase, session, catalog);
      return;
    }
    return;
  }

  if (
    session?.step &&
    session.step !== "browsing" &&
    !matchesCancelCitaIntent(lower) &&
    (lower.includes("cancelar") || lower.includes("menu"))
  ) {
    await clearCart(supabase, phoneNumber);
    await sendMessage(
      phoneNumber,
      "Flujo cancelado. ¿En qué más podemos ayudarte?",
    );
    await sendMenuWithPromos(phoneNumber, supabase);
    return;
  }

  if (!userInput) return;

  rt.session = session;
  rt.userInput = userInput;
  rt.lower = userInput.toLowerCase();
  rt.interactiveId = interactiveId ?? null;
  rt.isInteractive = Boolean(isInteractive);

  // Party: taps de modo (juntas / solo otra)
  {
    const { isPartyModeTap } = await import("../lib/party-booking.ts");
    if (isPartyModeTap(userInput)) {
      const { handlePartyModeTap } = await import("./party-booking.ts");
      if (await handlePartyModeTap(supabase, phoneNumber, userInput)) return;
    }
  }

  if (await tryHandleMenuTaps(rt)) return;
  session = rt.session;

  // ── Tardanzas / llegada: solo con cita scheduled (Sofia …8962) ─────────────
  if (!isInteractive && messageText.trim()) {
    if (matchesTardanzaIntent(messageText)) {
      const pendingArrival = await getPendingAppointmentsForPhone(
        supabase,
        phoneNumber,
      );
      if (pendingArrival.length === 0) {
        await sendMessage(
          phoneNumber,
          NO_CONFIRMED_APPOINTMENT_ARRIVAL_MESSAGE,
        );
        return;
      }
      await sendTardanzaPolicy({
        supabase,
        phone: phoneNumber,
        text: tardanzaText,
        imageUrl: tardanzaImageUrl,
        sendMessage,
        sendImage,
      });
      return;
    }
  }

  // Cierre natural ("Nos vemos!!", "Gracias") — no Haiku ni 932.
  // Si hay pregunta/lista OUT reciente, no cortar: dejar caer a Haiku
  // (Loren …4648 — "Gracias" tras ¿qué servicio? → no «¡Nos vemos!»).
  if (
    !isInteractive &&
    messageText.trim() &&
    matchesNaturalClosingIntent(messageText) &&
    !(await hasRecentOutboundPendingPrompt(supabase, phoneNumber))
  ) {
    await sendMessage(phoneNumber, "¡Nos vemos! 💜");
    return;
  }

  // Intentar IA para texto libre en sesión browsing (o sin step activo)
  if (!session?.step || session.step === "browsing") {
    const haikuKeywords = getHaikuTriggerKeywordsFromWaba(wabaConfig);
    let trigger = detectAITrigger(
      userInput || messageText,
      haikuKeywords,
      sessionHasCart(session ?? null),
    );
    // Batch 4: remap no_match + detectAITrigger null (ej. "reserva para
    // pestañas", o un "sí"/"no"/"ya?"/"hola" que el gate de ≤3 chars y
    // saludos cortos descarta) no cae al menú genérico — Haiku primero.
    // Taps/IDs y un número solo ("3") siguen afuera.
    if (
      !trigger &&
      !interactiveId &&
      !isInteractive &&
      messageText.trim().length > 0 &&
      !/^\d+$/.test(messageText.trim())
    ) {
      trigger = {
        type: "fallback",
        originalMessage: messageText.trim(),
      };
    }
    if (
      trigger &&
      !(await isAIRateLimited(
        supabase,
        phoneNumber,
        haikuRuntime.rate_limit_per_hour,
      ))
    ) {
      const aiCtx = {
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
      };
      let handled = await handleAIMessage(aiCtx, trigger, wabaConfig);
      // Haiku-first: un timeout/error transitorio (Vane Pernia …3993, 6-oct-2026:
      // "Perfecto\nSi" → sin llamada registrada → 932) no debe mandar a la
      // clienta al staff; un reintento antes del fallback estático.
      if (!handled && trigger.type === "fallback") {
        handled = await handleAIMessage(aiCtx, trigger, wabaConfig);
      }
      if (handled) {
        // Haiku sí resolvió — corta la racha de fallos si venía contando.
        if (session?.haiku_fallback_count) {
          await upsertSession(supabase, phoneNumber, {
            haiku_fallback_count: 0,
          });
        }
        return;
      }

      // Haiku no respondió (timeout/error) a una pregunta de texto libre no
      // reconocida — no caer en el menú genérico de promos, que no responde
      // a la duda. Remitir al equipo para no dejar a la clienta sin respuesta.
      // Excepción: cierres naturales (por si detectAITrigger no los filtró).
      // Mismo guard que el atajo de arriba: no cerrar sobre prompt pendiente.
      if (trigger.type === "fallback") {
        if (
          matchesNaturalClosingIntent(trigger.originalMessage) &&
          !(await hasRecentOutboundPendingPrompt(supabase, phoneNumber))
        ) {
          await sendMessage(phoneNumber, "¡Nos vemos! 💜");
          return;
        }
        // Sin Haiku tras reintento: afirmación suelta ("Si", "Perfecto") tras una
        // pregunta del bot → categorías, no 932.
        if (
          clientTypedPortion(trigger.originalMessage)
            .split(/\n+/)
            .every((l) => isShortAffirmativeText(l.replace(/[!¡.,\s]+$/g, "")))
        ) {
          await sendMessage(
            phoneNumber,
            "Te dejo las categorías para que elijas lo que te interesa 💜",
          );
          await sendCategoriesList(phoneNumber, catalog.categories);
          return;
        }
        // Sin Haiku (crédito/timeout): si huele a catálogo, menú en vez de 932
        // (Fanny rubber, Karim gel, Alejandra manicure, Rosa "este me interesa").
        if (looksLikeServiceBrowseIntent(trigger.originalMessage)) {
          await sendMessage(
            phoneNumber,
            "Te dejo las categorías para que elijas lo que te interesa 💜",
          );
          await sendCategoriesList(phoneNumber, catalog.categories);
          return;
        }

        // 3 fallos seguidos de Haiku (sep-2026): pausar el bot, avisar a la
        // clienta que es una IA (evita seguir "hablándole" a un bot pausado
        // creyendo que es una persona) y notificar al staff por push.
        const { nextCount, shouldPause } = nextHaikuFallbackState(
          session?.haiku_fallback_count as number | undefined,
        );
        if (shouldPause) {
          await upsertSession(supabase, phoneNumber, {
            bot_paused_at: new Date().toISOString(),
            haiku_fallback_count: nextCount,
          });
          await sendMessage(
            phoneNumber,
            `Disculpa, veo que no te estoy entendiendo bien 🙏 Soy un asistente automatizado 🤖 y en este momento no logro ayudarte con esto. Te voy a comunicar directo con nuestro equipo al 📱 *${STAFF_COORDINATION_PHONE}* para que te atiendan mejor.`,
          );
          const firstName = (contactName || "Clienta").trim().split(/\s+/)[0];
          await notifyAdmins(
            supabase,
            "🤖⏸️ Bot en pausa · fallos repetidos",
            `${firstName}: remitida al ${STAFF_COORDINATION_PHONE}, bot en pausa.`,
            {
              type: "waba_chat",
              reason: "auto_pause_fallback",
              phone: phoneNumber,
              client_name: firstName.slice(0, 80),
              url: `${WABA_PANEL_BASE}?phone=${
                encodeURIComponent(phoneNumber)
              }`,
            },
          );
          return;
        }

        await upsertSession(supabase, phoneNumber, {
          haiku_fallback_count: nextCount,
        });
        await sendMessage(
          phoneNumber,
          `No estoy segura de poder ayudarte con eso 🙏 Escríbenos directo a nuestro equipo al 📱 *${STAFF_COORDINATION_PHONE}* y con gusto te orientamos.`,
        );
        return;
      }
    }
  }

  // Fallback final: menú o Mi cita si ya tiene reserva activa
  const pendFallback = await getPendingAppointmentsForPhone(
    supabase,
    phoneNumber,
  );
  if (pendFallback.length > 0) {
    await sendMessage(
      phoneNumber,
      "¿En qué más te ayudo con tu cita? Usa *Mi cita* para ver el resumen o cambiar fecha/hora 💜",
    );
    await sendMiCitaMenu(phoneNumber, supabase);
    return;
  }
  await sendMenuWithPromos(phoneNumber, supabase);
}
