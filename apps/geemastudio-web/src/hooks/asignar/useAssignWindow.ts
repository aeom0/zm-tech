'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignAppointmentEmployee,
  countUnassignedAppointments,
  fetchAssignWindow,
  queryKeys,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'

function requireClient() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

/** Citas de los últimos 7 días y los próximos 7 días (zona del negocio). */
export function useAssignWindow(timeZone: string | null) {
  return useQuery({
    queryKey: queryKeys.agenda.assignWindow(timeZone),
    enabled: !!supabase && !!timeZone,
    refetchInterval: 30_000,
    queryFn: () => fetchAssignWindow(requireClient(), { timeZone: timeZone! }),
  })
}

/** Badge: citas sin profesional en los próximos 7 días. */
export function useUnassignedCount(timeZone: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.agenda.unassignedAppointmentsCount, timeZone],
    enabled: enabled && !!supabase && !!timeZone,
    refetchInterval: 60_000,
    queryFn: () => countUnassignedAppointments(requireClient(), timeZone!, 7),
  })
}

export function useAssignEmployeeMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ appointmentId, employeeId }: { appointmentId: string; employeeId: string }) =>
      assignAppointmentEmployee(requireClient(), appointmentId, employeeId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appointments', 'assign_window'] })
      void qc.invalidateQueries({ queryKey: queryKeys.agenda.unassignedAppointmentsCount })
      void qc.invalidateQueries({ queryKey: queryKeys.agenda.all })
      void qc.invalidateQueries({ queryKey: ['web_agenda_day'] })
      void qc.invalidateQueries({ queryKey: ['web_agenda_week'] })
    },
  })
}
