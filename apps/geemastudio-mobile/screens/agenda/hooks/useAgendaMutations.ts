import { Alert } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import {
  addReferenceImages,
  cancelAppointment,
  completeAppointment,
  createAppointment,
  createPayment,
  markReferencesReviewed,
  rescheduleAppointment,
  updateAppointmentServices,
} from '@geemastudio/data'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { PaymentVesFields } from '@/lib/payments-ves'
import { useAuth } from '@/contexts/AuthContext'

import type { AgendaService, AgendaServiceLine } from '../types'

export interface AgendaMutationCallbacks {
  onCreateSuccess: () => void
  onDeleteSuccess: () => void
  onUpdateSuccess: () => void
}

async function resolveTenantId(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.tenant_id ?? null
}

export function useAgendaMutations(
  callbacks: AgendaMutationCallbacks,
  timeZone: string,
  services: AgendaService[]
) {
  const { userId } = useAuth()
  const tenantQuery = useQuery({
    queryKey: ['profile_tenant_id', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: () => resolveTenantId(userId),
  })
  const tenantId = tenantQuery.data ?? null

  const createMutation = useMutation({
    mutationFn: async (data: {
      client_name: string
      client_phone?: string
      client_document?: string
      date: string
      status: string
      lines: AgendaServiceLine[]
    }) => {
      if (!tenantId) {
        throw new Error('No se pudo resolver el tenant')
      }
      await createAppointment(supabase, { ...data, tenantId, timeZone }, services)
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

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (args: { id: string; reason: string; note: string }) => {
      await cancelAppointment(supabase, { ...args, timeZone })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      callbacks.onDeleteSuccess()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo cancelar la cita')
    },
  })

  const updateAppointmentMutation = useMutation({
    mutationFn: async (args: {
      id: string
      date: string
      employee_id: string
      /** Si hay líneas multi-servicio, chequear solape de todas las chicas involucradas. */
      employeeIds?: string[]
      duration: number
    }) => {
      await rescheduleAppointment(supabase, { ...args, timeZone })
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
      if (!tenantId) {
        throw new Error('No se pudo resolver el tenant')
      }
      await updateAppointmentServices(supabase, { ...args, services, tenantId, timeZone })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      queryClient.invalidateQueries({ queryKey: ['appointment_services'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['agenda_payments'] })
      queryClient.invalidateQueries({ queryKey: ['finances_recent_appointments'] })
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
      await completeAppointment(supabase, id, data.status)
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
      ves?: PaymentVesFields
    }) => {
      if (!tenantId) {
        throw new Error('No se pudo resolver el tenant')
      }
      await createPayment(supabase, {
        tenant_id: tenantId,
        appointment_id: data.appointment_id,
        amount: data.amount,
        method: data.method,
        date: data.date,
        notes: data.notes,
        is_abono: false,
        service_total: null,
        ...(data.ves ?? {}),
      })
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
      images: { uri: string; contentType?: string }[]
      currentPaths: string[]
      alreadyReceived: boolean
    }) => {
      await addReferenceImages(supabase, {
        appointmentId: args.appointmentId,
        images: args.images.map((image) => ({ source: image.uri, contentType: image.contentType })),
        currentPaths: args.currentPaths,
        alreadyReceived: args.alreadyReceived,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['unreviewed_references'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo subir la foto de referencia')
    },
  })

  /** Marca las referencias de la cita como revisadas (`reference_reviewed_at = now()`). */
  const markReferencesReviewedMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await markReferencesReviewed(supabase, appointmentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['unreviewed_references'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'No se pudo marcar como revisado')
    },
  })

  return {
    createMutation,
    cancelAppointmentMutation,
    updateAppointmentMutation,
    updateAppointmentServicesMutation,
    completeAppointmentMutation,
    createPaymentMutation,
    addReferenceImagesMutation,
    markReferencesReviewedMutation,
  }
}
