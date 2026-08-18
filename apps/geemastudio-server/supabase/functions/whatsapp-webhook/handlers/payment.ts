// payment.ts — Resumen de pago, depósito y captura (multi-tenant)

import { sendMessage } from '../wa-api.ts'
import {
  formatMoney,
  formatDateSpanish,
  orderedServicesFromIds,
  isBusinessHoursForSlots,
  toZonedLocalTimestamp,
} from '../format.ts'
import {
  getSession,
  upsertSession,
  expandCartItemsToLines,
  cartItemsToDisplayLabel,
  getPhoneCountryAndNormalizedFromWa,
  type SupabaseClient,
  type CartItem,
} from '../lib/supabase.ts'
import { getConsideracionesPreviasWhatsApp } from '../lib/policies.ts'
import { notifyAdmins, notifyAdminPhonesWa } from '../lib/notify.ts'
import { resolveBusinessHoursForWaba } from '../lib/timezone.ts'
import type { TenantWabaRecord } from '../lib/tenant-resolver.ts'
import type { WaSendConfig } from '../lib/tenant-config.ts'

export function buildMediosDePago(paymentInfo: TenantWabaRecord['waba_payment_info']): string {
  if (!paymentInfo?.methods?.length) {
    return 'Consultá con el negocio los medios de pago disponibles.'
  }
  const lines = paymentInfo.methods.map((m) => `*${m.label}:* ${m.detail}`).join('\n')
  const cn = paymentInfo.contact_name?.trim()
  return `📲 *Medios de pago:*\n\n${lines}${cn ? `\n\n*${cn}*` : ''}`
}

export interface PaymentCtx {
  supabase: SupabaseClient
  tenantId: string
  tenant: TenantWabaRecord
  wa: WaSendConfig
}

export async function sendConfirmedBookingSummary(
  ctx: PaymentCtx,
  phone: string,
  session: Record<string, unknown> & { cartItems?: CartItem[] }
): Promise<void> {
  const { supabase, tenantId, tenant, wa } = ctx
  const cc = tenant.currency_code
  const tz = tenant.timezone
  const { weekday, sunday } = resolveBusinessHoursForWaba(tenant.waba_business_hours, tz)

  const cartItems = session.cartItems ?? []
  const useCartItems = cartItems.length > 0 && cartItems.some((i) => i.price > 0)

  let totalPrice = 0
  let servicesLine = ''
  let allServiceNames = ''
  const categoryIds: string[] = []

  if (useCartItems) {
    const lines: {
      name: string
      quantity: number
      unitPrice: number
      duration?: number
      category_id?: string
    }[] = []
    for (const it of cartItems) {
      if (it.item_type === 'service') {
        const { data: svc } = await supabase
          .from('services')
          .select('id, name, duration, category_id')
          .eq('tenant_id', tenantId)
          .eq('id', it.item_id)
          .maybeSingle()
        lines.push({
          name: (svc as { name: string })?.name ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
          duration: (svc as { duration?: number })?.duration ?? 60,
          category_id: (svc as { category_id?: string })?.category_id,
        })
        if ((svc as { category_id?: string })?.category_id) {
          categoryIds.push((svc as { category_id: string }).category_id)
        }
      } else {
        const { data: pack } = await supabase
          .from('packs')
          .select('name')
          .eq('tenant_id', tenantId)
          .eq('id', it.item_id)
          .maybeSingle()
        const name = (pack as { name?: string })?.name ?? it.item_id
        lines.push({
          name: name as string,
          quantity: it.quantity,
          unitPrice: it.price,
        })
      }
    }
    totalPrice = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
    allServiceNames = lines.map((l) => l.name).join(' + ')
    servicesLine =
      lines.length > 1
        ? lines
            .map(
              (l) =>
                `• ${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.name} — ${formatMoney(l.quantity * l.unitPrice, cc)}`
            )
            .join('\n')
        : `${lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name)).join(' + ')}`
  } else {
    const cartIds = JSON.parse((session.cart_service_ids as string) ?? '[]') as string[]
    if (!cartIds.length) return
    const { data: svcs } = await supabase
      .from('services')
      .select('id, name, price, category_id')
      .eq('tenant_id', tenantId)
      .in('id', [...new Set(cartIds)])
    type SvcRow = {
      id: string
      name: string
      price: string | number
      category_id?: string | null
    }
    const services: SvcRow[] = orderedServicesFromIds(cartIds, svcs ?? [])
    totalPrice = services.reduce((sum: number, s: SvcRow) => sum + parseFloat(String(s.price)), 0)
    allServiceNames = services.map((s: SvcRow) => s.name).join(' + ')
    servicesLine =
      services.length > 1
        ? services
            .map((s: SvcRow) => `• ${s.name} — ${formatMoney(parseFloat(String(s.price)), cc)}`)
            .join('\n')
        : `Servicio: ${services.map((s: SvcRow) => s.name).join(' + ')}`
    services.forEach((s: SvcRow) => {
      const cid = s.category_id ?? undefined
      if (cid) categoryIds.push(cid)
    })
  }

  const { country: waCountry, normalized: waNormalized } = getPhoneCountryAndNormalizedFromWa(phone)
  const { data: clientData } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('phone_country', waCountry)
    .eq('phone_normalized', waNormalized)
    .maybeSingle()

  const appointmentDate = (session.parsed_datetime as string) ?? new Date().toISOString()
  const appointmentDateLocal = toZonedLocalTimestamp(new Date(appointmentDate), tz)

  const createdAppts: { id: string }[] = []
  if (useCartItems) {
    const lines = await expandCartItemsToLines(supabase, tenantId, cartItems)
    const totalDuration = lines.reduce((s, l) => s + (l.duration ?? 60), 0)
    const total = lines.reduce((s, l) => s + l.price, 0)
    allServiceNames = await cartItemsToDisplayLabel(supabase, tenantId, cartItems)
    const { data: svcsForNames } = await supabase
      .from('services')
      .select('id, name, category_id')
      .eq('tenant_id', tenantId)
      .in('id', [...new Set(lines.map((l) => l.service_id))])
    const catIds = new Set<string>()
    for (const line of lines) {
      const svc = (svcsForNames ?? []).find((s: { id: string }) => s.id === line.service_id)
      if ((svc as { category_id?: string })?.category_id)
        catIds.add((svc as { category_id: string }).category_id)
    }
    categoryIds.splice(0, categoryIds.length, ...[...catIds])
    totalPrice = total

    const { data: appt } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? 'Cliente WhatsApp',
        client_phone: phone,
        service_id: lines[0]?.service_id ?? null,
        service_ids: lines.map((l) => l.service_id),
        employee_id: null,
        date: appointmentDateLocal,
        status: 'scheduled',
        price: total.toString(),
        duration: totalDuration,
        source: 'whatsapp',
        whatsapp_phone: phone,
        deposit_amount: 0,
        notes: `Cita agendada vía WhatsApp.${lines.length > 1 ? ` (${allServiceNames})` : ''}`,
      })
      .select()
      .single()

    if (appt?.id) {
      createdAppts.push(appt as { id: string })
      await supabase.from('appointment_services').insert(
        lines.map((l) => ({
          appointment_id: appt.id,
          service_id: l.service_id,
          pack_id: l.pack_id ?? null,
          employee_id: null,
          price: l.price.toString(),
          duration: l.duration ?? 60,
        }))
      )
    }
  } else {
    const cartIds = JSON.parse((session.cart_service_ids as string) ?? '[]') as string[]
    const { data: svcsData } = await supabase
      .from('services')
      .select('id, name, price, duration, category_id')
      .eq('tenant_id', tenantId)
      .in('id', [...new Set(cartIds)])
    type AllSvcRow = {
      id: string
      name: string
      price: string | number
      duration: number | null
      category_id: string | null
    }
    const allServices: AllSvcRow[] = orderedServicesFromIds(cartIds, svcsData ?? [])
    if (!allServices.length) return
    totalPrice = allServices.reduce((s, svc) => s + parseFloat(String(svc.price)), 0)
    allServiceNames = allServices.map((s: AllSvcRow) => s.name).join(' + ')
    categoryIds.splice(
      0,
      categoryIds.length,
      ...([
        ...new Set(allServices.map((s: AllSvcRow) => s.category_id).filter(Boolean)),
      ] as string[])
    )
    const totalDuration = allServices.reduce((s, svc) => s + (svc.duration ?? 60), 0)
    const { data: appt } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? 'Cliente WhatsApp',
        client_phone: phone,
        service_id: allServices[0].id,
        service_ids: allServices.map((s: AllSvcRow) => s.id),
        employee_id: null,
        date: appointmentDateLocal,
        status: 'scheduled',
        price: totalPrice.toString(),
        duration: totalDuration,
        source: 'whatsapp',
        whatsapp_phone: phone,
        deposit_amount: 0,
        notes: `Cita agendada vía WhatsApp.${allServices.length > 1 ? ` (${allServiceNames})` : ''}`,
      })
      .select()
      .single()
    if (appt?.id) {
      createdAppts.push(appt as { id: string })
      await supabase.from('appointment_services').insert(
        allServices.map((svc: AllSvcRow) => ({
          appointment_id: appt.id,
          service_id: svc.id,
          employee_id: null,
          price: parseFloat(String(svc.price)).toString(),
          duration: svc.duration ?? 60,
        }))
      )
    }
  }

  await upsertSession(supabase, tenantId, phone, {
    step: 'completed',
    awaiting_screenshot: false,
    cart_service_ids: [],
    cart_items: [],
  })

  const firstApptId = createdAppts[0]?.id ?? ''
  await notifyAdmins(
    supabase,
    tenantId,
    '📅 Nueva cita agendada (WABA)',
    `${clientData?.name ?? 'Cliente'} — ${allServiceNames} — ${formatDateSpanish(new Date(appointmentDate), tz)}`,
    { screen: 'Agenda', appointmentId: firstApptId }
  )

  const dateStr = formatDateSpanish(new Date(appointmentDate), tz)
  const inHours = isBusinessHoursForSlots(weekday, sunday, tz)
  const consideraciones = getConsideracionesPreviasWhatsApp(categoryIds)
  const consideracionesBlock = consideraciones ? `\n\n${consideraciones}` : ''

  await sendMessage(
    phone,
    inHours
      ? `✅ *¡Tu cita está confirmada!*\n\n` +
          `📋 *Resumen:*\n` +
          `${servicesLine}\n` +
          `📅 Fecha: ${dateStr}\n` +
          `💰 Total: ${formatMoney(totalPrice, cc)}\n\n` +
          `El pago se coordina según las políticas del negocio.\n\n` +
          `¡Te esperamos!${consideracionesBlock}`
      : `✅ *¡Tu cita está anotada!*\n\n` +
          `📋 *Resumen:*\n` +
          `${servicesLine}\n` +
          `📅 Fecha: ${dateStr}\n` +
          `💰 Total: ${formatMoney(totalPrice, cc)}\n\n` +
          `El equipo te confirmará en breve.${consideracionesBlock}`,
    wa
  )
}

export async function sendPaymentSummary(
  ctx: PaymentCtx,
  phone: string,
  session: Record<string, unknown> & { cartItems?: CartItem[] }
) {
  const { supabase, tenantId, tenant, wa } = ctx
  const cc = tenant.currency_code
  const cartItems = session.cartItems ?? []
  const useCartItems = cartItems.length > 0 && cartItems.some((i) => i.price > 0)

  let totalPrice: number
  let servicesLine: string

  if (useCartItems) {
    const lines: {
      name: string
      quantity: number
      unitPrice: number
      duration?: number
    }[] = []
    for (const it of cartItems) {
      if (it.item_type === 'service') {
        const { data: svc } = await supabase
          .from('services')
          .select('name, duration')
          .eq('tenant_id', tenantId)
          .eq('id', it.item_id)
          .maybeSingle()
        lines.push({
          name: (svc as { name: string })?.name ?? it.item_id,
          quantity: it.quantity,
          unitPrice: it.price,
          duration: (svc as { duration?: number })?.duration ?? 60,
        })
      } else {
        const { data: pack } = await supabase
          .from('packs')
          .select('name')
          .eq('tenant_id', tenantId)
          .eq('id', it.item_id)
          .maybeSingle()
        const name = (pack as { name?: string })?.name ?? it.item_id
        lines.push({
          name: name as string,
          quantity: it.quantity,
          unitPrice: it.price,
        })
      }
    }
    totalPrice = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
    servicesLine =
      lines.length > 1
        ? lines
            .map(
              (l) =>
                `• ${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.name} — ${formatMoney(l.quantity * l.unitPrice, cc)}`
            )
            .join('\n')
        : `${lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name)).join(' + ')}`
  } else {
    const cartIds = JSON.parse((session.cart_service_ids as string) ?? '[]') as string[]
    if (!cartIds.length) return
    const { data: svcs } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('tenant_id', tenantId)
      .in('id', [...new Set(cartIds)])
    type SvcRow = { id: string; name: string; price: string | number }
    const services: SvcRow[] = orderedServicesFromIds(cartIds, svcs ?? [])
    totalPrice = services.reduce((sum: number, s: SvcRow) => sum + parseFloat(String(s.price)), 0)
    servicesLine =
      services.length > 1
        ? services
            .map((s: SvcRow) => `• ${s.name} — ${formatMoney(parseFloat(String(s.price)), cc)}`)
            .join('\n')
        : `Servicio: ${services.map((s: SvcRow) => s.name).join(' + ')}`
  }

  const deposit = Math.ceil(totalPrice * 0.2)
  const dateStr = session.parsed_datetime
    ? formatDateSpanish(new Date(session.parsed_datetime as string), tenant.timezone)
    : 'fecha acordada'
  const medios = buildMediosDePago(tenant.waba_payment_info)

  await sendMessage(
    phone,
    `📋 *Resumen de tu reserva:*\n\n` +
      `${servicesLine}\n` +
      `📅 Fecha: ${dateStr}\n` +
      `💰 Total: ${formatMoney(totalPrice, cc)}\n\n` +
      `Para confirmar tu cita, realiza un adelanto del *20% (${formatMoney(deposit, cc)})* vía:\n\n` +
      `${medios}\n\n` +
      `Luego envíame:\n` +
      `• Foto del voucher o captura del comprobante\n` +
      `• Nombre completo y datos que te pida el negocio\n\n` +
      `_El saldo restante (${formatMoney(totalPrice - deposit, cc)}) se acuerda el día de la cita._\n\n` +
      `_Para cancelar o cambiar algo, escribe_ *Cancelar* _.`,
    wa
  )

  await upsertSession(supabase, tenantId, phone, {
    step: 'awaiting_payment_screenshot',
    awaiting_screenshot: true,
  })
}

export async function processPaymentScreenshot(
  ctx: PaymentCtx,
  phoneNumber: string,
  screenshotUrl: string | null,
  session: Awaited<ReturnType<typeof getSession>>
): Promise<void> {
  if (!session) return
  const { supabase, tenantId, tenant, wa } = ctx
  const cc = tenant.currency_code
  const tz = tenant.timezone
  const { weekday, sunday } = resolveBusinessHoursForWaba(tenant.waba_business_hours, tz)

  const { country: waCountry, normalized: waNormalized } =
    getPhoneCountryAndNormalizedFromWa(phoneNumber)
  const { data: clientData } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('phone_country', waCountry)
    .eq('phone_normalized', waNormalized)
    .maybeSingle()

  const appointmentDate = (session.parsed_datetime as string) ?? new Date().toISOString()
  const appointmentDateLocal = toZonedLocalTimestamp(new Date(appointmentDate), tz)
  const cartItems = (session as { cartItems?: CartItem[] }).cartItems ?? []
  const useCartItems = cartItems.length > 0 && cartItems.some((i) => i.price > 0)

  let allServiceNames: string
  let totalPrice: number
  let categoryIds: string[] = []
  const createdAppts: { id: string; price: number }[] = []
  type PaymentLine = { serviceId: string; price: number; duration: number }
  let paymentLines: PaymentLine[] = []

  if (useCartItems) {
    const lines = await expandCartItemsToLines(supabase, tenantId, cartItems)
    totalPrice = lines.reduce((s, l) => s + l.price, 0)
    const serviceIds = [...new Set(lines.map((l) => l.service_id))]
    const { data: svcsForNames } = await supabase
      .from('services')
      .select('id, name, category_id')
      .eq('tenant_id', tenantId)
      .in('id', serviceIds)
    const catIds = new Set<string>()
    for (const line of lines) {
      const svc = (svcsForNames ?? []).find((s: { id: string }) => s.id === line.service_id)
      if ((svc as { category_id?: string })?.category_id)
        catIds.add((svc as { category_id: string }).category_id)
    }
    categoryIds = [...catIds]
    allServiceNames = await cartItemsToDisplayLabel(supabase, tenantId, cartItems)
    const totalDuration = lines.reduce((s, l) => s + (l.duration ?? 60), 0)
    const { data: appt } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? 'Cliente WhatsApp',
        client_phone: phoneNumber,
        service_id: lines[0].service_id,
        service_ids: lines.map((l) => l.service_id),
        employee_id: null,
        date: appointmentDateLocal,
        status: 'payment_submitted',
        price: totalPrice.toString(),
        duration: totalDuration,
        source: 'whatsapp',
        whatsapp_phone: phoneNumber,
        deposit_amount: 0,
        notes: `Reserva WABA — comprobante: ${screenshotUrl ?? 'sin url'}.${lines.length > 1 ? ` (${allServiceNames})` : ''}`,
      })
      .select()
      .single()
    if (appt?.id) {
      createdAppts.push({ id: appt.id, price: totalPrice })
      paymentLines = lines.map((l) => ({
        serviceId: l.service_id,
        price: l.price,
        duration: l.duration ?? 60,
      }))
      await supabase.from('appointment_services').insert(
        lines.map((l) => ({
          appointment_id: appt.id,
          service_id: l.service_id,
          pack_id: l.pack_id ?? null,
          employee_id: null,
          price: l.price.toString(),
          duration: l.duration ?? 60,
        }))
      )
    }
  } else {
    const cartIds = JSON.parse((session.cart_service_ids as string) ?? '[]') as string[]
    const { data: svcsData } = await supabase
      .from('services')
      .select('id, name, price, duration, category_id')
      .eq('tenant_id', tenantId)
      .in('id', [...new Set(cartIds)])
    type AllSvcRow = {
      id: string
      name: string
      price: string | number
      duration: number | null
      category_id: string | null
    }
    const allServices: AllSvcRow[] = orderedServicesFromIds(cartIds, svcsData ?? [])
    totalPrice = allServices.reduce((s, svc) => s + parseFloat(String(svc.price)), 0)
    allServiceNames = allServices.map((s: AllSvcRow) => s.name).join(' + ')
    categoryIds = [
      ...new Set(allServices.map((s: AllSvcRow) => s.category_id).filter(Boolean)),
    ] as string[]
    const totalDuration = allServices.reduce((s, svc) => s + (svc.duration ?? 60), 0)
    const { data: appt } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        client_id: clientData?.id ?? null,
        client_name: clientData?.name ?? 'Cliente WhatsApp',
        client_phone: phoneNumber,
        service_id: allServices[0].id,
        service_ids: allServices.map((s: AllSvcRow) => s.id),
        employee_id: null,
        date: appointmentDateLocal,
        status: 'payment_submitted',
        price: totalPrice.toString(),
        duration: totalDuration,
        source: 'whatsapp',
        whatsapp_phone: phoneNumber,
        deposit_amount: 0,
        notes: `Reserva WABA — comprobante: ${screenshotUrl ?? 'sin url'}.${allServices.length > 1 ? ` (${allServiceNames})` : ''}`,
      })
      .select()
      .single()
    if (appt?.id) {
      createdAppts.push({ id: appt.id, price: totalPrice })
      paymentLines = allServices.map((svc: AllSvcRow) => ({
        serviceId: svc.id,
        price: parseFloat(String(svc.price)),
        duration: svc.duration ?? 60,
      }))
      await supabase.from('appointment_services').insert(
        allServices.map((svc: AllSvcRow) => ({
          appointment_id: appt.id,
          service_id: svc.id,
          employee_id: null,
          price: parseFloat(String(svc.price)).toString(),
          duration: svc.duration ?? 60,
        }))
      )
    }
  }

  const depositAmount = Math.ceil(totalPrice * 0.2)
  const firstApptId = createdAppts[0]?.id ?? null

  const apptId = createdAppts[0]?.id ?? null
  if (apptId) {
    if (paymentLines.length > 1) {
      await supabase.from('payments').insert(
        paymentLines.map((pl) => {
          const proportional =
            totalPrice > 0 ? Math.round((pl.price / totalPrice) * depositAmount * 100) / 100 : 0
          return {
            appointment_id: apptId,
            amount: proportional.toString(),
            method: 'yape_plin',
            notes: `Abono 20% proporcional WABA. Pendiente validación. (${allServiceNames})`,
            is_abono: true,
            service_total: pl.price.toString(),
          }
        })
      )
    } else {
      await supabase.from('payments').insert({
        appointment_id: apptId,
        amount: depositAmount.toString(),
        method: 'yape_plin',
        notes: `Abono 20% vía WABA. Pendiente validación.${allServiceNames ? ` (${allServiceNames})` : ''}`,
        is_abono: true,
        service_total: totalPrice.toString(),
      })
    }
  }

  await upsertSession(supabase, tenantId, phoneNumber, {
    awaiting_screenshot: false,
    verification_id: null,
    step: 'completed',
    cart_service_ids: [],
    cart_items: [],
  })

  const inHours = isBusinessHoursForSlots(weekday, sunday, tz)
  const servicesLine =
    createdAppts.length > 1
      ? allServiceNames
          .split(' + ')
          .map((n) => `• ${n}`)
          .join('\n')
      : `• Servicio: ${allServiceNames}`
  const consideraciones = getConsideracionesPreviasWhatsApp(categoryIds)
  const consideracionesBlock = consideraciones ? `\n\n${consideraciones}` : ''
  await sendMessage(
    phoneNumber,
    (inHours
      ? `✅ ¡Recibido! Tu comprobante está siendo revisado.\n\n` +
        `📋 *Resumen de tu cita:*\n` +
        `${servicesLine}\n` +
        `• Fecha: ${formatDateSpanish(new Date(appointmentDate), tz)}\n` +
        `• Adelanto: ${formatMoney(depositAmount, cc)}\n\n` +
        `Validaremos tu pago en breve. ¡Gracias!`
      : `✅ ¡Gracias! Tu cita quedó registrada para validación.\n\n` +
        `📋 *Resumen de tu cita:*\n` +
        `${servicesLine}\n` +
        `• Fecha: ${formatDateSpanish(new Date(appointmentDate), tz)}\n` +
        `• Adelanto: ${formatMoney(depositAmount, cc)}\n\n` +
        `El equipo validará tu pago pronto.`) + consideracionesBlock,
    wa
  )

  await notifyAdmins(
    supabase,
    tenantId,
    '💳 Nuevo pago por validar',
    `${clientData?.name ?? 'Cliente'} reservó ${allServiceNames} para ${formatDateSpanish(new Date(appointmentDate), tz)}`,
    {
      screen: 'ValidacionPagos',
      verificationId: '',
      appointmentId: firstApptId ?? '',
    }
  )
  await notifyAdmins(
    supabase,
    tenantId,
    'Nueva cita agendada',
    `${clientData?.name ?? 'Cliente'} — ${allServiceNames} · ${formatDateSpanish(new Date(appointmentDate), tz)}`,
    { screen: 'Agenda', appointmentId: firstApptId ?? '' }
  )

  const adminText =
    `🔔 *Nueva reserva por validar*\n\n` +
    `👤 Cliente: ${clientData?.name ?? phoneNumber}\n` +
    `💅 ${createdAppts.length > 1 ? `Servicios: ${allServiceNames}` : `Servicio: ${allServiceNames}`}\n` +
    `📅 Fecha: ${formatDateSpanish(new Date(appointmentDate), tz)}\n` +
    `💰 Adelanto: ${formatMoney(depositAmount, cc)}\n\n` +
    `Validá en la app → Más → Validación de Pagos`

  await notifyAdminPhonesWa(wa, tenant.waba_admin_phones, adminText)
}
