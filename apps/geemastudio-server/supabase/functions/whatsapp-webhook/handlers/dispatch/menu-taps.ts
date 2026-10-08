// menu-taps.ts — IDs de menú, catálogo, ubicación y carrito (Plan 08 Fase 1)

import { WA_IDS } from "../../lib/constants.ts";
import { getInteractiveTitle } from "../../lib/parse-message.ts";
import {
  formatCartSummaryFromLines,
  formatSoles,
  limaIsoWeekday,
} from "../../format.ts";
import {
  addCartItems,
  addToCart,
  clearCart,
  getSession,
  upsertSession,
} from "../../lib/supabase.ts";
import {
  DEFAULT_ESTACIONAMIENTO_TEXT,
  matchesParkingOrMovilidadQuestion,
} from "../../lib/salon-location.ts";
import { matchesPurePromosNavigationIntent } from "../../lib/promo-intent.ts";
import {
  catalogBackToSubcategories,
  catalogPacksToForList,
  classifyExtensionesService,
  classifyUnasService,
  filterPacksForSubcategory,
  getExtensionesSubcategoryLabel,
  getUnasSubcategoryLabel,
  parsePacksPagePayload,
  parseServicesPagePayload,
  parseViewPayload,
  sendCartOptions,
  sendCategoriesAndPromosListFromCatalog,
  sendCategoriesList,
  sendCategoryViewChoice,
  sendExtensionesSubcategoriesList,
  sendMenuWithPromos,
  sendPacksOnlyList,
  sendPromosListFromCatalog,
  sendServicesList,
  sendServicesOnlyList,
  sendUnasSubcategoriesList,
  shouldRedirectFreeTextPacksToCategories,
  WA_MAX_CONTENT,
} from "../menu.ts";
import {
  AWAITING_CURSO_LEAD,
  isMostlyCartInspectQuestion,
  isMostlyHorariosAvailabilityQuestion,
  isMostlyLocationQuestion,
  isMostlyRetiroInfoQuestion,
  matchesClassesQuestion,
  matchesExtensionesCursoLead,
  matchesLocationQuestion,
  matchesRetiroInfoQuestion,
  resendDatetimeSelectors,
  sessionHasCart,
  tryCompleteBookingFromText,
} from "../booking-flow.ts";
import {
  isReproInteractiveId,
  parseReproAppointmentId,
  sendMiCitaMenu,
  startRescheduleFromAppointment,
} from "../pending-appointment.ts";
import {
  handleLocationQuestion,
  tryHaikuFirstUnlessMostly,
  tryHandOffUnrecognizedToHaiku,
} from "./haiku-handoff.ts";
import {
  isCatalogPageInteractiveId,
  openBookingAfterCartAdd,
  proceedToBookingWithCurrentCart,
} from "./cart-booking.ts";
import { PITEM_PREFIX } from "./menu-ids.ts";
import type { DispatchRuntime } from "./runtime.ts";
import {
  type CatalogPromotion,
  formatValidDaysEs,
  promoAppliesOnWeekday,
} from "../../lib/services-catalog.ts";
import {
  CATALOG_NAV_HELP_TEXT,
  nextCatalogNavState,
} from "../../lib/catalog-nav-fallback.ts";

/**
 * Taps que solo navegan el catálogo (subcategoría/categoría/paginación/volver)
 * sin seleccionar un servicio o pack concreto. Ver `lib/catalog-nav-fallback.ts`.
 */
function isPureCatalogNavTap(userInput: string): boolean {
  return (
    userInput === "ver_packs" ||
    userInput === "ver_servicios" ||
    userInput === WA_IDS.VOLVER_CATEGORIAS ||
    userInput === "1" ||
    userInput.startsWith(WA_IDS.SUBCATEGORY_PREFIX) ||
    userInput.startsWith(WA_IDS.VIEW_PREFIX) ||
    isCatalogPageInteractiveId(userInput) ||
    userInput.startsWith(WA_IDS.VOLVER_SUBCAT_PREFIX) ||
    userInput.startsWith(WA_IDS.CATEGORY_PREFIX)
  );
}

/**
 * Guard packs especiales compartido entre el tap `pitem_` (ítem de promo) y
 * el tap `promo_` (promo completa) — misma promo, mismo bloqueo, mismo
 * mensaje. Retorna true si ya respondió (bloqueado) y el caller debe cortar.
 */
async function blockIfPacksEspecialesRestricted(
  rt: DispatchRuntime,
  phoneNumber: string,
  promo: CatalogPromotion,
  promotions: CatalogPromotion[],
): Promise<boolean> {
  if (
    !promo.valid_days ||
    promoAppliesOnWeekday(promo, limaIsoWeekday(new Date()))
  ) {
    return false;
  }
  await rt.senders.sendMessage(
    phoneNumber,
    `💜 *${promo.title}* solo está disponible ${
      formatValidDaysEs(promo.valid_days)
    }.\n\nHoy no aplica, pero puedes elegir otras promos o servicios del menú. ¿Quieres que te muestre las opciones disponibles?`,
  );
  await sendPromosListFromCatalog(phoneNumber, promotions);
  return true;
}

export async function tryHandleMenuTaps(rt: DispatchRuntime): Promise<boolean> {
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
  const { sendInteractiveList } = rt.senders;
  const haikuRuntime = rt.haikuRuntime;
  const {
    ubicacionText,
    horariosText,
    clasesText,
    cursosExtensionesText,
    retiroOtroSalonText,
  } = rt.cms;
  const userInput = rt.userInput;
  const lower = rt.lower;
  const interactiveId = rt.interactiveId;
  const isInteractive = rt.isInteractive;

  if (isInteractive) {
    const currentTaps = (rt.session?.catalog_nav_taps_count as
      | number
      | null
      | undefined) ?? 0;
    if (isPureCatalogNavTap(userInput)) {
      const { nextCount, shouldOfferHelp } = nextCatalogNavState(currentTaps);
      await upsertSession(supabase, phoneNumber, {
        catalog_nav_taps_count: nextCount,
      });
      if (shouldOfferHelp) {
        await rt.senders.sendMessage(phoneNumber, CATALOG_NAV_HELP_TEXT);
      }
    } else if (currentTaps > 0) {
      await upsertSession(supabase, phoneNumber, {
        catalog_nav_taps_count: 0,
      });
    }
  }

  if (userInput === "mi_cita") {
    await sendMiCitaMenu(phoneNumber, supabase);
    return true;
  }

  if (userInput === "mi_cita_ver_menu") {
    await sendMenuWithPromos(phoneNumber, supabase);
    return true;
  }

  if (isReproInteractiveId(userInput)) {
    const apptId = parseReproAppointmentId(userInput);
    if (apptId) {
      await startRescheduleFromAppointment(
        supabase,
        phoneNumber,
        apptId,
        catalog,
      );
    }
    return true;
  }

  if (userInput === "agendar_cita") {
    const hasCart = sessionHasCart(rt.session ?? null);
    if (hasCart) {
      const fastDone = await tryCompleteBookingFromText(
        supabase,
        phoneNumber,
        messageText,
        rt.session ?? null,
        catalog,
      );
      if (fastDone) return true;
      await proceedToBookingWithCurrentCart(
        supabase,
        phoneNumber,
        rt.session ?? null,
        catalog,
      );
      return true;
    }
    if (rt.session?.step && rt.session.step !== "browsing") {
      await clearCart(supabase, phoneNumber);
    }
    await rt.senders.sendMessage(
      phoneNumber,
      "Para agendar, primero elige el servicio o pack que quieres 💜 Después te paso al calendario.",
    );
    await sendCategoriesAndPromosListFromCatalog(
      phoneNumber,
      catalog.categories,
      catalog.promotions.length > 0,
    );
    return true;
  }

  if (userInput === "ver_packs") {
    if (rt.session?.step && rt.session.step !== "browsing") {
      await clearCart(supabase, phoneNumber);
    }
    await sendCategoriesList(phoneNumber, catalog.categories);
    return true;
  }

  if (userInput === "ver_servicios" || userInput === WA_IDS.VOLVER_CATEGORIAS) {
    if (rt.session?.step && rt.session.step !== "browsing") {
      await clearCart(supabase, phoneNumber);
    }
    await sendCategoriesList(phoneNumber, catalog.categories);
    return true;
  }

  if (userInput === "menu" && isInteractive) {
    await sendMenuWithPromos(phoneNumber, supabase);
    return true;
  }

  if (userInput === "ver_promos") {
    if (rt.session?.step && rt.session.step !== "browsing") {
      await clearCart(supabase, phoneNumber);
    }
    await sendPromosListFromCatalog(phoneNumber, catalog.promotions);
    return true;
  }

  if (userInput === "consultar_horarios") {
    // Plan 13-sep "Haiku-primero informativo" Batch 2: "horario domingo"
    // solo (isMostly=true) sigue con el texto estático; si el día viene
    // acompañado de una pregunta real ("horario domingo, atienden lifting?")
    // intentar Haiku antes — el estático queda de respaldo si falla/rate-limit.
    if (
      !interactiveId &&
      !isMostlyHorariosAvailabilityQuestion(lower) &&
      (await tryHandOffUnrecognizedToHaiku({
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
        wabaConfig,
        haikuRuntime,
        session: rt.session ?? null,
        prompt: messageText,
      }))
    ) {
      return true;
    }
    await rt.senders.sendMessage(phoneNumber, horariosText);
    if (sessionHasCart(rt.session ?? null)) {
      await rt.senders.sendMessage(
        phoneNumber,
        "¿Agendamos con lo que ya tienes en tu selección? 👇",
      );
      const cartItems = rt.session?.cartItems ?? [];
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
      const summary = formatCartSummaryFromLines(lines);
      await sendCartOptions(phoneNumber, summary, true);
    } else {
      await rt.senders.sendMessage(
        phoneNumber,
        "¿Quieres agendar? Elige un servicio o promo 👇",
      );
      await sendCategoriesAndPromosListFromCatalog(
        phoneNumber,
        catalog.categories,
        catalog.promotions.length > 0,
      );
    }
    return true;
  }

  if (userInput === "horarios") {
    await rt.senders.sendMessage(phoneNumber, horariosText);
    if (sessionHasCart(rt.session ?? null)) {
      await rt.senders.sendMessage(
        phoneNumber,
        "¿Agendamos con lo que ya tienes en tu selección? Toca *Agendar cita* 👇",
      );
      await sendMenuWithPromos(phoneNumber, supabase);
    } else {
      await rt.senders.sendMessage(
        phoneNumber,
        "¿Quieres agendar una cita o ver servicios? Te dejo el menú 👇",
      );
      await sendMenuWithPromos(phoneNumber, supabase);
    }
    return true;
  }

  if (userInput === "ubicacion" || matchesLocationQuestion(lower)) {
    // Star …6469 (29-ago): 2do inbound coalescido por separado (ej. tras el
    // flujo CTWA/Haiku ya respondió ubicación en el mismo turno) volvía a
    // caer aquí y reenviaba la dirección con este otro formato. Tap explícito
    // "ubicacion" siempre responde; texto libre reserva turno con claim atómico
    // (no lectura post-hecho — cierra la carrera real con el flujo vía Haiku).
    // Batch 3: si no es tap y no es "casi solo ubicación", Haiku primero
    // (Maps + menú quedan de respaldo). LION …9087 sigue estático (isMostly).
    const locResult = await handleLocationQuestion({
      phoneNumber,
      contactName,
      catalog,
      supabase,
      phoneCountry,
      wabaConfig,
      haikuRuntime,
      session: rt.session ?? null,
      prompt: messageText,
      locLower: lower,
      ubicacionText,
      skipHaiku: userInput === "ubicacion" ||
        Boolean(interactiveId) ||
        isMostlyLocationQuestion(lower),
      requireClaim: userInput !== "ubicacion",
    });
    if (locResult !== "maps") return true;
    // LION …9087: "dirección de la sede" no pasaba isMostlyLocation → Haiku ×2.
    // Tras Maps se corta. Si ya hay carrito, se reenvía el selector. Sin carrito
    // la dirección queda sola: el menú genérico pisaba la promo que Haiku
    // estaba cotizando (Alberto VE …0417, 4-oct, "dónde están ubicados").
    if (userInput === "ubicacion" || isMostlyLocationQuestion(lower)) {
      const { resumeCompanionAskIfNeeded } = await import(
        "../party-booking.ts"
      );
      const asked = await resumeCompanionAskIfNeeded(
        supabase,
        phoneNumber,
        catalog,
      );
      const sessLoc = rt.session ?? (await getSession(supabase, phoneNumber));
      if (!asked && sessionHasCart(sessLoc ?? null) && sessLoc) {
        await resendDatetimeSelectors(phoneNumber, supabase, sessLoc, catalog, {
          debounce: false,
        });
      }
    } else if (
      userInput !== "ubicacion" &&
      lower.includes("\n") &&
      (!rt.session?.step || rt.session.step === "browsing")
    ) {
      // LYM …5765 (10-sep): ráfaga coalescida "Extensiones... la promoción" +
      // "Donde estan ubicados" — matchesLocationQuestion matchea el combinado
      // completo y `isMostlyLocationQuestion` da false (queda pregunta real de
      // servicio/promo), pero antes esto solo cortaba el turno sin responder
      // esa otra línea. Solo aplica a texto multi-línea (coalesce real) — un
      // mensaje único sigue sin caer a Haiku aquí (evita el duplicado LION …9087).
      const remainder = userInput
        .split("\n")
        .filter((line) => !matchesLocationQuestion(line.toLowerCase()))
        .join("\n")
        .trim();
      if (remainder) {
        await tryHandOffUnrecognizedToHaiku({
          phoneNumber,
          contactName,
          catalog,
          supabase,
          phoneCountry,
          wabaConfig,
          haikuRuntime,
          session: rt.session ?? null,
          prompt: remainder,
        });
      }
    }
    return true;
  }

  // Movilidad gratis = estacionamiento del CC (Milagros …9602) — no dejar a Haiku negar.
  if (matchesParkingOrMovilidadQuestion(lower)) {
    await rt.senders.sendMessage(phoneNumber, DEFAULT_ESTACIONAMIENTO_TEXT);
    return true;
  }

  // Clases / cursos — solo informativo (no agendable aquí).
  // "curso" → lead extensiones (Johanna …9981); "clases"/lifting/cejas → pack S/250.
  // Siempre return: evita que Haiku reenvíe el pack viejo encima del formulario.
  if (matchesClassesQuestion(lower)) {
    if (matchesExtensionesCursoLead(lower)) {
      await rt.senders.sendMessage(phoneNumber, cursosExtensionesText);
      await upsertSession(supabase, phoneNumber, {
        step: AWAITING_CURSO_LEAD,
      });
    } else {
      await rt.senders.sendMessage(phoneNumber, clasesText);
    }
    return true;
  }

  // Retiro de otro local — por qué se cobra S/20
  if (matchesRetiroInfoQuestion(lower)) {
    await rt.senders.sendMessage(phoneNumber, retiroOtroSalonText);
    if (isMostlyRetiroInfoQuestion(lower)) return true;
  }

  if (userInput === "1" || lower === "ver servicios") {
    await sendCategoriesList(phoneNumber, catalog.categories);
    return true;
  }
  if (matchesPurePromosNavigationIntent(lower)) {
    await sendPromosListFromCatalog(phoneNumber, catalog.promotions);
    return true;
  }
  if (shouldRedirectFreeTextPacksToCategories(userInput)) {
    await sendCategoriesList(phoneNumber, catalog.categories);
    return true;
  }
  if (
    userInput !== WA_IDS.AGENDAR_YA &&
    (userInput === "3" || lower === "agendar" || lower === "reservar") &&
    !sessionHasCart(rt.session ?? null)
  ) {
    await sendCategoriesList(phoneNumber, catalog.categories);
    return true;
  }

  if (userInput.startsWith(WA_IDS.SUBCATEGORY_PREFIX)) {
    const payload = userInput.slice(WA_IDS.SUBCATEGORY_PREFIX.length);
    const [categoryId, subKeyRaw] = payload.split("__");
    if (!categoryId || !subKeyRaw) {
      await rt.senders.sendMessage(
        phoneNumber,
        "No pude procesar la subcategoría. Escribe *menu* para empezar de nuevo.",
      );
      return true;
    }
    type SvcRow = {
      id: string;
      name: string;
      short_name?: string | null;
      price: string;
      duration: number;
      subcategory: string | null;
    };
    const all = (catalog.servicesByCategory.get(categoryId) ?? []) as SvcRow[];
    const categoryPacks = catalog.packsByCategory.get(categoryId) ?? [];
    if (categoryId === "cat-unas") {
      const filtered = all.filter((svc) => {
        const rawSub = (svc.subcategory ?? "").toLowerCase();
        return rawSub
          ? rawSub === subKeyRaw
          : classifyUnasService(svc.name) === subKeyRaw;
      });
      const packsForList = filterPacksForSubcategory(
        categoryPacks,
        filtered.map((s) => s.id),
      );
      if (!filtered.length && packsForList.length === 0) {
        await rt.senders.sendMessage(
          phoneNumber,
          "No hay servicios ni packs en esa subcategoría. Elige otra opción o escribe *menu* para volver al inicio.",
        );
        return true;
      }
      const unasLabel = getUnasSubcategoryLabel(subKeyRaw as never);
      if (filtered.length + packsForList.length > WA_MAX_CONTENT) {
        await sendCategoryViewChoice(
          phoneNumber,
          unasLabel,
          `${categoryId}__${subKeyRaw}`,
          filtered.length,
          packsForList.length,
        );
      } else {
        await sendServicesList(
          phoneNumber,
          unasLabel,
          filtered,
          false,
          packsForList,
          catalogBackToSubcategories("cat-unas"),
        );
      }
      return true;
    }
    if (categoryId === "cat-extensiones") {
      const filtered = all.filter((svc) => {
        const rawSub = (svc.subcategory ?? "").toLowerCase();
        return rawSub
          ? rawSub === subKeyRaw
          : classifyExtensionesService(svc.name) === subKeyRaw;
      });
      const packsForList = filterPacksForSubcategory(
        categoryPacks,
        filtered.map((s) => s.id),
      );
      if (!filtered.length && packsForList.length === 0) {
        await rt.senders.sendMessage(
          phoneNumber,
          "No hay servicios ni packs en esa subcategoría. Elige otra opción o escribe *menu* para volver al inicio.",
        );
        return true;
      }
      const extLabel = getExtensionesSubcategoryLabel(subKeyRaw as never);
      if (filtered.length + packsForList.length > WA_MAX_CONTENT) {
        await sendCategoryViewChoice(
          phoneNumber,
          extLabel,
          `${categoryId}__${subKeyRaw}`,
          filtered.length,
          packsForList.length,
        );
      } else {
        await sendServicesList(
          phoneNumber,
          extLabel,
          filtered,
          false,
          packsForList,
          catalogBackToSubcategories("cat-extensiones"),
        );
      }
      return true;
    }
  }

  if (
    userInput.startsWith(WA_IDS.VIEW_PREFIX) ||
    isCatalogPageInteractiveId(userInput)
  ) {
    const isPacksPage = userInput.startsWith(WA_IDS.PACKS_PAGE_PREFIX) ||
      userInput.startsWith("packspage_");
    const isServicesPage = userInput.startsWith(WA_IDS.SERVICES_PAGE_PREFIX) ||
      userInput.startsWith("svcspage_");
    const payload = isPacksPage
      ? userInput.startsWith(WA_IDS.PACKS_PAGE_PREFIX)
        ? userInput.slice(WA_IDS.PACKS_PAGE_PREFIX.length)
        : userInput.slice("packspage_".length)
      : isServicesPage
      ? userInput.startsWith(WA_IDS.SERVICES_PAGE_PREFIX)
        ? userInput.slice(WA_IDS.SERVICES_PAGE_PREFIX.length)
        : userInput.slice("svcspage_".length)
      : userInput.slice(WA_IDS.VIEW_PREFIX.length);
    let scopeId: string;
    let offset = 0;
    let mode: "services" | "packs" | "chooser";
    if (isPacksPage) {
      const parsed = parsePacksPagePayload(payload);
      scopeId = parsed.scopeId;
      offset = parsed.offset;
      mode = "packs";
    } else if (isServicesPage) {
      const parsed = parseServicesPagePayload(payload);
      scopeId = parsed.scopeId;
      offset = parsed.offset;
      mode = "services";
    } else {
      const parsed = parseViewPayload(payload);
      scopeId = parsed.scopeId;
      mode = parsed.mode;
    }

    type SvcRow2 = {
      id: string;
      name: string;
      short_name?: string | null;
      price: string;
      duration: number;
      subcategory: string | null;
    };
    const scopeParts = scopeId.split("__");
    const categoryId = scopeParts[0];
    const subKeyRaw = scopeParts[1];
    const cat = catalog.categories.find((c) => c.id === categoryId);
    const all = (catalog.servicesByCategory.get(categoryId) ?? []) as SvcRow2[];
    const categoryPacks = catalog.packsByCategory.get(categoryId) ?? [];
    // Catálogo vacío / id truncado / timeout REST: no decir "No pude procesar"
    // — Haiku o reenviar categorías (Alberto VE …0417, 13-sep).
    if (!cat && all.length === 0 && categoryPacks.length === 0) {
      console.warn(
        "[WABA] view/page scope sin catálogo:",
        userInput.slice(0, 96),
      );
      const title = getInteractiveTitle(message)?.trim();
      const prompt = title
        ? `La clienta tocó "${title}" en la lista de servicios. Ayúdala a ver más opciones o elegir un servicio de forma natural.`
        : "La clienta quiere ver más servicios del catálogo. Ayúdala a continuar.";
      const handed = await tryHandOffUnrecognizedToHaiku({
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
        wabaConfig,
        haikuRuntime,
        session: rt.session ?? null,
        prompt,
      });
      if (handed) return true;
      await sendCategoriesList(phoneNumber, catalog.categories);
      return true;
    }
    let label = cat?.name ?? categoryId;
    let services: SvcRow2[] = all;
    let packsForList = catalogPacksToForList(categoryPacks);
    if (subKeyRaw) {
      if (categoryId === "cat-unas") {
        services = all.filter((svc) => {
          const rawSub = (svc.subcategory ?? "").toLowerCase();
          return rawSub
            ? rawSub === subKeyRaw
            : classifyUnasService(svc.name) === subKeyRaw;
        });
        label = getUnasSubcategoryLabel(subKeyRaw as never);
      } else if (categoryId === "cat-extensiones") {
        services = all.filter((svc) => {
          const rawSub = (svc.subcategory ?? "").toLowerCase();
          return rawSub
            ? rawSub === subKeyRaw
            : classifyExtensionesService(svc.name) === subKeyRaw;
        });
        label = getExtensionesSubcategoryLabel(subKeyRaw as never);
      }
      packsForList = filterPacksForSubcategory(
        categoryPacks,
        services.map((s) => s.id),
      );
    }

    if (mode === "chooser") {
      await sendCategoryViewChoice(
        phoneNumber,
        label,
        scopeId,
        services.length,
        packsForList.length,
      );
      return true;
    }

    if (mode === "packs") {
      await sendPacksOnlyList(
        phoneNumber,
        label,
        packsForList,
        scopeId,
        offset,
      );
    } else {
      await sendServicesOnlyList(phoneNumber, label, services, scopeId, offset);
    }
    return true;
  }

  if (userInput.startsWith(WA_IDS.VOLVER_SUBCAT_PREFIX) && isInteractive) {
    const categoryId = userInput.slice(WA_IDS.VOLVER_SUBCAT_PREFIX.length);
    type SvcRowSub = {
      id: string;
      name: string;
      short_name?: string | null;
      price: string;
      duration: number;
      subcategory: string | null;
    };
    const svcs = (catalog.servicesByCategory.get(categoryId) ??
      []) as SvcRowSub[];
    const packsForList = catalogPacksToForList(
      catalog.packsByCategory.get(categoryId) ?? [],
    );
    if (categoryId === "cat-unas") {
      await sendUnasSubcategoriesList(phoneNumber, svcs, packsForList);
      return true;
    }
    if (categoryId === "cat-extensiones") {
      await sendExtensionesSubcategoriesList(phoneNumber, svcs, packsForList);
      return true;
    }
    await sendCategoriesList(phoneNumber, catalog.categories);
    return true;
  }

  if (userInput.startsWith(PITEM_PREFIX) && isInteractive) {
    const rest = userInput.slice(PITEM_PREFIX.length);
    const parts = rest.split("_");
    if (parts.length >= 3) {
      const promoId = parts[0];
      const typeChar = parts[1];
      const itemId = parts.slice(2).join("_");
      const itemType = typeChar === "p" ? "pack" : "service";
      const promo = catalog.promotions.find((p) => p.id === promoId);
      if (
        promo &&
        (await blockIfPacksEspecialesRestricted(
          rt,
          phoneNumber,
          promo,
          catalog.promotions,
        ))
      ) {
        return true;
      }
      const item = promo?.items.find((i) => i.item_id === itemId);
      if (item) {
        const price = parseFloat(String(item.discounted_price)) || 0;
        await addCartItems(supabase, phoneNumber, [
          {
            item_type: itemType as "service" | "pack",
            item_id: itemId,
            quantity: 1,
            price,
          },
        ]);
        await openBookingAfterCartAdd(supabase, phoneNumber, catalog);
        return true;
      }
    }
    await sendPromosListFromCatalog(phoneNumber, catalog.promotions);
    return true;
  }

  if (userInput.startsWith("promo_")) {
    if (!isInteractive) {
      await rt.senders.sendMessage(
        phoneNumber,
        "Elige una promo de la lista que te enviamos 👇",
      );
      await sendPromosListFromCatalog(phoneNumber, catalog.promotions);
      return true;
    }
    const promoId = userInput.slice("promo_".length);
    const promo = catalog.promotions.find((p) => p.id === promoId);
    if (!promo) {
      await sendPromosListFromCatalog(phoneNumber, catalog.promotions);
      return true;
    }
    if (
      await blockIfPacksEspecialesRestricted(
        rt,
        phoneNumber,
        promo,
        catalog.promotions,
      )
    ) {
      return true;
    }
    if (!promo.items.length) {
      await rt.senders.sendMessage(
        phoneNumber,
        `${promo.emoji} *${promo.title}*\n\n${
          promo.description ?? ""
        }\n\nEsta promo no tiene ítems configurados. Elige otra o escribe *menu*.`,
      );
      return true;
    }
    const TITLE_MAX = 24;
    const DESC_MAX = 72;
    const rows: { id: string; title: string; description: string }[] = [];
    for (const i of promo.items) {
      const price = parseFloat(String(i.discounted_price)) || 0;
      const name = i.item_type === "service"
        ? (catalog.servicesById.get(i.item_id)?.name ??
          (console.warn(
            `[promo items] service id=${i.item_id} no encontrado en catálogo`,
          ),
            "Servicio"))
        : (catalog.packsById.get(i.item_id)?.short_name ??
          catalog.packsById.get(i.item_id)?.title ??
          (console.warn(
            `[promo items] pack id=${i.item_id} no encontrado en catálogo`,
          ),
            "Pack"));
      const typeChar = i.item_type === "pack" ? "p" : "s";
      rows.push({
        id: `pitem_${promoId}_${typeChar}_${i.item_id}`,
        title: name.trim().slice(0, TITLE_MAX),
        description: `S/ ${formatSoles(price)}`.slice(0, DESC_MAX),
      });
    }
    rows.push({
      id: "ver_promos",
      title: "Ver otras promos",
      description: "Volver al listado de promos",
    });
    rows.push({
      id: "menu",
      title: "Menú principal",
      description: "Volver al inicio",
    });
    const desc = (promo.description ?? "").trim().slice(0, 200);
    const body = (desc ? `${desc}\n\n` : "") +
      "Elige un ítem para agregarlo al carrito al precio de la promo:";
    const ok = await sendInteractiveList(
      phoneNumber,
      promo.emoji + " " + promo.title,
      body,
      "Elegir ítem",
      [{ title: "Ítems de la promo", rows: rows.slice(0, 10) }],
    );
    if (!ok) {
      await rt.senders.sendMessage(
        phoneNumber,
        body + "\n\nResponde *menu* para volver al inicio.",
      );
    }
    return true;
  }

  if (userInput.startsWith(WA_IDS.CATEGORY_PREFIX)) {
    if (!isInteractive) {
      await sendCategoriesList(phoneNumber, catalog.categories);
      return true;
    }
    const categoryId = userInput.slice(WA_IDS.CATEGORY_PREFIX.length);
    const cat = catalog.categories.find((c) => c.id === categoryId);
    const svcs = catalog.servicesByCategory.get(categoryId) ?? [];
    const packsList = catalog.packsByCategory.get(categoryId) ?? [];
    const packsForList = catalogPacksToForList(packsList);
    if (!cat || (svcs.length === 0 && packsList.length === 0)) {
      await rt.senders.sendMessage(
        phoneNumber,
        "No hay servicios ni packs en esta categoría.",
      );
      await sendCategoriesList(phoneNumber, catalog.categories);
      return true;
    }
    type SvcRow = {
      id: string;
      name: string;
      short_name?: string | null;
      price: string;
      duration: number;
      subcategory: string | null;
    };
    if (categoryId === "cat-unas") {
      if (svcs.length > 0) {
        await sendUnasSubcategoriesList(
          phoneNumber,
          svcs as SvcRow[],
          packsForList,
        );
      } else {
        await sendServicesList(phoneNumber, cat.name, [], false, packsForList);
      }
    } else if (categoryId === "cat-extensiones") {
      if (svcs.length > 0) {
        await sendExtensionesSubcategoriesList(
          phoneNumber,
          svcs as SvcRow[],
          packsForList,
        );
      } else {
        await sendServicesList(phoneNumber, cat.name, [], false, packsForList);
      }
    } else if (svcs.length + packsForList.length > WA_MAX_CONTENT) {
      await sendCategoryViewChoice(
        phoneNumber,
        cat.name,
        categoryId,
        svcs.length,
        packsForList.length,
      );
    } else {
      await sendServicesList(phoneNumber, cat.name, svcs, false, packsForList);
    }
    return true;
  }

  if (
    userInput.startsWith(WA_IDS.PACK_PREFIX) &&
    !isCatalogPageInteractiveId(userInput)
  ) {
    if (!isInteractive) {
      await rt.senders.sendMessage(
        phoneNumber,
        "Elige un pack de la lista de la categoría que te enviamos. Si no la ves, escribe *menu*.",
      );
      await sendCategoriesList(phoneNumber, catalog.categories);
      return true;
    }
    const packId = userInput.slice(WA_IDS.PACK_PREFIX.length);
    const pack = catalog.packsById.get(packId);
    if (!pack) {
      await rt.senders.sendMessage(
        phoneNumber,
        "Pack no encontrado. Intenta de nuevo.",
      );
      return true;
    }
    const { resolveCartItemPrice } = await import(
      "../../lib/services-catalog.ts"
    );
    const catalogPrice = parseFloat(String(pack.pack_price)) || 0;
    const price = resolveCartItemPrice(catalog, "pack", pack.id, catalogPrice);
    {
      const { tryCapturePartyServiceTap } = await import("../party-booking.ts");
      if (
        await tryCapturePartyServiceTap(
          supabase,
          phoneNumber,
          pack.id,
          "pack",
          price,
        )
      ) {
        return true;
      }
    }
    await addCartItems(supabase, phoneNumber, [
      { item_type: "pack", item_id: pack.id, quantity: 1, price },
    ]);
    await openBookingAfterCartAdd(supabase, phoneNumber, catalog);
    return true;
  }

  // Portafolio: lista de servicios con fotos (no agrega al carrito)
  {
    const {
      isPortfolioListId,
      parsePortfolioListServiceId,
      sendPortfolioImagesForService,
      getPortfolioInstagramFallback,
    } = await import("../../lib/portfolio.ts");
    if (isPortfolioListId(userInput)) {
      if (!isInteractive) {
        await rt.senders.sendMessage(
          phoneNumber,
          "Elige un servicio de la lista de fotos que te enviamos 👇",
        );
        return true;
      }
      const serviceId = parsePortfolioListServiceId(userInput);
      const svc = catalog.servicesById.get(serviceId);
      const ok = await sendPortfolioImagesForService(
        supabase,
        phoneNumber,
        serviceId,
        svc?.name,
      );
      if (!ok) {
        await rt.senders.sendMessage(
          phoneNumber,
          getPortfolioInstagramFallback(),
        );
      }
      return true;
    }
  }

  if (
    userInput.startsWith(WA_IDS.SERVICE_PREFIX) &&
    !isCatalogPageInteractiveId(userInput)
  ) {
    if (!isInteractive) {
      await rt.senders.sendMessage(
        phoneNumber,
        "Elige un servicio de la lista que te enviamos. Si no la ves, escribe *menu*.",
      );
      await sendCategoriesList(phoneNumber, catalog.categories);
      return true;
    }
    let serviceId = userInput.slice(WA_IDS.SERVICE_PREFIX.length);
    if (serviceId.includes("_i")) serviceId = serviceId.replace(/_i\d+$/, "");
    const svc = catalog.servicesById.get(serviceId);
    if (!svc) {
      const title = getInteractiveTitle(message)?.trim();
      const handed = await tryHandOffUnrecognizedToHaiku({
        phoneNumber,
        contactName,
        catalog,
        supabase,
        phoneCountry,
        wabaConfig,
        haikuRuntime,
        session: rt.session ?? null,
        prompt: title ||
          "La clienta eligió un servicio que ya no está en el catálogo. Ayúdala a elegir otro.",
      });
      if (handed) return true;
      await sendCategoriesList(phoneNumber, catalog.categories);
      return true;
    }
    const { resolveCartItemPrice } = await import(
      "../../lib/services-catalog.ts"
    );
    const catalogPrice = parseFloat(String(svc.price)) || 0;
    const price = resolveCartItemPrice(
      catalog,
      "service",
      serviceId,
      catalogPrice,
    );
    {
      const { tryCapturePartyServiceTap } = await import("../party-booking.ts");
      if (
        await tryCapturePartyServiceTap(
          supabase,
          phoneNumber,
          serviceId,
          "service",
          price,
        )
      ) {
        return true;
      }
    }
    await addToCart(supabase, phoneNumber, serviceId, price);
    await openBookingAfterCartAdd(supabase, phoneNumber, catalog);
    return true;
  }

  if (userInput === WA_IDS.AGREGAR_OTRO) {
    if (rt.session?.step === "awaiting_datetime") {
      // Conserva el día (Alberto VE …0417: 12:30 + agregar extensiones).
      // La hora se revalida al volver al carrito (almuerzo Stephani / duración).
      await upsertSession(supabase, phoneNumber, {
        step: "browsing",
        parsed_datetime: null,
      });
    }
    await sendCategoriesAndPromosListFromCatalog(
      phoneNumber,
      catalog.categories,
      catalog.promotions.length > 0,
    );
    return true;
  }

  if (
    userInput === WA_IDS.VER_SELECCION ||
    userInput === WA_IDS.VOLVER_CARRITO
  ) {
    // Batch 3: tap / "ver mi selección" puro → dump estático. Texto mixto
    // ("cuánto sería el total si le agrego lifting") → Haiku primero.
    if (
      userInput === WA_IDS.VER_SELECCION &&
      (await tryHaikuFirstUnlessMostly(
        Boolean(interactiveId) || isMostlyCartInspectQuestion(lower),
        {
          phoneNumber,
          contactName,
          catalog,
          supabase,
          phoneCountry,
          wabaConfig,
          haikuRuntime,
          session: rt.session ?? null,
          prompt: messageText,
        },
      ))
    ) {
      return true;
    }
    const cartItems = rt.session?.cartItems ?? [];
    const hasItems = cartItems.length > 0;
    if (!hasItems) {
      const { findRecentQuotedOfferIds, filterNonConflictingQuotedOfferIds } =
        await import("../../lib/pending-price-cta.ts");
      const { resolveCartItemPrice } = await import(
        "../../lib/services-catalog.ts"
      );
      const allQuoted = await findRecentQuotedOfferIds(
        supabase,
        phoneNumber,
        catalog,
      );
      const recoveredIds = filterNonConflictingQuotedOfferIds(
        allQuoted,
        catalog,
      );
      if (recoveredIds.length > 0) {
        const toAdd = [];
        for (const id of recoveredIds) {
          const pack = catalog.packsById.get(id);
          const svc = catalog.servicesById.get(id);
          if (pack) {
            toAdd.push({
              item_type: "pack" as const,
              item_id: pack.id,
              quantity: 1,
              price: resolveCartItemPrice(
                catalog,
                "pack",
                pack.id,
                parseFloat(String(pack.pack_price)) || 0,
              ),
            });
          } else if (svc) {
            toAdd.push({
              item_type: "service" as const,
              item_id: svc.id,
              quantity: 1,
              price: resolveCartItemPrice(
                catalog,
                "service",
                svc.id,
                parseFloat(String(svc.price)) || 0,
              ),
            });
          }
        }
        if (toAdd.length > 0) {
          await addCartItems(supabase, phoneNumber, toAdd);
          await openBookingAfterCartAdd(supabase, phoneNumber, catalog);
          return true;
        }
      }
      await rt.senders.sendMessage(
        phoneNumber,
        "Tu selección está vacía. ¿Quieres agregar servicios o packs?",
      );
      await sendCategoriesList(phoneNumber, catalog.categories);
    } else {
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
      const summary = formatCartSummaryFromLines(lines);
      await sendCartOptions(phoneNumber, summary, true);
    }
    return true;
  }

  if (userInput === WA_IDS.VOLVER_FECHAS) {
    await upsertSession(supabase, phoneNumber, {
      step: "awaiting_datetime",
      selected_day: null,
      parsed_datetime: null,
    });
    const sessForDates = {
      ...(rt.session ?? {}),
      selected_day: null,
      serviceIds: rt.session?.serviceIds ?? [],
    };
    await resendDatetimeSelectors(
      phoneNumber,
      supabase,
      sessForDates,
      catalog,
      { debounce: false },
    );
    return true;
  }

  if (userInput === WA_IDS.VACIAR_CARRITO) {
    await clearCart(supabase, phoneNumber);
    await rt.senders.sendMessage(
      phoneNumber,
      "Carrito vaciado. ¿En qué más podemos ayudarte?",
    );
    await sendMenuWithPromos(phoneNumber, supabase);
    return true;
  }

  if (userInput === WA_IDS.AGENDAR_YA) {
    const fastDone = await tryCompleteBookingFromText(
      supabase,
      phoneNumber,
      messageText,
      rt.session ?? null,
      catalog,
    );
    if (fastDone) return true;
    await proceedToBookingWithCurrentCart(
      supabase,
      phoneNumber,
      rt.session ?? null,
      catalog,
    );
    return true;
  }

  return false;
}
