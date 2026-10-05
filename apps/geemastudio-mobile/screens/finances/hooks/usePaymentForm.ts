import { useState, useMemo } from 'react'
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

import { ABONO_PERCENT } from '../constants'
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

  const openNewPayment = (prefillAptId?: string, prefillType?: FinancesPaymentType) => {
    setEditingPayment(null)
    setPaymentType(prefillType ?? 'full')
    const apt = prefillAptId ? recentAppointments.find((a) => a.id === prefillAptId) : undefined
    const abono = prefillAptId ? abonoPrevioByApt[prefillAptId] : undefined
    const initAmount =
      prefillType === 'completar' && abono
        ? String((abono.service_total - abono.amount).toFixed(2))
        : apt && !abono
          ? String(parseFloat(String(apt.price)).toFixed(2))
          : ''
    setFormData({ ...EMPTY_FORM, amount: initAmount })
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

  const abonoAmount = useMemo(() => {
    if (paymentType !== 'abono' || !formData.serviceTotal.trim()) return null
    const total = parseFloat(formData.serviceTotal.replace(',', '.'))
    if (Number.isNaN(total) || total <= 0) return null
    return (total * ABONO_PERCENT).toFixed(2)
  }, [paymentType, formData.serviceTotal])

  const onSelectAppointment = (aptId: string | null) => {
    setSelectedAppointmentId(aptId)
    if (!aptId) return
    const apt = recentAppointments.find((a) => a.id === aptId)
    const abono = abonoPrevioByApt[aptId]
    if (paymentType === 'completar' && abono) {
      const restante = (abono.service_total - abono.amount).toFixed(2)
      setFormData((p) => ({ ...p, amount: restante }))
    } else if (paymentType === 'full' && apt && !abono) {
      setFormData((p) => ({
        ...p,
        amount: parseFloat(String(apt.price)).toFixed(2),
      }))
    }
  }

  const onChangePaymentType = (type: FinancesPaymentType) => {
    setPaymentType(type)
    setFormData((p) => ({ ...p, amount: '', serviceTotal: '' }))
    if (selectedAppointmentId) {
      const apt = recentAppointments.find((a) => a.id === selectedAppointmentId)
      const abono = abonoPrevioByApt[selectedAppointmentId]
      if (type === 'completar' && abono) {
        setFormData((p) => ({
          ...p,
          amount: (abono.service_total - abono.amount).toFixed(2),
          serviceTotal: '',
        }))
      } else if (type === 'full' && apt && !abono) {
        setFormData((p) => ({
          ...p,
          amount: parseFloat(String(apt.price)).toFixed(2),
          serviceTotal: '',
        }))
      }
    }
  }

  const handleSubmit = () => {
    const isAbonoCalc = paymentType === 'abono' && abonoAmount
    const amountRaw = isAbonoCalc ? abonoAmount : formData.amount
    const amount =
      typeof amountRaw === 'string' ? amountRaw.replace(',', '.') : String(amountRaw ?? '')
    const num = parseFloat(amount)
    if (Number.isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido')
      return
    }
    if (!tenantId) {
      Alert.alert('Error', 'No se pudo identificar el negocio')
      return
    }

    // El adelanto se calcula siempre en USD; el resto se ingresa en la moneda elegida.
    const enBs = ves.enabled && formData.currency === 'VES'
    if (enBs && !formRate) {
      Alert.alert('Error', 'No hay tasa de cambio disponible. Configúrala en Ajustes.')
      return
    }
    const amountUsd = enBs && !isAbonoCalc && formRate ? convertirBsAUsd(num, formRate) : num

    const vesColumns: Partial<PaymentVesColumns> = ves.enabled
      ? {
          paid_currency: enBs ? 'VES' : 'USD',
          exchange_rate: formRate ?? null,
          amount_ves:
            enBs && formRate ? (isAbonoCalc ? convertirUsdABs(num, formRate) : num) : null,
        }
      : {}

    const payload = {
      amount: String(amountUsd),
      method: formData.method,
      date: editingPayment ? editingPayment.date : new Date().toISOString(),
      notes: formData.notes.trim() || null,
      is_abono: paymentType === 'abono',
      kind: paymentKindFromType(paymentType),
      service_total:
        paymentType === 'abono' && formData.serviceTotal.trim()
          ? parseFloat(formData.serviceTotal.replace(',', '.'))
          : null,
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
    abonoAmount,
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
