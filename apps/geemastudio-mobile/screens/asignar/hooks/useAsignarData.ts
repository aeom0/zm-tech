import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignAppointmentEmployee, fetchAssignWindow, queryKeys } from '@geemastudio/data'
import { formatAppointmentWallclock } from '@zmtech/tenant-config'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { useActiveEmployees } from '@/screens/personal/hooks/useEmployeesData'
import type { AsignarAppointment } from '../types'

export function useAsignarData() {
  const { config } = useTenant()
  const queryClient = useQueryClient()
  const timeZone = config.locale.timezone

  const { employees } = useActiveEmployees({ staleTime: 5 * 60_000 })

  // Servicios para enriquecer nombres
  const { data: services = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['asignar_services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('id, name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  // Citas de los últimos 7 días y los próximos 7 días, usando timezone del tenant
  const {
    data: rawAppointments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<AsignarAppointment[]>({
    queryKey: queryKeys.agenda.assignWindow(timeZone),
    queryFn: () => fetchAssignWindow(supabase, { timeZone }),
    refetchInterval: 30_000,
  })

  // Enriquecer nombres en memoria
  const serviceById = Object.fromEntries(services.map((s) => [s.id, s]))
  const employeeById = Object.fromEntries(employees.map((e) => [e.id, e]))
  const nowWallclock = formatAppointmentWallclock(new Date(), timeZone)

  const enriched: AsignarAppointment[] = rawAppointments.map((apt) => ({
    ...apt,
    serviceName: apt.service_id ? (serviceById[apt.service_id]?.name ?? '—') : '—',
    employeeName: apt.employee_id ? employeeById[apt.employee_id]?.name : undefined,
    employeeColor: apt.employee_id ? employeeById[apt.employee_id]?.color : undefined,
  }))

  const upcoming = enriched.filter((apt) => apt.date >= nowWallclock)
  const past = enriched.filter((apt) => apt.date < nowWallclock)

  // Mutación: asignar profesional a una cita
  const assignMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      employeeId,
    }: {
      appointmentId: string
      employeeId: string
    }) => assignAppointmentEmployee(supabase, appointmentId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['appointments', 'assign_window'],
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda.unassignedAppointmentsCount })
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda.all })
    },
  })

  return {
    employees,
    upcoming,
    past,
    isLoading,
    isError,
    refetch,
    assignMutation,
    config,
  }
}
