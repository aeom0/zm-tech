import { useState } from 'react'
import { Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useMutation } from '@tanstack/react-query'
import {
  buildPaymentRows,
  convertDraftAmount,
  createPayment,
  deletePayment,
  paymentTypeFromPayment,
  updatePayment,
  type PaymentInput,
} from '@geemastudio/data'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { useVesRate } from '@/hooks/useVesRate'
import { useProfileTenantId } from './useProfileTenantId'
import { useDepositDefault } from './useDepositDefault'

import type {
  FinancesAppointmentOption,
  FinancesPayment,
  FinancesPaymentType,
} from '../types'

export interface PaymentFormData {
  amount: string
  serviceTotal: string
  method: string
  notes: string
  /** Moneda en que se ingresa el monto (solo tenants VE; en otros siempre 'USD' = moneda del tenant). */
  currency: 'USD' | 'VES'
}

const EMPTY_FORM: PaymentFormData = {
  amount: '',
  serviceTotal: '',
  method: 'cash',
  notes: '',
  currency: 'USD',
}

export function usePaymentForm(
  recentAppointments: FinancesAppointmentOption[],
  abonoPrevioByApt: Record<string, { amount: number; service_total: number }>
) {
  const { config } = useTenant()
  const { tenantId } = useProfileTenantId()
  const currencySymbol = config.locale.currency.symbol
  const ves = useVesRate()
  const depositDefault = useDepositDefault(tenantId)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingPayment, setEditingPayment] = useState<FinancesPayment | null>(null)
  const [paymentType, setPaymentType] = useState<FinancesPaymentType>('full')
  const [formData, setFormData] = useState<PaymentFormData>(EMPTY_FORM)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard_revenue'] })
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingPayment(null)
  }

  const createMutation = useMutation({
    mutationFn: async (data: PaymentInput) => {
      await createPayment(supabase, data)
    },
    onSuccess: () => {
      invalidateAll()
      closeModal()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo registrar el pago'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<PaymentInput, 'tenant_id'> }) => {
      await updatePayment(supabase, id, data)
    },
    onSuccess: () => {
      invalidateAll()
      closeModal()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo actualizar el pago'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deletePayment(supabase, id)
    },
    onSuccess: () => {
      invalidateAll()
      closeModal()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo eliminar el pago'),
  })

  /**
   * Montos sugeridos según el tipo y la cita elegida:
   * - Completar pago: saldo si la cita ya tiene adelanto; si no, el precio de la cita.
   * - Adelanto: monto fijo del negocio (Reglas del asistente) y el precio de la cita como total.
   */
  const suggestedAmounts = (
    type: FinancesPaymentType,
    aptId: string | null | undefined
  ): Pick<PaymentFormData, 'amount' | 'serviceTotal'> => {
    const apt = aptId ? recentAppointments.find((a) => a.id === aptId) : undefined
    const abono = aptId ? abonoPrevioByApt[aptId] : undefined
    const price = apt ? parseFloat(String(apt.price)) : NaN
    if (type === 'full') {
      if (abono)
        return { amount: (abono.service_total - abono.amount).toFixed(2), serviceTotal: '' }
      return { amount: Number.isFinite(price) ? price.toFixed(2) : '', serviceTotal: '' }
    }
    if (type === 'abono') {
      return {
        amount: depositDefault != null ? depositDefault.toFixed(2) : '',
        serviceTotal: Number.isFinite(price) ? price.toFixed(2) : '',
      }
    }
    return { amount: '', serviceTotal: '' }
  }

  const openNewPayment = (prefillAptId?: string, prefillType?: FinancesPaymentType) => {
    const type = prefillType ?? 'full'
    setEditingPayment(null)
    setPaymentType(type)
    setFormData({ ...EMPTY_FORM, ...suggestedAmounts(type, prefillAptId) })
    setSelectedAppointmentId(prefillAptId ?? null)
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const openEditPayment = (payment: FinancesPayment) => {
    setEditingPayment(payment)
    setPaymentType(paymentTypeFromPayment(payment))
    const enBs = payment.paid_currency === 'VES' && payment.amount_ves != null
    setFormData({
      amount: enBs
        ? String(payment.amount_ves)
        : typeof payment.amount === 'number'
          ? String(payment.amount)
          : (payment.amount ?? ''),
      serviceTotal: payment.service_total != null ? String(payment.service_total) : '',
      method: typeof payment.method === 'string' ? payment.method : 'cash',
      notes: payment.notes != null ? String(payment.notes) : '',
      currency: enBs ? 'VES' : 'USD',
    })
    setSelectedAppointmentId(payment.appointment_id ?? null)
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  /** Tasa del formulario: al editar un pago ya registrado se respeta su snapshot. */
  const formRate =
    editingPayment?.exchange_rate != null ? Number(editingPayment.exchange_rate) : ves.rate

  /** Cambia la moneda de entrada y convierte el monto ya escrito para no perderlo. */
  const onChangeCurrency = (next: 'USD' | 'VES') => {
    setFormData((p) => {
      if (p.currency === next) return p
      return { ...p, currency: next, amount: convertDraftAmount(p.amount, p.currency, next, formRate) }
    })
  }

  const onSelectAppointment = (aptId: string | null) => {
    setSelectedAppointmentId(aptId)
    if (!aptId || editingPayment) return
    applySuggestion(suggestedAmounts(paymentType, aptId))
  }

  const onChangePaymentType = (type: FinancesPaymentType) => {
    setPaymentType(type)
    applySuggestion(suggestedAmounts(type, selectedAppointmentId))
  }

  /** Las sugerencias vienen en la moneda del negocio: si hay monto, la entrada vuelve a esa moneda. */
  const applySuggestion = (next: Pick<PaymentFormData, 'amount' | 'serviceTotal'>) => {
    setFormData((p) => ({ ...p, ...next, ...(next.amount ? { currency: 'USD' as const } : {}) }))
  }

  const handleSubmit = () => {
    if (!tenantId) {
      Alert.alert('Error', 'No se pudo identificar el negocio')
      return
    }
    const result = buildPaymentRows({
      tenantId,
      appointmentId: selectedAppointmentId,
      type: paymentType,
      amount: formData.amount,
      currency: formData.currency,
      vesEnabled: ves.enabled,
      rate: formRate,
      method: formData.method,
      notes: formData.notes,
      serviceTotal: formData.serviceTotal,
      date: editingPayment ? editingPayment.date : new Date().toISOString(),
    })
    if (!result.ok) {
      Alert.alert('Error', result.error)
      return
    }
    const [{ tenant_id: _tenantId, ...payload }] = result.rows

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: payload })
    } else {
      createMutation.mutate(result.rows[0])
    }
  }

  const handleDelete = (payment: FinancesPayment) => {
    Alert.alert(
      'Eliminar pago',
      `¿Eliminar pago de ${formatCurrency(parseFloat(payment.amount), config)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(payment.id),
        },
      ]
    )
  }

  return {
    modalVisible,
    editingPayment,
    paymentType,
    formData,
    setFormData,
    selectedAppointmentId,
    currencySymbol,
    vesEnabled: ves.enabled,
    vesRate: formRate,
    onChangeCurrency,
    openNewPayment,
    openEditPayment,
    closeModal,
    onSelectAppointment,
    onChangePaymentType,
    handleSubmit,
    handleDelete,
    isPending: createMutation.isPending || updateMutation.isPending,
  }
}
