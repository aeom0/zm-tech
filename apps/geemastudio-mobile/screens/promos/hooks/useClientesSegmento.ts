import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ClienteSegmento } from '../types'

/**
 * Normaliza un destino (teléfono o BSUID) para comparar contra la lista de
 * bloqueo (`waba_config.config_key = 'blocked_phone_numbers'`): BSUID tal
 * cual; teléfono a los últimos 9 dígitos.
 */
function normalizeBlockedDestination(dest: string): string {
  const s = String(dest ?? '')
  if (s.startsWith('PE.')) return s
  return s.replace(/\D/g, '').slice(-9)
}

export function useClientesSegmento(categoryName: string | null, inactiveOnly = false) {
  return useQuery<ClienteSegmento[]>({
    queryKey: ['promo/clientes-segmento', categoryName ?? 'all', inactiveOnly ? '30-plus-days' : 'all'],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const MAX_ROWS = 10000

      const [{ data: completedAppts }, { data: futureAppts }, { data: adSessions }, { data: blockedConfig }] =
        await Promise.all([
          supabase
            .from('appointments')
            .select('client_id')
            .eq('status', 'completed')
            .not('client_id', 'is', null)
            .limit(MAX_ROWS),
          supabase
            .from('appointments')
            .select('client_id')
            .gte('date', new Date().toISOString())
            .not('client_id', 'is', null)
            .limit(MAX_ROWS),
          supabase.from('whatsapp_sessions').select('phone, from_ad_at').not('from_ad_at', 'is', null).limit(MAX_ROWS),
          supabase
            .from('waba_config')
            .select('config_value')
            .eq('config_key', 'blocked_phone_numbers')
            .eq('is_active', true)
            .maybeSingle(),
        ])

      const linkedClientIds = new Set<string>([
        ...(completedAppts ?? []).map((a) => a.client_id as string),
        ...(futureAppts ?? []).map((a) => a.client_id as string),
      ])
      const clientsWithFutureAppointments = new Set<string>((futureAppts ?? []).map((a) => a.client_id as string))

      const metaAdsDestinations = new Set(
        (adSessions ?? [])
          .map((session) => session.phone)
          .filter((phone): phone is string => typeof phone === 'string')
          .map((phone) => {
            const digits = phone.replace(/\D/g, '')
            return phone.startsWith('PE.') ? phone : digits.slice(-9)
          })
      )
      const blockedPhones = new Set(
        Array.isArray((blockedConfig?.config_value as { phones?: unknown[] })?.phones)
          ? (blockedConfig?.config_value as { phones: unknown[] }).phones
              .filter((phone): phone is string => typeof phone === 'string')
              .map(normalizeBlockedDestination)
          : []
      )

      let query = supabase
        .from('clients')
        .select('id, name, phone, wa_user_id, created_at')
        .or('phone.not.is.null,wa_user_id.not.is.null')
        .order('name', { ascending: true })
        .limit(MAX_ROWS)

      if (categoryName && linkedClientIds.size > 0) {
        const { data: cats } = await supabase.from('service_categories').select('id').eq('name', categoryName).limit(1)

        const catUuid = cats?.[0]?.id ?? null

        if (catUuid) {
          const { data: services } = await supabase
            .from('services')
            .select('id')
            .eq('category_id', catUuid)
            .eq('is_active', true)

          const serviceIds = (services ?? []).map((s) => s.id)

          if (serviceIds.length > 0) {
            const { data: apptServices } = await supabase
              .from('appointment_services')
              .select('appointment_id')
              .in('service_id', serviceIds)

            const apptIds = [...new Set((apptServices ?? []).map((a) => a.appointment_id))]

            if (apptIds.length > 0) {
              const { data: catAppts } = await supabase
                .from('appointments')
                .select('client_id')
                .in('id', apptIds)
                .in('status', ['completed', 'pending', 'confirmed'])
                .not('client_id', 'is', null)

              const catClientIds = [...new Set((catAppts ?? []).map((a) => a.client_id as string))]

              if (catClientIds.length > 0) {
                query = query.in('id', catClientIds)
              }
              // Si no hay clientes vinculados a esa categoría, no filtrar — mostrar todos
            }
          }
        }
      }

      const { data: clients } = await query

      if (!clients?.length) return []

      const allClientIds = clients.map((c) => c.id)
      const { data: lastAppts } = await supabase
        .from('appointments')
        .select('client_id, date')
        .in('client_id', allClientIds)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(MAX_ROWS)

      const lastApptMap: Record<string, string> = {}
      for (const appt of lastAppts ?? []) {
        if (appt.client_id && !lastApptMap[appt.client_id]) {
          lastApptMap[appt.client_id] = appt.date
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const result = clients
        .map((c) => {
          const dest =
            (typeof c.phone === 'string' && c.phone.trim()) || (typeof c.wa_user_id === 'string' && c.wa_user_id.trim()) || ''
          if (!dest) return null
          if (blockedPhones.has(normalizeBlockedDestination(dest))) return null
          const lastAppointmentDate = lastApptMap[c.id] ?? null
          const daysSinceLastVisit = lastAppointmentDate
            ? Math.floor((today.getTime() - new Date(lastAppointmentDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
            : null
          const isMetaAdsLead = metaAdsDestinations.has(normalizeBlockedDestination(dest))

          if (
            inactiveOnly &&
            (clientsWithFutureAppointments.has(c.id) ||
              !(daysSinceLastVisit == null ? isMetaAdsLead : daysSinceLastVisit >= 30))
          ) {
            return null
          }

          return {
            id: c.id,
            name: c.name,
            phone: dest,
            last_appointment_date: lastAppointmentDate,
            days_since_last_visit: daysSinceLastVisit,
            category_name: categoryName,
          }
        })
        .filter(Boolean) as ClienteSegmento[]

      return result
    },
  })
}
