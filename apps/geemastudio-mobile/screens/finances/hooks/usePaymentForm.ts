import { useState, useMemo } from 'react'
import { Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'

import { ABONO_PERCENT } from '../constants'
import type {
  FinancesAppointmentOption,
  FinancesPayment,
  FinancesPaymentType,
} from '../types'

interface FormData {
  amount: string
  serviceTotal: string
  method: string
  notes: string
}

const EMPTY_FORM: FormData = {
  amount: '',
  serviceTotal: '',
  method: 'cash',
  notes: '',
}

export function usePaymentForm(
  recentAppointments: FinancesAppointmentOption[],
  abonoPrevioByApt: Record<string, { amount: number; service_total: number }>
) {
  const { config } = useTenant()
  const currencySymbol = config.locale.currency.symbol

  const [modalVisible, setModalVisible] = useState(false)
  const [editingPayment, setEditingPayment] = useState<FinancesPayment | null>(null)
  const [paymentType, setPaymentType] = useState<FinancesPaymentType>('full')
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
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
      service_total: number | null
      appointment_id: string | null
    }) => {
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
        service_total: number | null
        appointment_id: string | null
      }
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
    setPaymentType(payment.is_abono ? 'abono' : 'full')
    setFormData({
      amount:
        typeof payment.amount === 'number' ? String(payment.amount) : (payment.amount ?? ''),
      serviceTotal: payment.service_total != null ? String(payment.service_total) : '',
      method: typeof payment.method === 'string' ? payment.method : 'cash',
      notes: payment.notes != null ? String(payment.notes) : '',
    })
    setSelectedAppointmentId(payment.appointment_id ?? null)
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
    const amountRaw = paymentType === 'abono' && abonoAmount ? abonoAmount : formData.amount
    const amount =
      typeof amountRaw === 'string' ? amountRaw.replace(',', '.') : String(amountRaw ?? '')
    const num = parseFloat(amount)
    if (Number.isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido')
      return
    }

    const payload = {
      amount: String(num),
      method: formData.method,
      date: editingPayment ? editingPayment.date : new Date().toISOString(),
      notes: formData.notes.trim() || null,
      is_abono: paymentType === 'abono',
      service_total:
        paymentType === 'abono' && formData.serviceTotal.trim()
          ? parseFloat(formData.serviceTotal.replace(',', '.'))
          : null,
      appointment_id: selectedAppointmentId,
    }

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: payload })
    } else {
      createMutation.mutate(payload)
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
