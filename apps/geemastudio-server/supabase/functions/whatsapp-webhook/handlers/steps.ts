// steps.ts — Steps por sesión: foto previa al servicio y captura de pago

import { sendMessage } from '../wa-api.ts'
import { getSession, upsertSession, clearCart } from '../lib/supabase.ts'
import { uploadWhatsAppMedia } from '../lib/notify.ts'
import {
  processPaymentScreenshot,
  sendConfirmedBookingSummary,
  type PaymentCtx,
} from './payment.ts'
import { sendMenuWithPromos, type MenuCtx } from './menu.ts'

export async function handleAwaitingPreServicePhoto(
  ctx: PaymentCtx,
  phoneNumber: string,
  message: Record<string, unknown>
): Promise<boolean> {
  const { supabase, tenantId, wa, tenant } = ctx
  if (message.type !== 'image') {
    await sendMessage(
      phoneNumber,
      '📸 Necesito la foto para continuar. Por favor envíala como imagen.\n\n' +
        'Si tenés algún inconveniente, escribinos al negocio.',
      wa
    )
    return true
  }
  const imageData = message.image as Record<string, string>
  const photoUrl = await uploadWhatsAppMedia(
    supabase,
    tenant.waba_access_token,
    imageData.id,
    'pre-service-photos',
    `${phoneNumber}/${Date.now()}_pre_service.jpg`
  )

  const session = await getSession(supabase, tenantId, phoneNumber)
  const pendingAreas = session?.pending_photo_areas
    ? (JSON.parse(session.pending_photo_areas as string) as string[])
    : []

  if (pendingAreas.length >= 2) {
    await upsertSession(supabase, tenantId, phoneNumber, {
      pre_service_photo_url: photoUrl,
      step: 'awaiting_pre_service_photo_2',
      pre_service_photo_requested: false,
    })
    await sendMessage(
      phoneNumber,
      `✅ ¡Foto recibida!\n\n*Foto 2 de 2:* Ahora envía una foto de ${pendingAreas[1]}`,
      wa
    )
  } else {
    await upsertSession(supabase, tenantId, phoneNumber, {
      pre_service_photo_url: photoUrl,
      step: 'awaiting_payment_info',
      pre_service_photo_requested: false,
    })
    const updatedSession = await getSession(supabase, tenantId, phoneNumber)
    await sendConfirmedBookingSummary(ctx, phoneNumber, updatedSession ?? {})
  }
  return true
}

export async function handleAwaitingPreServicePhoto2(
  ctx: PaymentCtx,
  phoneNumber: string,
  message: Record<string, unknown>
): Promise<boolean> {
  const { supabase, tenantId, wa, tenant } = ctx
  if (message.type !== 'image') {
    const session = await getSession(supabase, tenantId, phoneNumber)
    const pendingAreas = session?.pending_photo_areas
      ? (JSON.parse(session.pending_photo_areas as string) as string[])
      : []
    const area2 = pendingAreas[1] ?? 'el área indicada'
    await sendMessage(
      phoneNumber,
      `📸 Necesito la foto de ${area2} para continuar. Por favor enviala como imagen.`,
      wa
    )
    return true
  }
  const imageData = message.image as Record<string, string>
  const photoUrl2 = await uploadWhatsAppMedia(
    supabase,
    tenant.waba_access_token,
    imageData.id,
    'pre-service-photos',
    `${phoneNumber}/${Date.now()}_pre_service_2.jpg`
  )
  await upsertSession(supabase, tenantId, phoneNumber, {
    pre_service_photo_url_2: photoUrl2,
    step: 'awaiting_payment_info',
    pending_photo_areas: null,
  })
  const updatedSession = await getSession(supabase, tenantId, phoneNumber)
  await sendConfirmedBookingSummary(ctx, phoneNumber, updatedSession ?? {})
  return true
}

const CANCEL_KEYWORDS = ['cancelar', 'modificar', 'menu', 'menú', 'empezar de nuevo', 'inicio']

export async function handleAwaitingPaymentScreenshot(
  ctx: PaymentCtx,
  phoneNumber: string,
  message: Record<string, unknown>,
  messageText: string,
  session: Awaited<ReturnType<typeof getSession>>
): Promise<boolean> {
  const { supabase, tenantId, wa } = ctx
  const menuCtx: MenuCtx = {
    supabase,
    tenantId,
    wa,
    tenant: ctx.tenant,
  }

  const rawText =
    (message.type === 'text' && (message as { text?: { body?: string } }).text?.body) ||
    messageText ||
    ''
  const textForCancel = rawText.trim().toLowerCase()
  if (textForCancel && CANCEL_KEYWORDS.some((k) => textForCancel.includes(k))) {
    await clearCart(supabase, tenantId, phoneNumber)
    await upsertSession(supabase, tenantId, phoneNumber, {
      step: 'browsing',
      awaiting_screenshot: false,
      parsed_datetime: null,
      employee_assignments: {},
    })
    await sendMessage(
      phoneNumber,
      'Listo, cancelamos esa reserva. ¿En qué más te podemos ayudar?',
      wa
    )
    await sendMenuWithPromos(phoneNumber, menuCtx)
    return true
  }

  if (message.type !== 'image') {
    await sendMessage(
      phoneNumber,
      'Por favor envía la foto del voucher o captura del comprobante como imagen.\n\n' +
        '_Si querés cancelar, escribí_ *Cancelar*.',
      wa
    )
    return true
  }

  const imageData = message.image as Record<string, string>
  const screenshotUrl = await uploadWhatsAppMedia(
    supabase,
    ctx.tenant.waba_access_token,
    imageData.id,
    'payment-screenshots',
    `${phoneNumber}/${Date.now()}_pago.jpg`
  )
  await processPaymentScreenshot(ctx, phoneNumber, screenshotUrl, session)
  return true
}
