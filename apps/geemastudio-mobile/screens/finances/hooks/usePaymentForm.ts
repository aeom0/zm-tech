import { useState } from 'react'
import { Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useMutation } from '@tanstack/react-query'
import { convertirBsAUsd, convertirUsdABs } from '@zmtech/tasas'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { useVesRate } from '@/hooks/useVesRate'
import { useProfileTenantId } from './useProfileTenantId'
import { useDepositDefault } from './useDepositDefault'

import { paymentKindFromType } from '../types'
import type {
  FinancesAppointmentOption,
  FinancesPayment,
  FinancesPaymentKind,
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

/** Campos de Bs que se guardan junto al pago; solo se envían en tenants VE. */
interface PaymentVesColumns {
  paid_currency: 'USD' | 'VES'
  exchange_rate: number | null
  amount_ves: number | null
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
    mutationFn: async (data: {
      amount: string
      method: string
      date: string
      notes: string | null
      is_abono: boolean
      kind: FinancesPaymentKind
      service_total: number | null
      appointment_id: string | null
      tenant_id: string
    } & Partial<PaymentVesColumns>) => {
      const { error } = await supabase.from('payments').insert(data)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      invalidateAll()
      closeModal()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo registrar el pago'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: {
        amount: string
        method: string
        date: string
        notes: string | null
        is_abono: boolean
        kind: FinancesPaymentKind
        service_total: number | null
        appointment_id: string | null
      } & Partial<PaymentVesColumns>
    }) => {
      const { error } = await supabase.from('payments').update(data).eq('id', id)
      if (error) throw new Error(error.message)
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
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw new Error(error.message)
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
      if (abono) return { amount: (abono.service_total - abono.amount).toFixed(2), serviceTotal: '' }
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
    setPaymentType(
      payment.kind === 'product' ? 'producto' : payment.is_abono ? 'abono' : 'full'
    )
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
      const n = parseFloat(p.amount.replace(',', '.'))
      let amount = p.amount
      if (formRate && Number.isFinite(n) && n > 0) {
        amount = (next === 'VES' ? convertirUsdABs(n, formRate) : convertirBsAUsd(n, formRate)).toFixed(2)
      }
      return { ...p, currency: next, amount }
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
    const num = parseFloat(formData.amount.replace(',', '.'))
    if (Number.isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido')
      return
    }
    if (!tenantId) {
      Alert.alert('Error', 'No se pudo identificar el negocio')
      return
    }

    const enBs = ves.enabled && formData.currency === 'VES'
    if (enBs && !formRate) {
      Alert.alert('Error', 'No hay tasa de cambio disponible. Configúrala en Ajustes.')
      return
    }
    const amountUsd = enBs && formRate ? convertirBsAUsd(num, formRate) : num
    const serviceTotal = parseFloat(formData.serviceTotal.replace(',', '.'))
    const hasServiceTotal = paymentType === 'abono' && Number.isFinite(serviceTotal) && serviceTotal > 0
    if (hasServiceTotal && amountUsd >= serviceTotal) {
      Alert.alert('Error', 'El adelanto debe ser menor que el valor total del servicio')
      return
    }

    const vesColumns: Partial<PaymentVesColumns> = ves.enabled
      ? {
          paid_currency: enBs ? 'VES' : 'USD',
          exchange_rate: formRate ?? null,
          amount_ves: enBs && formRate ? num : null,
        }
      : {}

    const payload = {
      amount: String(amountUsd),
      method: formData.method,
      date: editingPayment ? editingPayment.date : new Date().toISOString(),
      notes: formData.notes.trim() || null,
      is_abono: paymentType === 'abono',
      kind: paymentKindFromType(paymentType),
      service_total: hasServiceTotal ? serviceTotal : null,
      appointment_id: selectedAppointmentId,
      ...vesColumns,
    }

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: payload })
    } else {
      createMutation.mutate({ ...payload, tenant_id: tenantId })
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
