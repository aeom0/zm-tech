'use client'

import { useQuery } from '@tanstack/react-query'
import {
  formatAppointmentWallclock,
  instanteCitaDesdeTexto,
  esMismoDiaCalendarioEnZona,
  sumarDiasEnZonaIANA,
  zonaIANASegura,
  normalizarHorarioSemanal,
  type TenantConfig,
} from '@zmtech/tenant-config'

import { supabase } from '@/lib/supabase'
import { matchesStatusFilter, type AgendaAppointment, type AgendaStatusFilter } from './types'

export function useAgendaTenantSchedule() {
  return useQuery({
    queryKey: ['web_agenda_tenant_schedule'],
    enabled: !!supabase,
    staleTime: 60_000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')

      let { data, error } = await supabase
        .from('tenant_settings')
        .select('timezone, business_hours, time_format, currency_code')
        .eq('id', user.id)
        .maybeSingle()

      if ((!data || error) && user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle()
        const slug = profile?.tenant_id as string | null | undefined
        if (slug) {
          const bySlug = await supabase
            .from('tenant_settings')
            .select('timezone, business_hours, time_format, currency_code')
            .eq('tenant_slug', slug)
            .maybeSingle()
          data = bySlug.data
          error = bySlug.error
        }
      }

      if (error) throw new Error(error.message)

      const timezone = zonaIANASegura(
        typeof data?.timezone === 'string' ? data.timezone : 'America/Caracas'
      )
      const businessHours = normalizarHorarioSemanal(
        data?.business_hours as TenantConfig['businessHours'] | null
      )
      const timeFormat = data?.time_format === '12' ? '12' : '24'
      const currencyCode =
        typeof data?.currency_code === 'string' && data.currency_code
          ? data.currency_code
          : 'PEN'

      return { timezone, businessHours, timeFormat, currencyCode }
    },
  })
}

export function useAgendaDayAppointments(
  selectedDate: Date | null,
  timezone: string | undefined,
  statusFilter: AgendaStatusFilter
) {
  const tz = timezone ? zonaIANASegura(timezone) : null
  const dayKey =
    selectedDate && tz
      ? formatAppointmentWallclock(selectedDate, tz).slice(0, 10)
      : null

  return useQuery({
    queryKey: ['web_agenda_day', dayKey, tz, statusFilter],
    enabled: !!supabase && !!selectedDate && !!tz,
    staleTime: 30_000,
    queryFn: async (): Promise<AgendaAppointment[]> => {
      if (!supabase || !selectedDate || !tz) return []

      const start = formatAppointmentWallclock(selectedDate, tz)
      const end = formatAppointmentWallclock(sumarDiasEnZonaIANA(selectedDate, 1, tz), tz)

      const { data, error } = await supabase
        .from('appointments')
        .select(
          'id, client_name, client_phone, date, duration, price, status, employee_id, service_id, service_ids'
        )
        .gte('date', start)
        .lt('date', end)
        .order('date', { ascending: true })

      if (error) throw new Error(error.message)

      const rows = (data ?? []) as AgendaAppointment[]
      return rows.filter((apt) => {
        const instant = instanteCitaDesdeTexto(apt.date, tz)
        if (!esMismoDiaCalendarioEnZona(instant, selectedDate, tz)) return false
        return matchesStatusFilter(apt.status, statusFilter)
      })
    },
  })
}

export function useAgendaServicesMap() {
  return useQuery({
    queryKey: ['web_agenda_services'],
    enabled: !!supabase,
    staleTime: 120_000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase.from('services').select('id, name')
      if (error) throw new Error(error.message)
      const map = new Map<string, string>()
      for (const s of data ?? []) {
        map.set(String((s as { id: string }).id), String((s as { name: string }).name))
      }
      return map
    },
  })
}
