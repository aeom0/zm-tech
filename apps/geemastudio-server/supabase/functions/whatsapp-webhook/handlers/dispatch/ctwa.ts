// ctwa.ts — Interés CTWA, lista stale, entrada Meta Ads (Plan 08)

import { sendTypingIndicator } from "../../wa-api.ts";
import { addressWithoutHello } from "../../lib/client-address.ts";
import {
  coalesceRecentInboundText,
  tryClaimLocationSend,
} from "../../lib/inbound-gate.ts";
import {
  getInteractiveId,
  isMetaAdsTestMessage,
} from "../../lib/parse-message.ts";
import {
  getSession,
  markSessionFromAd,
  upsertSession,
} from "../../lib/supabase.ts";
import {
  isKnownCtwaCampaignCopy,
  isMetaAdsBoilerplateCta,
  splitCtwaBoilerplateAndIntent,
} from "../../lib/meta-ads-cta.ts";
import {
  isMostlyLocationQuestion,
  isSessionStale,
  matchesLocationQuestion,
  sessionHasCart,
} from "../booking-flow.ts";
import { sendMenuWithPromos } from "../menu.ts";
import {
  detectAITrigger,
  generateWelcomeGreeting,
  getFallbackGreeting,
  handleAIMessage,
  isAIRateLimited,
} from "../ai-assistant.ts";
import { getHaikuTriggerKeywordsFromWaba } from "../../lib/waba-config.ts";
import { getPendingAppointmentsForPhone } from "../pending-appointment.ts";
import {
  handleLocationQuestion,
  tryHandOffUnrecognizedToHaiku,
} from "./haiku-handoff.ts";
import {
  type CampaignPromoImage,
  sendCampaignImagesIfAny,
} from "./campaign-images.ts";
import { hadRecentBotOutbound } from "./cart-booking.ts";
import { SALUDOS } from "./menu-ids.ts";
import type { DispatchRuntime } from "./runtime.ts";

export const AWAITING_CTWA_INTEREST = "awaiting_ctwa_interest";

async function sendCtwaInterestQuestion(
  rt: DispatchRuntime,
  to: string,
  firstName = "",
): Promise<void> {
  const message = rt.ctx.message;
  const wamid = typeof message.id === "string" ? message.id : undefined;
  if (wamid) await sendTypingIndicator(wamid);
  const greeting = firstName
    ? `¡Hola, ${firstName}! 💜 Bienvenida a ZM Lash & Nails Beauty.\n¿Qué servicio te interesa hoy: extensiones, lifting, uñas u otro? Cuéntame y te paso precios y opciones 😊`
    : `¡Hola! 💜 Bienvenida a ZM Lash & Nails Beauty.\n¿Qué servicio te interesa hoy: extensiones, lifting, uñas u otro? Cuéntame y te paso precios y opciones 😊`;
  await rt.senders.sendMessage(to, greeting);
}

function effectHintsFromCaptions(captions: string[]): string {
  const known = [
    "Mega Volumen",
    "Fox",
    "Hawaiana",
    "Wispy",
    "Ánime",
    "Anime",
    "Rimel",
    "Rímel",
    "VT 3D",
    "VT 4D",
    "Ardilla",
    "Ojo de Gato",
    "Ojo abierto",
    "Clásicas",
    "Baby Vol",
    "Muñeca",
  ];
  const joined = captions.join(" ");
  const found: string[] = [];
  for (const k of known) {
    if (!new RegExp(k.replace(/\s+/g, "\\s*"), "i").test(joined)) continue;
    const label = /^anime$/i.test(k) ? "Ánime" : k;
    if (found.some((f) => f.toLowerCase() === label.toLowerCase())) continue;
    found.push(label);
    if (found.length >= 6) break;
  }
  return found.join(", ");
}

async function sendCtwaRubroFollowUp(
  rt: DispatchRuntime,
  to: string,
  firstName: string,
  rubro: "extensiones" | "lifting" | "unas" | "otro",
  captions: string[] = [],
): Promise<void> {
  let body: string;
  if (rubro === "extensiones") {
    const examples = effectHintsFromCaptions(captions) ||
      "Mega Volumen, Fox, Hawaiana, Wispy, Ánime, Clásicas";
    body =
      `¿Cuál de estos looks te llama más la atención? ${examples}… Cuéntanos para agendar 💜`;
  } else if (rubro === "lifting") {
    body =
      "¿Qué lifting te gustaría agendar? Solo pestañas, o con diseño de cejas / tinturado / laminado. Cuéntanos y te damos precio y horario 💜";
  } else if (rubro === "unas") {
    body =
      "¿Qué te interesa en uñas: Soft Gel, PolyGel, Builder, manicure o pedicure? Cuéntanos y te cotizamos 💜";
  } else {
    body =
      "¿Qué rubro o servicio te interesa? (cejas, depilación, microblading, uñas, pestañas…). Cuéntanos y te orientamos 💜";
  }
  await rt.senders.sendMessage(
    to,
    addressWithoutHello(firstName || null, body),
  );
}

/**
 * Envía imágenes del rubro (si aplica) + el follow-up de texto correspondiente.
 * Compartido entre el tap fresco (awaiting_ctwa_interest) y el tap sobre una
 * lista CTWA ya stale — la única diferencia entre ambos sitios es que el
 * primero además marca step:"browsing" después (lo hace el caller).
 */
async function sendCtwaRubroReply(
  rt: DispatchRuntime,
  phoneNumber: string,
  firstName: string,
  rubroId: "extensiones" | "lifting" | "unas" | "otro",
  images: CampaignPromoImage[] = [],
): Promise<void> {
  if (images.length > 0) {
    await sendCampaignImagesIfAny(
      rt.ctx.supabase,
      phoneNumber,
      images,
      rt.senders.sendImage,
    );
  }
  await sendCtwaRubroFollowUp(
    rt,
    phoneNumber,
    firstName,
    rubroId,
    images.map((i) => i.caption),
  );
}

export async function tryHandleCtwaInterestStep(
  rt: DispatchRuntime,
): Promise<boolean> {
  const {
    phoneNumber,
    contactName,
    messageText,
    catalog,
    supabase,
    phoneCountry,
    wabaConfig,
    message,
  } = rt.ctx;
  const haikuRuntime = rt.haikuRuntime;
  const {
    ubicacionText,
    extensionesPromoImages,
    liftingPromoImages,
    unasPromoImages,
  } = rt.cms;
  // ── awaiting_ctwa_interest: tap Extensiones / Lifting / Uñas / Otro tras CTWA ──
  if (rt.session?.step === AWAITING_CTWA_INTEREST) {
    const ctwaInterestId = getInteractiveId(message);
    const rawFirstCtwa = contactName.split(" ")[0];
    const firstNameCtwa = /^[+\d]/.test(rawFirstCtwa) ? "" : rawFirstCtwa;

    if (ctwaInterestId === "ctwa_interest_extensiones") {
      await sendCtwaRubroReply(
        rt,
        phoneNumber,
        firstNameCtwa,
        "extensiones",
        extensionesPromoImages,
      );
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      return true;
    }

    if (ctwaInterestId === "ctwa_interest_lifting") {
      await sendCtwaRubroReply(
        rt,
        phoneNumber,
        firstNameCtwa,
        "lifting",
        liftingPromoImages,
      );
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      return true;
    }

    if (ctwaInterestId === "ctwa_interest_unas") {
      await sendCtwaRubroReply(
        rt,
        phoneNumber,
        firstNameCtwa,
        "unas",
        unasPromoImages,
      );
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      return true;
    }

    // Otro (tap) o texto libre: pregunta en texto (sin lista categorías);
    // si el texto tiene intención específica → Haiku (mismo criterio adHasSpecificIntent).
    const freeCtwaText = messageText.trim();
    // "Uñas" normaliza a 4 chars — el gate de longitud (<=4) la trataba como
    // texto vacío/boilerplate y repetía el saludo en vez de avanzar (Cielo
    // …1625683, 13-sep-2026: "Uñas" sola reabrió sendCtwaInterestQuestion;
    // recién con "Las uñas", 8 chars, avanzó).
    const isKnownShortRubroWord = ["unas", "uñas"].includes(
      freeCtwaText.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""),
    );
    // Dup CTWA / vacío mientras espera tap: no caer a "Otro" (QA H anti-dup)
    if (
      !ctwaInterestId &&
      (!freeCtwaText ||
        (freeCtwaText.length <= 4 && !isKnownShortRubroWord) ||
        isMetaAdsBoilerplateCta(freeCtwaText))
    ) {
      await sendCtwaInterestQuestion(rt, phoneNumber, firstNameCtwa);
      return true;
    }

    // Ubicación mid-interés CTWA: pregunta pura (Star/Danae) → Maps
    // determinístico. Si trae más ("dónde quedan y quiero extensiones")
    // Haiku primero — mismo patrón Batch 3; Maps queda de respaldo.
    if (
      !ctwaInterestId &&
      matchesLocationQuestion(freeCtwaText.toLowerCase())
    ) {
      const locLower = freeCtwaText.toLowerCase();
      await handleLocationQuestion({
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
        wabaConfig,
        haikuRuntime,
        session: rt.session ?? null,
        prompt: freeCtwaText,
        locLower,
        ubicacionText,
        skipHaiku: isMostlyLocationQuestion(locLower),
        browseIfMixed: true,
        requireClaim: true,
      });
      return true;
    }

    const adHasSpecificIntent = !ctwaInterestId &&
      !isMetaAdsBoilerplateCta(freeCtwaText) &&
      (freeCtwaText.length > 4 || isKnownShortRubroWord);

    if (adHasSpecificIntent) {
      await upsertSession(supabase, phoneNumber, { step: "browsing" });
      if (
        await tryHandOffUnrecognizedToHaiku({
          phoneNumber,
          contactName,
          catalog,
          supabase,
          phoneCountry,
          wabaConfig,
          haikuRuntime,
          session: rt.session ?? null,
          prompt: freeCtwaText,
        })
      ) {
        return true;
      }
      // Haiku falló → pregunta abierta (abajo)
    }

    // Otro lite: sin 4 imgs genéricas, sin muro sede, sin lista categorías.
    await sendCtwaRubroReply(rt, phoneNumber, firstNameCtwa, "otro");
    await upsertSession(supabase, phoneNumber, { step: "browsing" });
    return true;
  }

  // ── Lista CTWA stale mid-funnel (SOFI 28-ago) ─────────────────────────────
  // Tap Extensiones/Lifting/Uñas/Otro cuando step ya no es awaiting_ctwa_interest.
  // Sin esto: "Uñas" sobre lista vieja desvía un cierre de Anime → Haiku → menú.
  {
    const staleCtwaId = getInteractiveId(message);
    if (
      staleCtwaId?.startsWith("ctwa_interest_") &&
      (!rt.session?.step ||
        rt.session.step === "browsing" ||
        rt.session.step === "awaiting_datetime")
    ) {
      let pendingId = rt.session?.pending_price_cta_service_id?.trim() || null;
      if (!pendingId) {
        const { findRecentQuotedServiceId } = await import(
          "../../lib/pending-price-cta.ts"
        );
        pendingId = await findRecentQuotedServiceId(
          supabase,
          phoneNumber,
          catalog,
        );
        if (pendingId) {
          await upsertSession(supabase, phoneNumber, {
            pending_price_cta_service_id: pendingId,
            pending_price_cta_at: new Date().toISOString(),
          });
          rt.session = (await getSession(supabase, phoneNumber)) ?? rt.session;
        }
      }
      if (pendingId) {
        const svc = catalog.servicesById.get(pendingId);
        const label = svc?.name ?? "el servicio que cotizamos";
        const price = svc
          ? ` (S/${parseFloat(String(svc.price)).toFixed(0)})`
          : "";
        await rt.senders.sendMessage(
          phoneNumber,
          addressWithoutHello(
            contactName,
            `Seguimos con *${label}*${price} 💜 ¿Te lo agendo? Responde *sí* o el día que te acomoda.`,
          ),
        );
        return true;
      }
      if (sessionHasCart(rt.session ?? null)) {
        await rt.senders.sendMessage(
          phoneNumber,
          addressWithoutHello(
            contactName,
            `Ya tienes servicios en tu selección. Escribe *agendar* para elegir día, o *menu* si quieres cambiar 💜`,
          ),
        );
        return true;
      }
      // Sin pending ni carrito: honrar el rubro (elección tardía legítima)
      const rawFirst = contactName.split(" ")[0];
      const firstName = /^[+\d]/.test(rawFirst) ? "" : rawFirst;
      if (staleCtwaId === "ctwa_interest_extensiones") {
        await sendCtwaRubroReply(
          rt,
          phoneNumber,
          firstName,
          "extensiones",
          extensionesPromoImages,
        );
        return true;
      }
      if (staleCtwaId === "ctwa_interest_lifting") {
        await sendCtwaRubroReply(
          rt,
          phoneNumber,
          firstName,
          "lifting",
          liftingPromoImages,
        );
        return true;
      }
      if (staleCtwaId === "ctwa_interest_unas") {
        await sendCtwaRubroReply(
          rt,
          phoneNumber,
          firstName,
          "unas",
          unasPromoImages,
        );
        return true;
      }
      await sendCtwaRubroReply(rt, phoneNumber, firstName, "otro");
      return true;
    }
  }

  return false;
}

export async function tryHandleCtwaEntry(
  rt: DispatchRuntime,
  skip: { skipSaludoForBooking: boolean; skipSaludoForCatalog: boolean },
): Promise<boolean> {
  const {
    phoneNumber,
    contactName,
    messageText,
    catalog,
    supabase,
    phoneCountry,
    wabaConfig,
    message,
    isNew,
    fromAd,
  } = rt.ctx;
  const haikuRuntime = rt.haikuRuntime;
  const { campaignPromoImages, metaAdsServicesText, ubicacionText } = rt.cms;
  const interactiveId = rt.interactiveId;
  const { skipSaludoForBooking, skipSaludoForCatalog } = skip;
  const metaAdsTest = isMetaAdsTestMessage(messageText);

  // Atribución CTWA por copy cuando Meta omite referral (Milagros / Gladys).
  // No cambia el flujo de welcome; solo marca from_ad_at para ads-bounce.
  if (
    !fromAd &&
    !metaAdsTest &&
    !interactiveId &&
    messageText.trim() &&
    !rt.session?.from_ad_at &&
    isKnownCtwaCampaignCopy(messageText)
  ) {
    const fromAdAtIso = new Date().toISOString();
    await markSessionFromAd(supabase, phoneNumber);
    // Evita un round-trip extra: markSessionFromAd toca from_ad_at (+ step
    // browsing solo si NO estaba en awaiting_datetime).
    const keepDatetime = rt.session?.step === "awaiting_datetime";
    rt.session = rt.session
      ? {
        ...rt.session,
        ...(keepDatetime ? {} : { step: "browsing" as const }),
        from_ad_at: fromAdAtIso,
        ads_bounce_nudge_sent_at: null,
      }
      : ((await getSession(supabase, phoneNumber)) ?? rt.session);
    console.log(
      "[WABA] from_ad_at por copy CTWA (sin referral):",
      phoneNumber.slice(-4),
    );
  }

  // Si isNew pero el mensaje tiene intención específica (pregunta, precio, servicio),
  // no tratar como bienvenida — dejar que llegue a Haiku o al flujo normal.
  // Comparar saludos como palabras completas, no substring — evita que "hola" matchee dentro de "hidralips"
  const msgLowerTrimmed = messageText.trim().toLowerCase();
  const isSaludoExact = SALUDOS.some((s) => {
    if (msgLowerTrimmed === s) return true;
    // Coincidencia como palabra completa — evita "hi" en "hidralips", "hola" en "hidralips"
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|[!?,.]|$)`);
    return re.test(msgLowerTrimmed);
  });
  // Saludo "puro" solo si el mensaje es corto (≤20 chars, ej: "Hola", "Buenos días")
  // Un mensaje largo con saludo al inicio ("Hola, quiero agendar lifting y pedicure") tiene
  // contenido específico — no tratar como saludo puro para evitar activar showWelcome en lugar de Haiku.
  const isSaludoPuro = isSaludoExact && messageText.trim().length <= 20;

  // Saltar bienvenida si: mensaje con contenido específico (no saludo puro)
  // No depende de isNew/rt.session — si el mensaje tiene contenido, siempre va a Haiku.
  const msgHasSpecificIntent = !interactiveId && !isSaludoPuro &&
    messageText.trim().length > 4;

  // Garantizar que la sesión existe aunque saltemos el bloque de saludo
  if (msgHasSpecificIntent && !rt.session) {
    await upsertSession(supabase, phoneNumber, { step: "browsing" });
    rt.session = (await getSession(supabase, phoneNumber)) ?? rt.session;
  }

  // Primer contacto orgánico: mismas imágenes de /panel/waba/campanas (sin from_ad).
  // Cubre saludo corto e intención en el 1.er mensaje (caso Ideni BSUID sin referral).
  // Recurrentes / "voy a llegar tarde" → isNew=false → no envía.
  // Jessi …6106: si el coalesce ya trae copy CTWA, no mandar creativos orgánicos
  // aquí — el bloque Meta Ads / mix lo maneja (evita avalancha doble).
  const ctwaSplitEarly = splitCtwaBoilerplateAndIntent(messageText);
  const looksLikeCtwaCopy = ctwaSplitEarly.hasBoilerplate ||
    isKnownCtwaCampaignCopy(messageText);
  if (
    isNew &&
    !fromAd &&
    !metaAdsTest &&
    !interactiveId &&
    !looksLikeCtwaCopy
  ) {
    await sendCampaignImagesIfAny(
      supabase,
      phoneNumber,
      campaignPromoImages,
      rt.senders.sendImage,
    );
  }

  // ── Meta Ads: imágenes + texto en primer mensaje (clienta nueva) o retorno
  // desde anuncio con sesión inactiva (>24h). Haiku toma el relevo en el siguiente mensaje.
  // isSessionStale = 24h → no reescribe from_ad_at dentro de la ventana ads-bounce (90–150 min).
  // También si el coalesce pegó copy CTWA sin referral en este webhook (fromAd=false).
  const sessionStaleForAd = !isNew && Boolean(rt.session) &&
    isSessionStale(rt.session);
  const treatAsCtwaEntry = fromAd || metaAdsTest ||
    (isNew && looksLikeCtwaCopy);
  if (treatAsCtwaEntry && (isNew || sessionStaleForAd) && !interactiveId) {
    // Anti-duplicado CTWA (análisis 2026-07-19 …4257): dos webhooks en paralelo
    // (boilerplate + pregunta ~8s) ambos veían isNew y reenviaban welcome+lista.
    // Si ya hubo OUT de bienvenida CTWA en los últimos 20s → solo Haiku si hay
    // intención nueva; no imágenes ni lista de nuevo.
    const welcomeSince = new Date(Date.now() - 20_000).toISOString();
    const { data: recentWelcomeOut } = await supabase
      .from("wa_messages")
      .select("content, msg_type, created_at")
      .eq("phone", phoneNumber)
      .eq("direction", "out")
      .gte("created_at", welcomeSince)
      .order("created_at", { ascending: false })
      .limit(8);
    const alreadyCtwaWelcome = (recentWelcomeOut ?? []).some((row) => {
      const c = (row.content ?? "").toLowerCase();
      return (
        row.msg_type === "image" ||
        /llamó la atención|llamo la atencion|promo|instagram|cita previa|nuestras promos|te interesa|bienvenida a zm/i
          .test(
            c,
          ) ||
        (row.msg_type === "interactive" &&
          /promo|te interesa|elige una opción/i.test(c))
      );
    });
    if (alreadyCtwaWelcome) {
      const followUp = messageText.trim();
      // Ubicación tras welcome CTWA: pura → Maps canónico. Mixto → Haiku
      // primero (Batch 3); Maps de respaldo.
      if (
        followUp.length > 4 &&
        !interactiveId &&
        matchesLocationQuestion(followUp.toLowerCase())
      ) {
        await handleLocationQuestion({
          phoneNumber,
          contactName,
          catalog,
          supabase,
          phoneCountry,
          wabaConfig,
          haikuRuntime,
          session: rt.session ?? null,
          prompt: followUp,
          locLower: followUp.toLowerCase(),
          ubicacionText,
          skipHaiku: isMostlyLocationQuestion(followUp.toLowerCase()),
          requireClaim: true,
        });
        return true;
      }
      if (
        followUp.length > 4 &&
        !isMetaAdsBoilerplateCta(followUp) &&
        !interactiveId
      ) {
        await upsertSession(supabase, phoneNumber, { step: "browsing" });
        if (
          await tryHandOffUnrecognizedToHaiku({
            phoneNumber,
            contactName,
            catalog,
            supabase,
            phoneCountry,
            wabaConfig,
            haikuRuntime,
            session: rt.session ?? null,
            prompt: followUp,
          })
        ) {
          return true;
        }
      }
      console.log(
        "[WABA] Meta Ads: skip welcome duplicado (OUT reciente):",
        phoneNumber.slice(-4),
      );
      return true;
    }

    // Atribución CTWA antes de imágenes/Haiku (desbloquea ads-bounce-nudge).
    await markSessionFromAd(supabase, phoneNumber);
    const rawFirst = contactName.split(" ")[0];
    const firstName = /^[+\d]/.test(rawFirst) ? "" : rawFirst;
    // Tras mark: releer inbound por si llegó precio/intención durante el
    // procesamiento (Yesenia: CTWA + "Precio del builder gel retoque" ~5s después).
    let adText = messageText;
    const refreshedInbound = await coalesceRecentInboundText(
      supabase,
      phoneNumber,
      12000,
    );
    if (
      refreshedInbound &&
      refreshedInbound.trim() &&
      refreshedInbound.trim() !== messageText.trim() &&
      refreshedInbound.trim().length > messageText.trim().length
    ) {
      adText = refreshedInbound.trim();
      console.log(
        "[WABA] Meta Ads: inbound ampliado tras coalescing:",
        phoneNumber.slice(-4),
        adText.slice(0, 80),
      );
    }
    const ctwaSplit = splitCtwaBoilerplateAndIntent(adText);
    if (ctwaSplit.allBoilerplate) {
      // CTWA vacío → pregunta de interés (imágenes segmentadas tras el tap)
      await upsertSession(supabase, phoneNumber, {
        step: AWAITING_CTWA_INTEREST,
      });
      await sendCtwaInterestQuestion(rt, phoneNumber, firstName);
      return true;
    }
    // Mix boilerplate + intención orgánica (Jessi …6106): Haiku solo con la
    // intención (p. ej. "Informacion y precio"), sin creativos + lista genérica
    // sobre el copy CTWA completo (avalancha).
    const textForHaiku = ctwaSplit.hasBoilerplate && ctwaSplit.intentText
      ? ctwaSplit.intentText
      : adText;
    const mixedCtwaOrganic = ctwaSplit.hasBoilerplate &&
      Boolean(ctwaSplit.intentText);
    if (!mixedCtwaOrganic) {
      await sendCampaignImagesIfAny(
        supabase,
        phoneNumber,
        campaignPromoImages,
        rt.senders.sendImage,
      );
    }
    const adHasSpecificIntent = !interactiveId &&
      textForHaiku.trim().length > 4 &&
      !isMetaAdsBoilerplateCta(textForHaiku);
    const adTextIsDuplicateLocation =
      matchesLocationQuestion(textForHaiku.toLowerCase()) &&
      !(await tryClaimLocationSend(supabase, phoneNumber));
    if (
      (adHasSpecificIntent || msgHasSpecificIntent) &&
      !adTextIsDuplicateLocation
    ) {
      const haikuKeywords = getHaikuTriggerKeywordsFromWaba(wabaConfig);
      let trigger = detectAITrigger(textForHaiku, haikuKeywords);
      // Dead-end CTWA (02/03-ago): "…quiero agendar mi cita" → detectAITrigger
      // null por DETERMINISTIC_INTENTS ("agendar") → solo texto estático.
      // Controles: "saber los precios" / "información" sí llegan a Haiku.
      if (!trigger && adHasSpecificIntent) {
        trigger = { type: "fallback", originalMessage: textForHaiku.trim() };
      }
      if (
        trigger &&
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
        if (handled) return true;
      }
    }
    // Mix: si Haiku no cerró, pregunta de interés (no lista genérica de categorías)
    if (mixedCtwaOrganic) {
      await upsertSession(supabase, phoneNumber, {
        step: AWAITING_CTWA_INTEREST,
      });
      await sendCtwaInterestQuestion(rt, phoneNumber, firstName);
      return true;
    }
    // Último recurso: solo texto abierto, sin lista (análisis 09-sep [entrada Ads]).
    const wamidLastResort = typeof message.id === "string"
      ? message.id
      : undefined;
    if (wamidLastResort) await sendTypingIndicator(wamidLastResort);
    await rt.senders.sendMessage(
      phoneNumber,
      metaAdsServicesText.replace(
        "{nombre}",
        firstName ? `, ${firstName}` : "",
      ),
    );
    await upsertSession(supabase, phoneNumber, {
      step: AWAITING_CTWA_INTEREST,
    });
    return true;
  }

  // Mostrar bienvenida SOLO si: saludo puro (≤20 chars), o cliente nueva sin intención específica
  let showWelcome = !interactiveId &&
    !msgHasSpecificIntent &&
    (isNew || metaAdsTest || isSaludoPuro) &&
    !skipSaludoForBooking &&
    !skipSaludoForCatalog;

  // Pati …165951: con cita scheduled, "Hola" no debe reabrir welcome+menú
  if (showWelcome && !metaAdsTest) {
    const pendWelcome = await getPendingAppointmentsForPhone(
      supabase,
      phoneNumber,
    );
    if (pendWelcome.length > 0) showWelcome = false;
  }

  // Gabriela …4563: "Hola" a los ~5 s no debe pisar la respuesta en curso.
  // Carito …4118 (análisis 3-oct): "Hola" suelto ~60 s después de
  // "¿natural o volumen?" reabría welcome+menú. 10 s no cubría el turno.
  // Si el bot ya habló en ~10 min, el saludo sigue en el hilo (cae a Haiku).
  if (showWelcome && !isNew && !metaAdsTest) {
    if (await hadRecentBotOutbound(supabase, phoneNumber, 10 * 60 * 1000)) {
      showWelcome = false;
    }
  }

  if (showWelcome) {
    // ── Recuperar carrito abandonado ─────────────────────────────────────────
    if (rt.session?.cartItems?.length && !metaAdsTest) {
      const msgLower = messageText.toLowerCase();
      const hasNavIntent = [
        "pack",
        "combo",
        "servicio",
        "promo",
        "cita",
        "precio",
        "ver",
        "mostrar",
        "quiero",
      ].some((k) => msgLower.includes(k));
      if (!hasNavIntent) {
        await rt.senders.sendMessage(
          phoneNumber,
          `Ya tienes ${rt.session.cartItems.length} ítem(s) en tu selección 🛒\n\nPuedes *ver selección*, *agregar* más o *vaciar* para empezar de cero.`,
        );
        await sendMenuWithPromos(phoneNumber, supabase);
        return true;
      }
    }

    await upsertSession(supabase, phoneNumber, { step: "browsing" });
    const rawFirst = contactName.split(" ")[0];
    const firstName = /^[+\d]/.test(rawFirst) ? "" : rawFirst;

    if (fromAd || metaAdsTest) {
      // ── Meta Ads real (nueva O recurrente desde anuncio) o frase de prueba QA ─
      // Marca CTWA para reenganche ~2 h si no hay 2.º inbound (ads-bounce-nudge).
      // Boilerplate / saludo → pregunta de interés (imágenes tras el tap).
      await markSessionFromAd(supabase, phoneNumber);
      await upsertSession(supabase, phoneNumber, {
        step: AWAITING_CTWA_INTEREST,
      });
      await sendCtwaInterestQuestion(rt, phoneNumber, firstName);
      return true;
    }

    if (isNew && !fromAd && !metaAdsTest) {
      // ── Cliente nueva orgánica → saludo Haiku + menú ─────────────────────
      const promoTitles = (
        await supabase
          .from("promotions")
          .select("title")
          .eq("is_active", true)
          .limit(3)
      ).data?.map((p: { title: string }) => p.title) ?? [];
      const greeting = (await generateWelcomeGreeting(
        haikuRuntime,
        firstName,
        promoTitles,
        false,
        supabase,
        phoneNumber,
      )) ?? getFallbackGreeting(firstName, false, haikuRuntime);
      await rt.senders.sendMessage(phoneNumber, greeting);
      await sendMenuWithPromos(phoneNumber, supabase);
      return true;
    }

    // ── Cliente recurrente con saludo → saludo Haiku + menú directo ─────────
    const promoTitlesR = (
      await supabase
        .from("promotions")
        .select("title")
        .eq("is_active", true)
        .limit(3)
    ).data?.map((p: { title: string }) => p.title) ?? [];
    const greetingR = (await generateWelcomeGreeting(
      haikuRuntime,
      firstName,
      promoTitlesR,
      false,
      supabase,
      phoneNumber,
    )) ?? getFallbackGreeting(firstName, false, haikuRuntime);
    await rt.senders.sendMessage(phoneNumber, greetingR);
    await sendMenuWithPromos(phoneNumber, supabase);
    return true;
  }

  return false;
}
