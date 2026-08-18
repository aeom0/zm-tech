import { Alert } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'

export interface AgendaMutationCallbacks {
  onCreateSuccess: () => void
  onDeleteSuccess: () => void
  onUpdateSuccess: () => void
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

function fmtTimeHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

async function guardOverlapBeforeInsert(args: {
  employeeId: string
  dateIso: string
  durationMinutes: number
  excludeAppointmentId?: string | null
}) {
  const candidateStart = new Date(args.dateIso)
  const candidateEnd = addMinutes(candidateStart, args.durationMinutes)

  const windowStart = addMinutes(candidateStart, -12 * 60)
  const windowEnd = addMinutes(candidateEnd, 12 * 60)

  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, duration')
    .eq('employee_id', args.employeeId)
    .gte('date', windowStart.toISOString())
    .lte('date', windowEnd.toISOString())
    .order('date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const existing = (data ?? []) as Array<{
    id: string
    date: string
    duration: number
  }>

  for (const apt of existing) {
    if (args.excludeAppointmentId && apt.id === args.excludeAppointmentId) {
      continue
    }

    const start = new Date(apt.date)
    const end = addMinutes(start, apt.duration)
    const overlaps = start < candidateEnd && end > candidateStart
    if (!overlaps) continue

    throw new Error(`Horario ocupado. Termina a las ${fmtTimeHHMM(end)}.`)
  }
}

export function useAgendaMutations(callbacks: AgendaMutationCallbacks) {
  const createMutation = useMutation({
    mutationFn: async (data: {
      client_name: string
      client_phone?: string
      client_document?: string
      service_id: string
      employee_id: string
      date: string
      duration: number
      price: string
      status: string
    }) => {
      await guardOverlapBeforeInsert({
        employeeId: data.employee_id,
        dateIso: data.date,
        durationMinutes: data.duration,
      })

      const payload = {
        client_name: data.client_name,
        client_phone: data.client_phone ?? null,
        client_document: data.client_document ?? null,
        service_id: data.service_id,
        employee_id: data.employee_id,
        date: data.date,
        duration: data.duration,
        price: data.price,
        status: data.status,
      }

      const { error } = await supabase.from('appointments').insert(payload)

      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      callbacks.onCreateSuccess()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo crear la cita')
    },
  })

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      callbacks.onDeleteSuccess()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo eliminar la cita')
    },
  })

  const updateAppointmentMutation = useMutation({
    mutationFn: async (args: {
      id: string
      date: string
      employee_id: string
      duration: number
    }) => {
      await guardOverlapBeforeInsert({
        employeeId: args.employee_id,
        dateIso: args.date,
        durationMinutes: args.duration,
        excludeAppointmentId: args.id,
      })

      const { error } = await supabase
        .from('appointments')
        .update({ date: args.date })
        .eq('id', args.id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      callbacks.onUpdateSuccess()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo reprogramar la cita')
    },
  })

  return {
    createMutation,
    deleteAppointmentMutation,
    updateAppointmentMutation,
  }
}
