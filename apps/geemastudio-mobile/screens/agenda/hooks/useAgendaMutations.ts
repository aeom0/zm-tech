import { Alert } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import { subirImagenReferencia } from '@/lib/referenceImages'
import {
  formatAppointmentWallclock,
  formatoHoraHHMMEnZona,
  parseAppointmentWallclock,
} from '@zmtech/tenant-config'

import { computeServiceLinesTotals, lineDuration, lineUnitPrice } from '../agendaUtils'
import type { AgendaService, AgendaServiceLine } from '../types'

export interface AgendaMutationCallbacks {
  onCreateSuccess: () => void
  onDeleteSuccess: () => void
  onUpdateSuccess: () => void
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

function fmtTimeHHMM(d: Date, timeZone: string) {
  return formatoHoraHHMMEnZona(d, timeZone)
}

async function guardOverlapBeforeInsert(args: {
  employeeId: string
  dateIso: string
  durationMinutes: number
  timeZone: string
  excludeAppointmentId?: string | null
}) {
  const candidateStart =
    parseAppointmentWallclock(args.dateIso, args.timeZone) ?? new Date(args.dateIso)
  const candidateEnd = addMinutes(candidateStart, args.durationMinutes)

  const windowStart = addMinutes(candidateStart, -12 * 60)
  const windowEnd = addMinutes(candidateEnd, 12 * 60)

  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, duration')
    .eq('employee_id', args.employeeId)
    .gte('date', formatAppointmentWallclock(windowStart, args.timeZone))
    .lte('date', formatAppointmentWallclock(windowEnd, args.timeZone))
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

    const start = parseAppointmentWallclock(apt.date, args.timeZone) ?? new Date(apt.date)
    const end = addMinutes(start, apt.duration)
    const overlaps = start < candidateEnd && end > candidateStart
    if (!overlaps) continue

    throw new Error(`Horario ocupado. Termina a las ${fmtTimeHHMM(end, args.timeZone)}.`)
  }
}

/**
 * Verifica solape para cada profesional único entre las líneas de la cita: al ser
 * multi-servicio, dos líneas pueden tener empleados distintos y ambos quedan
 * ocupados durante toda la ventana de la cita (fecha + duración total).
 */
async function guardOverlapForLines(args: {
  employeeIds: string[]
  dateIso: string
  durationMinutes: number
  timeZone: string
  excludeAppointmentId?: string | null
}) {
  const uniqueEmployeeIds = [...new Set(args.employeeIds.filter(Boolean))]
  for (const employeeId of uniqueEmployeeIds) {
    await guardOverlapBeforeInsert({
      employeeId,
      dateIso: args.dateIso,
      durationMinutes: args.durationMinutes,
      timeZone: args.timeZone,
      excludeAppointmentId: args.excludeAppointmentId,
    })
  }
}

function buildServiceRows(appointmentId: string, lines: AgendaServiceLine[], services: AgendaService[]) {
  return lines.map((line) => ({
    appointment_id: appointmentId,
    service_id: line.serviceId,
    employee_id: line.employeeId || null,
    pack_id: line.packId ?? null,
    price: lineUnitPrice(line, services).toFixed(2),
    duration: lineDuration(line, services),
  }))
}

export function useAgendaMutations(
  callbacks: AgendaMutationCallbacks,
  timeZone: string,
  services: AgendaService[]
) {
  const createMutation = useMutation({
    mutationFn: async (data: {
      client_name: string
      client_phone?: string
      client_document?: string
      date: string
      status: string
      lines: AgendaServiceLine[]
    }) => {
      if (data.lines.length === 0) {
        throw new Error('Selecciona al menos un servicio')
      }

      const { totalPrice, totalDuration } = computeServiceLinesTotals(data.lines, services)
      const duration = totalDuration || 60

      await guardOverlapForLines({
        employeeIds: data.lines.map((l) => l.employeeId),
        dateIso: data.date,
        durationMinutes: duration,
        timeZone,
      })

      const firstLine = data.lines[0]
      const payload = {
        client_name: data.client_name,
        client_phone: data.client_phone ?? null,
        client_document: data.client_document ?? null,
        service_id: firstLine.serviceId,
        employee_id: firstLine.employeeId,
        service_ids: data.lines.map((l) => l.serviceId),
        date: data.date,
        duration,
        price: totalPrice.toFixed(2),
        status: data.status,
      }

      const { data: newApt, error } = await supabase
        .from('appointments')
        .insert(payload)
        .select('id')
        .single()
      if (error) {
        throw new Error(error.message)
      }

      const aptId = (newApt as { id: string }).id
      const svcRows = buildServiceRows(aptId, data.lines, services)
      const { error: linesError } = await supabase.from('appointment_services').insert(svcRows)
      if (linesError) {
        throw new Error(linesError.message)
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
        timeZone,
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

  /**
   * Edita las líneas de servicio de una cita existente: delete-then-insert sobre
   * `appointment_services` (no diff/upsert) + resincroniza los campos denormalizados
   * de `appointments` (service_id/service_ids/employee_id/duration/price).
   */
  const updateAppointmentServicesMutation = useMutation({
    mutationFn: async (args: { id: string; date: string; lines: AgendaServiceLine[] }) => {
      if (args.lines.length === 0) {
        throw new Error('Selecciona al menos un servicio')
      }

      const { totalPrice, totalDuration } = computeServiceLinesTotals(args.lines, services)
      const duration = totalDuration || 60

      await guardOverlapForLines({
        employeeIds: args.lines.map((l) => l.employeeId),
        dateIso: args.date,
        durationMinutes: duration,
        timeZone,
        excludeAppointmentId: args.id,
      })

      const firstLine = args.lines[0]
      const { error: aptError } = await supabase
        .from('appointments')
        .update({
          service_id: firstLine.serviceId,
          employee_id: firstLine.employeeId,
          service_ids: args.lines.map((l) => l.serviceId),
          duration,
          price: totalPrice.toFixed(2),
        })
        .eq('id', args.id)
      if (aptError) {
        throw new Error(aptError.message)
      }

      const { error: delError } = await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', args.id)
      if (delError) {
        throw new Error(delError.message)
      }

      const svcRows = buildServiceRows(args.id, args.lines, services)
      const { error: insError } = await supabase.from('appointment_services').insert(svcRows)
      if (insError) {
        throw new Error(insError.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      queryClient.invalidateQueries({ queryKey: ['appointment_services'] })
      callbacks.onUpdateSuccess()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo actualizar los servicios de la cita')
    },
  })

  /**
   * Marca la cita como completada (solo `status`) — mutación distinta de
   * `updateAppointmentMutation` porque esa es específica de reprogramar
   * (recibe date/employee_id/duration y valida solape de horario).
   */
  const completeAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status: string } }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: data.status })
        .eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo actualizar la cita')
    },
  })

  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      appointment_id: string
      amount: string
      method: string
      date: string
      notes: string
    }) => {
      const payload = {
        appointment_id: data.appointment_id,
        amount: data.amount,
        method: data.method,
        date: data.date,
        notes: data.notes,
        is_abono: false,
        service_total: null,
      }

      const { error } = await supabase.from('payments').insert(payload)

      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['agenda_payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_revenue'] })
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo registrar el pago'),
  })

  /**
   * Sube N fotos de referencia (galería, `expo-image-picker`) al bucket `service-references`
   * y agrega las URLs públicas a `appointments.reference_image_paths` en una sola
   * actualización (evita condiciones de carrera entre subidas). Marca
   * `reference_received_at = now()` solo si la cita no tenía referencias aún.
   */
  const addReferenceImagesMutation = useMutation({
    mutationFn: async (args: {
      appointmentId: string
      images: Array<{ uri: string; contentType?: string }>
      currentPaths: string[]
      alreadyReceived: boolean
    }) => {
      const uploadedUrls: string[] = []
      for (const image of args.images) {
        const { publicUrl } = await subirImagenReferencia(
          supabase,
          args.appointmentId,
          image.uri,
          image.contentType
        )
        uploadedUrls.push(publicUrl)
      }

      const newPaths = [...args.currentPaths, ...uploadedUrls]
      const updatePayload: { reference_image_paths: string[]; reference_received_at?: string } = {
        reference_image_paths: newPaths,
      }
      if (!args.alreadyReceived) {
        updatePayload.reference_received_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', args.appointmentId)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['unreviewed_references_count'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo subir la foto de referencia')
    },
  })

  /** Marca las referencias de la cita como revisadas (`reference_reviewed_at = now()`). */
  const markReferencesReviewedMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ reference_reviewed_at: new Date().toISOString() })
        .eq('id', appointmentId)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['unreviewed_references_count'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo marcar como revisado')
    },
  })

  return {
    createMutation,
    deleteAppointmentMutation,
    updateAppointmentMutation,
    updateAppointmentServicesMutation,
    completeAppointmentMutation,
    createPaymentMutation,
    addReferenceImagesMutation,
    markReferencesReviewedMutation,
  }
}
