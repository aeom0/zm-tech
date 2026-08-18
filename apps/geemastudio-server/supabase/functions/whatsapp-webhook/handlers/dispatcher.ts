// dispatcher.ts — Entrada multi-tenant: sesión whatsapp_sessions + prefijos CAT_/SVC_/PRM_

import {
  sendMessage as _sendMessage,
  sendInteractiveList as _sendInteractiveList,
  sendImage as _sendImage,
} from '../wa-api.ts'
import {
  formatMoney,
  formatCartSummary,
  formatCartSummaryFromLines,
  orderedServicesFromIds,
  getMenuResponse,
} from '../format.ts'
import { getInteractiveId } from '../lib/parse-message.ts'
import {
  getSession,
  upsertSession,
  addToCart,
  addCartItems,
  clearCart,
  expandCartItemsToServiceIds,
  type SupabaseClient,
  type CartItem,
} from '../lib/supabase.ts'
import { WA_IDS } from '../lib/wa-ids.ts'
import {
  getEmployeeCategoriesMap,
  getConfigText,
  getConfigStringArray,
  getHaikuRuntimeSettings,
  getHaikuTriggerKeywordsFromWaba,
  type WabaConfigMap,
} from '../lib/waba-config.ts'
import {
  isPacksEspecialesAllowed,
  isPacksEspecialesPromo,
  getPacksEspecialesRestrictionMessage,
} from '../lib/promos.ts'
import {
  sendMenuWithPromos,
  sendCategoriesList,
  sendCategoriesAndPromosListFromCatalog,
  sendServicesList,
  sendUnasSubcategoriesList,
  sendExtensionesSubcategoriesList,
  sendPromosListFromCatalog,
  sendCartOptions,
  classifyUnasService,
  getUnasSubcategoryLabel,
  classifyExtensionesService,
  getExtensionesSubcategoryLabel,
  type MenuCtx,
} from './menu.ts'
import type { ServiceCatalog } from '../lib/services-catalog.ts'
import { sendDateSelector, sendTimeSelector } from './agenda.ts'
import { sendConfirmedBookingSummary, type PaymentCtx } from './payment.ts'
import {
  handleAwaitingPreServicePhoto,
  handleAwaitingPreServicePhoto2,
  handleAwaitingPaymentScreenshot,
} from './steps.ts'
import {
  detectAITrigger,
  handleAIMessage,
  generateWelcomeGreeting,
  getFallbackGreeting,
  isAIRateLimited,
  type AIContext,
} from './ai-assistant.ts'
import type { TenantWabaRecord } from '../lib/tenant-resolver.ts'
import type { WaSendConfig } from '../lib/tenant-config.ts'
import { getUtcOffsetHours } from '../lib/timezone.ts'

function lineaContactoHumano(t: TenantWabaRecord): string {
  const digits = t.waba_admin_phones?.[0]?.replace(/\D/g, '') ?? ''
  const brand = t.business_name
  if (!digits) {
    return `Si preferís atención personalizada con *${brand}*, escribinos por los canales oficiales del negocio.\n\n`
  }
  return `Si preferís atención personalizada, escribinos a *${brand}*: https://wa.me/${digits}\n\n`
}

async function proceedToBookingWithCurrentCart(
  supabase: SupabaseClient,
  tenantId: string,
  phoneNumber: string,
  session: {
    cartItems?: {
      item_type: string
      item_id: string
      quantity: number
      price: number
    }[]
    serviceIds?: string[]
  } | null,
  catalog: ServiceCatalog,
  wa: WaSendConfig,
  tenantRecord: TenantWabaRecord,
  employeeCategoriesMap: Record<string, string[]>
): Promise<void> {
  const hasCart = (session?.cartItems?.length ?? 0) > 0 || (session?.serviceIds?.length ?? 0) > 0
  if (!hasCart) {
    await _sendMessage(phoneNumber, 'No tienes servicios en tu selección. Agrega al menos uno.', wa)
    await sendCategoriesList(phoneNumber, catalog.categories, wa)
    return
  }

  const cartItems = session?.cartItems ?? []
  const useCartItems = cartItems.length > 0 && cartItems.some((i) => i.price > 0)
  let summary: string
  let orderedServices: {
    id: string
    name: string
    price: string
    duration: number
    category_id: string | null
  }[]

  if (useCartItems) {
    const lines: {
      name: string
      quantity: number
      unitPrice: number
      duration?: number
    }[] = []
    for (const it of cartItems) {
      if (it.item_type === 'service') {
        const svc = catalog.servicesById.get(it.item_id)
        lines.push({
          name: svc?.name ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
          duration: svc?.duration ?? 60,
        })
      } else {
        const pack = catalog.packsById.get(it.item_id)
        lines.push({
          name: pack?.short_name ?? pack?.title ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
        })
      }
    }
    summary = formatCartSummaryFromLines(lines, tenantRecord.currency_code)
    const ids = await expandCartItemsToServiceIds(supabase, tenantId, cartItems as CartItem[])
    type SvcRowAgenda = {
      id: string
      name: string
      price: string
      duration: number
      category_id: string | null
    }
    const validServices = [...new Set(ids)]
      .map((id: string) => catalog.servicesById.get(id))
      .filter(Boolean) as SvcRowAgenda[]
    orderedServices = orderedServicesFromIds(ids, validServices) as SvcRowAgenda[]
  } else {
    const ids = session?.serviceIds ?? []
    type SvcRowAgenda = {
      id: string
      name: string
      price: string
      duration: number
      category_id: string | null
    }
    const validServices = [...new Set(ids)]
      .map((id: string) => catalog.servicesById.get(id))
      .filter(Boolean) as SvcRowAgenda[]
    orderedServices = orderedServicesFromIds(ids, validServices) as SvcRowAgenda[]
    summary = formatCartSummary(orderedServices, tenantRecord.currency_code)
  }

  const totalMin = orderedServices.reduce((a: number, s: { duration: number }) => a + s.duration, 0)
  await upsertSession(supabase, tenantId, phoneNumber, {
    step: 'awaiting_datetime',
    employee_assignments: {},
  })
  const possibleEmpIds = new Set<string>()
  for (const svc of orderedServices) {
    const catId = (svc as { category_id?: string }).category_id ?? ''
    const allowed = employeeCategoriesMap[catId]
    if (allowed?.length) allowed.forEach((id) => possibleEmpIds.add(id))
  }
  if (possibleEmpIds.size === 0) {
    const { data: allEmps } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
    ;(allEmps ?? []).forEach((e: { id: string }) => possibleEmpIds.add(e.id))
  }
  const minEmployeesFree = 1
  await _sendMessage(phoneNumber, `${summary}\n\n📅 *¿Qué día prefieres?*`, wa)
  await sendDateSelector(
    phoneNumber,
    supabase,
    tenantId,
    tenantRecord,
    wa,
    [...possibleEmpIds],
    totalMin,
    minEmployeesFree
  )
}

const SALUDOS = [
  'hola',
  'buenos días',
  'buenas tardes',
  'buenas noches',
  'hi',
  'hello',
  'menu',
  'menú',
  'inicio',
]

const TARDANZA_KEYWORDS = [
  'voy tarde',
  'llego tarde',
  'estoy tarde',
  'me retraso',
  'me retrase',
  'voy a llegar tarde',
  'llegaré tarde',
  'llegare tarde',
  'voy con retraso',
  'llego con retraso',
  'un poco tarde',
  'algo tarde',
  'llegaré un poco',
  'llegare un poco',
]

const ECHO_TITLES = [
  'servicio agregado',
  'agregar más servicios',
  'ver mi selección',
  'agregar otro servicio',
  'ver otras promos',
  'agregar esta promo al carrito',
  'confirmar promo',
  'ver opciones',
  'elegir',
  'opciones',
  'revisar servicios elegidos',
  'reservar con los servicios elegidos',
  'vaciar carrito',
  'eliminar todo y empezar de cero',
  // Ecos de títulos/descripciones de rows de categorías (Meta los envía como texto extra)
  'ver servicios de esta categoría',
  'elige una categoría',
  'reserva tu próxima cita',
  'servicios y paquetes con precios',
  'consulta nuestros horarios de atención',
  'cómo llegar al salón',
  'ver subcategorías',
  'subcategorías uñas',
  'subcategorías extensiones',
  'elegir más servicios',
  'ver promos activas',
]
const MENU_MAIN_OPTIONS = ['ver_promos', 'agendar_cita', 'ver_servicios', 'horarios', 'ubicacion']
const PITEM_PREFIX = 'pitem_'

export interface DispatchContext {
  body: Record<string, unknown>
  message: Record<string, unknown>
  phoneNumber: string
  contactName: string
  messageText: string
  isNew: boolean
  supabase: SupabaseClient
  tenantId: string
  tenantRecord: TenantWabaRecord
  wa: WaSendConfig
  catalog: ServiceCatalog
  wabaConfig: WabaConfigMap
  fromAd: boolean
  referralHeadline?: string | null
}

/**
 * Procesa un mensaje entrante: obtiene sesión desde whatsapp_sessions,
 * resuelve steps (foto previa, captura de pago) o despacha el flujo principal por prefijos.
 */
export async function dispatch(ctx: DispatchContext): Promise<void> {
  const {
    body: _body,
    message,
    phoneNumber,
    contactName,
    messageText,
    isNew,
    supabase,
    catalog,
    wabaConfig,
    fromAd,
    referralHeadline: _referralHeadline,
    tenantId,
    tenantRecord,
    wa,
  } = ctx

  const paymentCtx: PaymentCtx = {
    supabase,
    tenantId,
    tenant: tenantRecord,
    wa,
  }
  const menuCtx: MenuCtx = {
    supabase,
    tenantId,
    wa,
    tenant: tenantRecord,
  }
  const employeeCategoriesMap = getEmployeeCategoriesMap(wabaConfig)
  const brand = tenantRecord.business_name

  const sendMessage = (to: string, body: string) => _sendMessage(to, body, wa)
  const sendImage = (to: string, url: string, caption?: string) => _sendImage(to, url, wa, caption)
  const sendInteractiveList = (
    to: string,
    header: string,
    body: string,
    btn: string,
    sections: Parameters<typeof _sendInteractiveList>[4]
  ) => _sendInteractiveList(to, header, body, btn, sections, wa)

  const metaAdsImageUrl = getConfigText(wabaConfig, 'meta_ads_hero_image_url', '')
  const metaAdsCaption = getConfigText(
    wabaConfig,
    'meta_ads_hero_caption',
    `Promoción activa — ${brand}`
  )
  // Imágenes 2 y 3 opcionales — solo se envían si tienen URL configurada
  const metaAdsImage2Url = getConfigText(wabaConfig, 'meta_ads_image_2_url', '')
  const metaAdsImage2Caption = getConfigText(wabaConfig, 'meta_ads_image_2_caption', '')
  const metaAdsImage3Url = getConfigText(wabaConfig, 'meta_ads_image_3_url', '')
  const metaAdsImage3Caption = getConfigText(wabaConfig, 'meta_ads_image_3_caption', '')
  const metaAdsServicesText = getConfigText(
    wabaConfig,
    'meta_ads_services_text',
    `✨ ¡Hola{nombre}!\nEn *${brand}* tenemos servicios y promos para vos. Revisá el menú con *Ver opciones* y elegí lo que necesitás.`
  )
  const tardanzaImageUrl = getConfigText(wabaConfig, 'tardanza_image_url', '')
  const adminPhoneHint = tenantRecord.waba_admin_phones?.[0]?.trim() ?? ''
  const tardanzaText = getConfigText(
    wabaConfig,
    'tardanza_message_text',
    adminPhoneHint
      ? `¡Gracias por avisar! Manejamos una tolerancia de *hasta 10 minutos*. Si llegás después, la cita puede reprogramarse según disponibilidad.\n\nPara coordinar, escribinos al 📱 *${adminPhoneHint}*.`
      : '¡Gracias por avisar! Manejamos una tolerancia de *hasta 10 minutos*. Si llegás después, la cita puede reprogramarse según disponibilidad. Coordiná con el equipo del negocio.'
  )
  const horariosText = getConfigText(
    wabaConfig,
    'horarios_text',
    '🕐 *Horarios*\n\nConsultá en el menú o con el equipo los horarios de atención actualizados.'
  )
  const ubicacionText = getConfigText(
    wabaConfig,
    'ubicacion_text',
    '📍 *Ubicación*\n\nPedile al equipo la dirección o el enlace a mapas del local.'
  )

  const haikuRuntime = getHaikuRuntimeSettings(wabaConfig)

  const msgType = message?.type
  const hasInteractive =
    message && typeof (message as Record<string, unknown>).interactive === 'object'
  const session = await getSession(supabase, tenantId, phoneNumber)

  // ── Anti-spam: silenciar mensajes de bots de terceros ────────────────────────
  // No responder a mensajes que claramente NO son de clientes reales.
  // El silencio es intencional: responder activa loops con bots de operadores.
  const FALLBACK_BLOCKED_PHONE_NUMBERS: string[] = [
    // Operadoras/bots reportados en producción
    '51907976917',
    '519810020000',
    '51981002000',
  ]

  const configuredBlocked = getConfigStringArray(wabaConfig, 'blocked_phone_numbers', 'phones', [])

  const blockedSet = new Set<string>([...FALLBACK_BLOCKED_PHONE_NUMBERS, ...configuredBlocked])

  const SPAM_PATTERNS: string[] = [
    // Bot de Entel (detectado en producción 2026-03-18)
    'por favor, escoge una de las siguientes opciones',
    '#juevesentel',
    'botm.cc/',
    'app mi entel',
    'en entel te escuchamos',
    '¡tranqui! puedes volver a escribirme para iniciar una nueva conversación',
    'estoy listo para ayudarte. 🤖',
    'el número de teléfono ingresado es incorrecto',
    'número postpago válido',
    'no pude completar tu solicitud debido a que no ingresaste',
    'ingresa tu número entel postpago',
    // Patrones genéricos de bots de operadores
    'participa hoy mismo por',
    'inscríbete ahora',
    'inscribete ahora',
    'llévate tu nueva consola',
    'llevate tu nueva consola',
    'sorteazo',
  ]

  const msgNormalized = messageText.trim().toLowerCase()
  const isSpamMessage = SPAM_PATTERNS.some((pattern) =>
    msgNormalized.includes(pattern.toLowerCase())
  )

  if (blockedSet.has(phoneNumber)) {
    console.log(`[ANTI-SPAM] Número bloqueado: ${phoneNumber}`)
    return // Silencio total — no responder
  }

  if (isSpamMessage) {
    console.log(`[ANTI-SPAM] Mensaje ignorado de ${phoneNumber}: "${messageText.slice(0, 80)}"`)
    return // Silencio total — no responder
  }

  // ── Button reply de plantillas (ej. recordatorio_cita_zm) ───────────────────
  if (msgType === 'interactive') {
    const interactive = message?.interactive as Record<string, unknown> | undefined
    if (interactive?.type === 'button_reply') {
      const buttonTitle = (interactive.button_reply as Record<string, string>)?.title ?? ''
      if (buttonTitle === 'Confirmo mi cita') {
        await _sendMessage(phoneNumber, '¡Listo! Tu cita quedó confirmada. ¡Te esperamos!', wa)
        return
      }
      if (buttonTitle === 'Necesito reprogramar') {
        await _sendMessage(
          phoneNumber,
          'Entendido. ¿Para cuándo te gustaría reprogramar tu cita? Contanos qué día y horario te funciona mejor.',
          wa
        )
        return
      }
    }
  }

  if (session?.step === 'awaiting_pre_service_photo') {
    await handleAwaitingPreServicePhoto(paymentCtx, phoneNumber, message)
    return
  }

  if (session?.step === 'awaiting_pre_service_photo_2') {
    await handleAwaitingPreServicePhoto2(paymentCtx, phoneNumber, message)
    return
  }

  if (session?.step === 'awaiting_payment_screenshot' || session?.awaiting_screenshot) {
    await handleAwaitingPaymentScreenshot(paymentCtx, phoneNumber, message, messageText, session)
    return
  }

  const interactiveId = getInteractiveId(message)
  const isInteractive = msgType === 'interactive' || hasInteractive
  let userInput = (interactiveId || messageText).trim()
  const lower = userInput.toLowerCase()

  // Negaciones/despedidas: limpiar carrito, suprimir nudges futuros y responder amablemente
  const NEGACIONES = [
    'no quiero',
    'no deseo',
    'no gracias',
    'no, gracias',
    'ya no',
    'ya no quiero',
    'no por ahora',
    'no agendar',
    'no me interesa',
    'no necesito',
    'disculpa y gracias',
    'gracias pero no',
    'tal vez después',
    'quizás después',
    'después lo veo',
    'luego lo veo',
    'lo pienso',
    'lo pensaré',
  ]
  if (!interactiveId && messageText && NEGACIONES.some((k) => lower.includes(k))) {
    await clearCart(supabase, tenantId, phoneNumber)
    await _sendMessage(
      phoneNumber,
      '¡Dale! Cuando quieras agendar o ver servicios, aquí estamos. ¡Que tengas un excelente día!',
      wa
    )
    return
  }

  if (!interactiveId && messageText) {
    if (['agregar', 'agregar otro', 'otro servicio'].some((k) => lower.includes(k)))
      userInput = WA_IDS.AGREGAR_OTRO
    else if (
      ['ver selección', 'ver mi selección', 'ver seleccion', 'mi selección'].some((k) =>
        lower.includes(k)
      )
    )
      userInput = WA_IDS.VER_SELECCION
    // "agendar" solo si NO hay negación en la frase
    else if (
      ['agendar', 'agendar ya', 'reservar'].some((k) => lower.includes(k)) &&
      !NEGACIONES.some((n) => lower.includes(n))
    )
      userInput = WA_IDS.AGENDAR_YA
    else if (
      ['vaciar', 'vaciar carrito', 'vaciar selección', 'empezar de cero'].some((k) =>
        lower.includes(k)
      )
    )
      userInput = WA_IDS.VACIAR_CARRITO
    // Intenciones de navegación en texto libre → flujo determinístico
    else if (
      ['promo', 'promos', 'promocion', 'promociones', 'oferta', 'ofertas', 'descuento'].some((k) =>
        lower.includes(k)
      )
    )
      userInput = 'ver_promos'
    else if (['servicio', 'servicios', 'pack', 'packs', 'paquete'].some((k) => lower.includes(k)))
      userInput = 'ver_servicios'
    else if (['cita', 'quiero una cita', 'hacer una cita'].some((k) => lower.includes(k)))
      userInput = 'agendar_cita'
    // Respuestas afirmativas: solo redirigen a agendar si hay carrito activo
    else if (
      [
        'sí',
        'si',
        'dale',
        'claro',
        'quiero',
        'ok',
        'okay',
        'perfecto',
        'listo',
        'ya',
        'sip',
        'yep',
      ].some((k) => lower === k)
    ) {
      const hasCart =
        (session?.cartItems?.length ?? 0) > 0 || (session?.serviceIds?.length ?? 0) > 0
      if (hasCart) userInput = WA_IDS.AGENDAR_YA
    }
  }

  const hasActiveFlow = session?.step && session.step !== 'browsing'
  if (
    hasActiveFlow &&
    (lower.includes('menu') || lower.includes('menú') || lower.includes('inicio'))
  ) {
    await clearCart(supabase, tenantId, phoneNumber)
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return
  }

  if (!interactiveId && (isNew || SALUDOS.some((s) => messageText.toLowerCase().includes(s)))) {
    // ── Recuperar carrito abandonado ─────────────────────────────────────────
    if (session?.cartItems?.length) {
      await sendMessage(
        phoneNumber,
        `Ya tienes ${session.cartItems.length} ítem(s) en tu selección. Puedes *ver selección*, *agregar* más o *vaciar* para empezar de cero.`
      )
      await sendMenuWithPromos(phoneNumber, menuCtx)
      return
    }

    await upsertSession(supabase, tenantId, phoneNumber, { step: 'browsing' })
    const firstName = contactName.split(' ')[0]
    const promoTitles = catalog.promotions.map((p) => p.title)

    if (isNew && fromAd) {
      // ── Cliente nueva desde Meta Ads → flujo fijo (sin saludo Haiku) ─────────
      // Enviar imágenes Meta Ads (1 obligatoria + 2 y 3 opcionales)
      const metaAdsImages = [
        { url: metaAdsImageUrl, caption: metaAdsCaption },
        { url: metaAdsImage2Url, caption: metaAdsImage2Caption },
        { url: metaAdsImage3Url, caption: metaAdsImage3Caption },
      ]
      for (const img of metaAdsImages) {
        if (img.url) await sendImage(phoneNumber, img.url, img.caption || undefined)
      }
      await sendMessage(
        phoneNumber,
        metaAdsServicesText.replace('{nombre}', firstName ? `, ${firstName}` : '')
      )
      await sendMessage(
        phoneNumber,
        '¿Cuál es tu servicio de interés?\n\n' +
          lineaContactoHumano(tenantRecord) +
          'Abajo tenés el menú con promos, packs y servicios disponibles.'
      )
      await sendMenuWithPromos(phoneNumber, menuCtx, {
        variant: 'after_meta_ads',
      })
      return
    }

    if (isNew && !fromAd) {
      // ── Cliente nueva orgánica → saludo Haiku + menú completo ────────────────
      const rateLimited = await isAIRateLimited(
        supabase,
        tenantId,
        phoneNumber,
        haikuRuntime.rate_limit_per_hour
      )
      const generated = !rateLimited
        ? await generateWelcomeGreeting(
            haikuRuntime,
            firstName,
            promoTitles,
            false,
            supabase,
            phoneNumber,
            tenantId,
            tenantRecord.timezone
          )
        : null
      const greeting =
        generated && generated.trim().length > 0
          ? generated
          : getFallbackGreeting(firstName, false, haikuRuntime, tenantRecord.timezone)
      await sendMessage(phoneNumber, greeting)
      await sendMenuWithPromos(phoneNumber, menuCtx)
      await sendMessage(
        phoneNumber,
        '¿Tenés alguna duda? Escribime con confianza, estoy acá para ayudarte.'
      )
      return
    }

    // ── Cliente recurrente con saludo → menú directo (ya la conocemos) ────────
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return
  }

  if (!userInput && !messageText.trim()) {
    if (message.type === 'interactive') {
      await sendMessage(phoneNumber, 'No pude procesar la opción. Escribe *menu* para ver el menú.')
    }
    return
  }

  if (!isInteractive && messageText.trim()) {
    const msgLower = messageText.trim().toLowerCase()
    // Detectar ecos de títulos/descripciones de rows interactivos que Meta envía como texto extra
    const isCategoryEcho = catalog.categories.some((c) => c.name.toLowerCase() === msgLower)
    const isServiceEcho = catalog.services.some(
      (s) => s.name.toLowerCase() === msgLower || (s.short_name ?? '').toLowerCase() === msgLower
    )
    const isPackEcho = catalog.packs.some(
      (p) => p.title.toLowerCase() === msgLower || (p.short_name ?? '').toLowerCase() === msgLower
    )
    if (isCategoryEcho || isServiceEcho || isPackEcho || ECHO_TITLES.includes(msgLower)) {
      // Silenciar: el mensaje interactivo real ya fue procesado en paralelo
      return
    }
  }

  if (MENU_MAIN_OPTIONS.includes(userInput) && session?.step && session.step !== 'browsing') {
    await clearCart(supabase, tenantId, phoneNumber)
  }

  if (session?.step === 'awaiting_datetime' && !MENU_MAIN_OPTIONS.includes(userInput)) {
    if (userInput.startsWith(WA_IDS.DATE_PREFIX)) {
      const dateKey = userInput.slice(WA_IDS.DATE_PREFIX.length)
      const serviceIds = session.serviceIds ?? []
      const validSvcs = serviceIds
        .map((id: string) => catalog.servicesById.get(id))
        .filter(Boolean) as { duration: number }[]
      const totalDuration = validSvcs.reduce(
        (a: number, s: { duration: number }) => a + s.duration,
        0
      )
      const empIds = Object.values(session.employeeAssignments ?? {}).filter(Boolean) as string[]
      const minEmployeesFree = 1
      await sendTimeSelector(
        phoneNumber,
        supabase,
        tenantId,
        tenantRecord,
        wa,
        dateKey,
        empIds.length
          ? empIds
          : ((
              await supabase
                .from('employees')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('is_active', true)
            ).data?.map((e: { id: string }) => e.id) ?? []),
        totalDuration,
        minEmployeesFree
      )
      return
    }

    if (userInput.startsWith(WA_IDS.TIME_PREFIX)) {
      const raw = userInput.slice(WA_IDS.TIME_PREFIX.length)
      const [datePart, timePart] = raw.split('T')
      const [year, month, day] = datePart.split('-').map(Number)
      const hourWall = parseInt(timePart.slice(0, 2), 10)
      const off = getUtcOffsetHours(tenantRecord.timezone)
      const chosenDate = new Date(Date.UTC(year, month - 1, day, hourWall + off, 0, 0))
      const serviceIds = session.serviceIds ?? []
      const validServices = serviceIds
        .map((id: string) => catalog.servicesById.get(id))
        .filter(Boolean)
      if (validServices.length === 0) {
        await clearCart(supabase, tenantId, phoneNumber)
        await sendMessage(
          phoneNumber,
          'Tu selección ya no está disponible. Agrega servicios de nuevo.'
        )
        await sendCategoriesList(phoneNumber, catalog.categories, wa)
        return
      }
      await upsertSession(supabase, tenantId, phoneNumber, {
        step: 'awaiting_payment_info',
        parsed_datetime: chosenDate.toISOString(),
        employee_assignments: {},
      })
      const sessionNow = await getSession(supabase, tenantId, phoneNumber)
      await sendConfirmedBookingSummary(paymentCtx, phoneNumber, sessionNow ?? {})
      return
    }

    // Usuario escribió texto (ej. "no me salió el botón"): solo repetir instrucción, sin reenviar selector
    // para no mostrar "No hay fechas disponibles" por fallo de lista y que no se confunda con la IA
    if (messageText.trim()) {
      await sendMessage(
        phoneNumber,
        'Para elegir la fecha y la hora, usa los *botones del selector* que te enviamos arriba. Si no ves los botones, escribe *menu* para volver al inicio y reintentar.'
      )
      return
    }
    return
  }

  if (
    session?.step &&
    session.step !== 'browsing' &&
    (lower.includes('cancelar') || lower.includes('menu'))
  ) {
    await clearCart(supabase, tenantId, phoneNumber)
    await sendMessage(phoneNumber, 'Flujo cancelado. ¿En qué más podemos ayudarte?')
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return
  }

  if (!userInput) return

  if (userInput === 'agendar_cita') {
    const hasCart = (session?.cartItems?.length ?? 0) > 0 || (session?.serviceIds?.length ?? 0) > 0
    if (hasCart) {
      await proceedToBookingWithCurrentCart(
        supabase,
        tenantId,
        phoneNumber,
        session ?? null,
        catalog,
        wa,
        tenantRecord,
        employeeCategoriesMap
      )
      return
    }
    if (session?.step && session.step !== 'browsing')
      await clearCart(supabase, tenantId, phoneNumber)
    // Mostrar promos + categorías para que la usuaria pueda elegir primero qué servicio quiere
    await sendCategoriesAndPromosListFromCatalog(
      phoneNumber,
      catalog.categories,
      catalog.promotions.length > 0,
      wa
    )
    return
  }

  if (userInput === 'ver_servicios' || userInput === WA_IDS.VOLVER_CATEGORIAS) {
    if (session?.step && session.step !== 'browsing')
      await clearCart(supabase, tenantId, phoneNumber)
    const hasCart = (session?.cartItems?.length ?? 0) > 0 || (session?.serviceIds?.length ?? 0) > 0
    if (hasCart) {
      await sendCategoriesAndPromosListFromCatalog(
        phoneNumber,
        catalog.categories,
        catalog.promotions.length > 0,
        wa
      )
    } else {
      await sendCategoriesList(phoneNumber, catalog.categories, wa)
    }
    return
  }

  if (userInput === 'menu' && isInteractive) {
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return
  }

  if (userInput === 'ver_promos') {
    if (session?.step && session.step !== 'browsing')
      await clearCart(supabase, tenantId, phoneNumber)
    await sendPromosListFromCatalog(phoneNumber, catalog.promotions, wa)
    return
  }

  if (userInput === 'horarios') {
    await sendMessage(phoneNumber, horariosText)
    await sendMessage(
      phoneNumber,
      '¿Quieres agendar una cita o ver servicios? Te dejo el menú de nuevo 👇'
    )
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return
  }

  if (userInput === 'ubicacion') {
    await sendMessage(phoneNumber, ubicacionText)
    await sendMessage(
      phoneNumber,
      '¿Quieres agendar una cita o ver servicios? Te dejo el menú de nuevo 👇'
    )
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return
  }

  if (userInput === '1' || lower === 'ver servicios') {
    await sendCategoriesList(phoneNumber, catalog.categories, wa)
    return
  }
  if (userInput === '2' || lower.includes('promos') || lower.includes('packs')) {
    await sendPromosListFromCatalog(phoneNumber, catalog.promotions, wa)
    return
  }
  if (userInput === '3' || lower === 'agendar' || lower === 'reservar') {
    await sendCategoriesList(phoneNumber, catalog.categories, wa)
    return
  }

  if (userInput.startsWith(WA_IDS.SUBCATEGORY_PREFIX)) {
    const payload = userInput.slice(WA_IDS.SUBCATEGORY_PREFIX.length)
    const [categoryId, subKeyRaw] = payload.split('__')
    if (!categoryId || !subKeyRaw) {
      await sendMessage(
        phoneNumber,
        'No pude procesar la subcategoría. Escribe *menu* para empezar de nuevo.'
      )
      return
    }
    type SvcRow = {
      id: string
      name: string
      short_name?: string | null
      price: string
      duration: number
      subcategory: string | null
    }
    const all = (catalog.servicesByCategory.get(categoryId) ?? []) as SvcRow[]
    if (categoryId === 'cat-unas') {
      const filtered = all.filter((svc) => {
        const rawSub = (svc.subcategory ?? '').toLowerCase()
        return rawSub ? rawSub === subKeyRaw : classifyUnasService(svc.name) === subKeyRaw
      })
      if (!filtered.length) {
        await sendMessage(
          phoneNumber,
          'No hay servicios en esa subcategoría. Elige otra opción o escribe *menu* para volver al inicio.'
        )
        return
      }
      await sendServicesList(
        phoneNumber,
        getUnasSubcategoryLabel(subKeyRaw as never),
        filtered,
        wa,
        tenantRecord.currency_code,
        false,
        []
      )
      return
    }
    if (categoryId === 'cat-extensiones') {
      const filtered = all.filter((svc) => {
        const rawSub = (svc.subcategory ?? '').toLowerCase()
        return rawSub ? rawSub === subKeyRaw : classifyExtensionesService(svc.name) === subKeyRaw
      })
      if (!filtered.length) {
        await sendMessage(
          phoneNumber,
          'No hay servicios en esa subcategoría. Elige otra opción o escribe *menu* para volver al inicio.'
        )
        return
      }
      await sendServicesList(
        phoneNumber,
        getExtensionesSubcategoryLabel(subKeyRaw as never),
        filtered,
        wa,
        tenantRecord.currency_code,
        false,
        []
      )
      return
    }
  }

  if (userInput.startsWith(PITEM_PREFIX) && isInteractive) {
    const rest = userInput.slice(PITEM_PREFIX.length)
    const parts = rest.split('_')
    if (parts.length >= 3) {
      const promoId = parts[0]
      const typeChar = parts[1]
      const itemId = parts.slice(2).join('_')
      const itemType = typeChar === 'p' ? 'pack' : 'service'
      const promo = catalog.promotions.find((p) => p.id === promoId)
      if (
        promo &&
        isPacksEspecialesPromo(promo.title, promo.badge) &&
        !isPacksEspecialesAllowed(tenantRecord.timezone)
      ) {
        await sendMessage(phoneNumber, getPacksEspecialesRestrictionMessage())
        await sendPromosListFromCatalog(phoneNumber, catalog.promotions, wa)
        return
      }
      const item = promo?.items.find((i) => i.item_id === itemId)
      if (item) {
        const price = parseFloat(String(item.discounted_price)) || 0
        await addCartItems(supabase, tenantId, phoneNumber, [
          {
            item_type: itemType as 'service' | 'pack',
            item_id: itemId,
            quantity: 1,
            price,
          },
        ])
        const name =
          itemType === 'service'
            ? catalog.servicesById.get(itemId)?.name
            : (catalog.packsById.get(itemId)?.short_name ?? catalog.packsById.get(itemId)?.title)
        await sendCartOptions(phoneNumber, '', true, wa, {
          bodyOverride:
            `✅ ${name ?? 'Ítem'} agregado (precio promo).\n\n` +
            lineaContactoHumano(tenantRecord) +
            `¿Qué querés hacer?`,
          headerOverride: 'Opciones',
        })
        return
      }
    }
    await sendPromosListFromCatalog(phoneNumber, catalog.promotions, wa)
    return
  }

  if (userInput.startsWith('promo_')) {
    if (!isInteractive) {
      await sendMessage(phoneNumber, 'Elige una promo de la lista que te enviamos 👇')
      await sendPromosListFromCatalog(phoneNumber, catalog.promotions, wa)
      return
    }
    const promoId = userInput.slice('promo_'.length)
    const promo = catalog.promotions.find((p) => p.id === promoId)
    if (!promo) {
      await sendPromosListFromCatalog(phoneNumber, catalog.promotions, wa)
      return
    }
    if (
      isPacksEspecialesPromo(promo.title, promo.badge) &&
      !isPacksEspecialesAllowed(tenantRecord.timezone)
    ) {
      await sendMessage(phoneNumber, getPacksEspecialesRestrictionMessage())
      await sendPromosListFromCatalog(phoneNumber, catalog.promotions, wa)
      return
    }
    if (!promo.items.length) {
      await sendMessage(
        phoneNumber,
        `${promo.emoji} *${promo.title}*\n\n${promo.description ?? ''}\n\nEsta promo no tiene ítems configurados. Elige otra o escribe *menu*.`
      )
      return
    }
    const TITLE_MAX = 24
    const DESC_MAX = 72
    const rows: { id: string; title: string; description: string }[] = []
    for (const i of promo.items) {
      const price = parseFloat(String(i.discounted_price)) || 0
      const name =
        i.item_type === 'service'
          ? (catalog.servicesById.get(i.item_id)?.name ??
            (console.warn(`[promo items] service id=${i.item_id} no encontrado en catálogo`),
            'Servicio'))
          : (catalog.packsById.get(i.item_id)?.short_name ??
            catalog.packsById.get(i.item_id)?.title ??
            (console.warn(`[promo items] pack id=${i.item_id} no encontrado en catálogo`), 'Pack'))
      const typeChar = i.item_type === 'pack' ? 'p' : 's'
      rows.push({
        id: `pitem_${promoId}_${typeChar}_${i.item_id}`,
        title: name.trim().slice(0, TITLE_MAX),
        description: `${formatMoney(price, tenantRecord.currency_code)}`.slice(0, DESC_MAX),
      })
    }
    rows.push({
      id: 'ver_promos',
      title: 'Ver otras promos',
      description: 'Volver al listado de promos',
    })
    rows.push({
      id: 'menu',
      title: 'Menú principal',
      description: 'Volver al inicio',
    })
    const desc = (promo.description ?? '').trim().slice(0, 200)
    const body =
      (desc ? `${desc}\n\n` : '') + 'Elige un ítem para agregarlo al carrito al precio de la promo:'
    const ok = await sendInteractiveList(
      phoneNumber,
      promo.emoji + ' ' + promo.title,
      body,
      'Elegir ítem',
      [{ title: 'Ítems de la promo', rows: rows.slice(0, 10) }]
    )
    if (!ok) await sendMessage(phoneNumber, body + '\n\nResponde *menu* para volver al inicio.')
    return
  }

  if (userInput.startsWith(WA_IDS.CATEGORY_PREFIX)) {
    if (!isInteractive) {
      await sendCategoriesList(phoneNumber, catalog.categories, wa)
      return
    }
    const categoryId = userInput.slice(WA_IDS.CATEGORY_PREFIX.length)
    const cat = catalog.categories.find((c) => c.id === categoryId)
    const svcs = catalog.servicesByCategory.get(categoryId) ?? []
    const packsList = catalog.packsByCategory.get(categoryId) ?? []
    if (!cat || (svcs.length === 0 && packsList.length === 0)) {
      await sendMessage(phoneNumber, 'No hay servicios ni packs en esta categoría.')
      await sendCategoriesList(phoneNumber, catalog.categories, wa)
      return
    }
    type SvcRow = {
      id: string
      name: string
      short_name?: string | null
      price: string
      duration: number
      subcategory: string | null
    }
    if (categoryId === 'cat-unas')
      await sendUnasSubcategoriesList(phoneNumber, svcs as SvcRow[], wa)
    else if (categoryId === 'cat-extensiones')
      await sendExtensionesSubcategoriesList(phoneNumber, svcs as SvcRow[], wa)
    else
      await sendServicesList(
        phoneNumber,
        cat.name,
        svcs,
        wa,
        tenantRecord.currency_code,
        false,
        packsList
      )
    return
  }

  if (userInput.startsWith(WA_IDS.PACK_PREFIX)) {
    if (!isInteractive) {
      await sendMessage(
        phoneNumber,
        'Elige un pack de la lista de la categoría que te enviamos. Si no la ves, escribe *menu*.'
      )
      await sendCategoriesList(phoneNumber, catalog.categories, wa)
      return
    }
    const packId = userInput.slice(WA_IDS.PACK_PREFIX.length)
    const pack = catalog.packsById.get(packId)
    if (!pack) {
      await sendMessage(phoneNumber, 'Pack no encontrado. Intenta de nuevo.')
      return
    }
    const price = parseFloat(String(pack.pack_price)) || 0
    await addCartItems(supabase, tenantId, phoneNumber, [
      { item_type: 'pack', item_id: pack.id, quantity: 1, price },
    ])
    const packName = pack.short_name ?? pack.title ?? 'Pack'
    await sendCartOptions(phoneNumber, '', true, wa, {
      bodyOverride:
        `✅ ${packName} agregado.\n\n` + lineaContactoHumano(tenantRecord) + `¿Qué querés hacer?`,
      headerOverride: 'Opciones',
    })
    return
  }

  if (userInput.startsWith(WA_IDS.SERVICE_PREFIX)) {
    if (!isInteractive) {
      await sendMessage(
        phoneNumber,
        'Elige un servicio de la lista que te enviamos. Si no la ves, escribe *menu*.'
      )
      await sendCategoriesList(phoneNumber, catalog.categories, wa)
      return
    }
    let serviceId = userInput.slice(WA_IDS.SERVICE_PREFIX.length)
    if (serviceId.includes('_i')) serviceId = serviceId.replace(/_i\d+$/, '')
    const svc = catalog.servicesById.get(serviceId)
    if (!svc) {
      await sendMessage(phoneNumber, 'Servicio no encontrado. Intenta de nuevo.')
      return
    }
    const price = parseFloat(String(svc.price)) || 0
    await addToCart(supabase, tenantId, phoneNumber, serviceId, price)
    const svcName = svc.name ?? svc.short_name ?? 'Servicio'
    await sendCartOptions(phoneNumber, '', true, wa, {
      bodyOverride:
        `✅ ${svcName} agregado.\n\n` + lineaContactoHumano(tenantRecord) + `¿Qué querés hacer?`,
      headerOverride: 'Opciones',
    })
    return
  }

  if (userInput === WA_IDS.AGREGAR_OTRO) {
    await sendCategoriesAndPromosListFromCatalog(
      phoneNumber,
      catalog.categories,
      catalog.promotions.length > 0,
      wa
    )
    return
  }

  if (userInput === WA_IDS.VER_SELECCION) {
    const cartItems = session?.cartItems ?? []
    const hasItems = cartItems.length > 0
    if (!hasItems) {
      await sendMessage(phoneNumber, 'Tu selección está vacía. ¿Quieres agregar servicios o packs?')
      await sendCategoriesList(phoneNumber, catalog.categories, wa)
    } else {
      const lines: {
        name: string
        quantity: number
        unitPrice: number
        duration?: number
      }[] = []
      for (const it of cartItems) {
        if (it.item_type === 'service') {
          const svc = catalog.servicesById.get(it.item_id)
          lines.push({
            name: svc?.name ?? it.item_id,
            quantity: it.quantity,
            unitPrice: it.price,
            duration: svc?.duration ?? 60,
          })
        } else {
          const pack = catalog.packsById.get(it.item_id)
          lines.push({
            name: pack?.short_name ?? pack?.title ?? it.item_id,
            quantity: it.quantity,
            unitPrice: it.price,
          })
        }
      }
      const summary = formatCartSummaryFromLines(lines, tenantRecord.currency_code)
      await sendCartOptions(phoneNumber, summary, true, wa)
    }
    return
  }

  if (userInput === WA_IDS.VACIAR_CARRITO) {
    await clearCart(supabase, tenantId, phoneNumber)
    await sendMessage(phoneNumber, 'Carrito vaciado. ¿En qué más podemos ayudarte?')
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return
  }

  if (userInput === WA_IDS.AGENDAR_YA) {
    await proceedToBookingWithCurrentCart(
      supabase,
      tenantId,
      phoneNumber,
      session ?? null,
      catalog,
      wa,
      tenantRecord,
      employeeCategoriesMap
    )
    return
  }

  // ── Tardanzas: respuesta determinística con imagen de política ───────────────
  if (!isInteractive && messageText.trim()) {
    const msgLower = messageText.trim().toLowerCase()
    if (TARDANZA_KEYWORDS.some((k) => msgLower.includes(k))) {
      await sendMessage(phoneNumber, tardanzaText)
      if (tardanzaImageUrl.trim()) {
        await sendImage(
          phoneNumber,
          tardanzaImageUrl,
          `Políticas por tardanzas — ${tenantRecord.business_name}`
        )
      }
      return
    }
  }

  // Intentar IA para texto libre en sesión browsing (o sin step activo)
  if (!session?.step || session.step === 'browsing') {
    const haikuKeywords = getHaikuTriggerKeywordsFromWaba(wabaConfig)
    const trigger = detectAITrigger(userInput || messageText, haikuKeywords)
    if (
      trigger &&
      !(await isAIRateLimited(supabase, tenantId, phoneNumber, haikuRuntime.rate_limit_per_hour))
    ) {
      const aiCtx: AIContext = {
        phoneNumber,
        contactName,
        catalog,
        supabase,
        tenantId,
        currencyCode: tenantRecord.currency_code,
        timezone: tenantRecord.timezone,
        businessName: tenantRecord.business_name,
        wa,
      }
      const handled = await handleAIMessage(aiCtx, trigger, wabaConfig)
      if (handled) return
    }
  }

  await sendMessage(phoneNumber, getMenuResponse(userInput))
}
