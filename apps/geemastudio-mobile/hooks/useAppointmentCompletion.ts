import { useState } from 'react'
import { Alert } from 'react-native'

/** Fila mínima de `payments` necesaria para evaluar el gate de abono/pago pendiente. */
export interface AppointmentCompletionPayment {
  appointment_id: string | null
  amount: number | string
  is_abono: boolean
}

/** Campos mínimos de una cita necesarios para completarla y registrar su pago. */
export interface CompletableAppointment {
  id: string
  price: number | string
  service_id: string
}

interface MutateOptions {
  onSuccess?: () => void
}

interface UpdateStatusMutation {
  mutate: (variables: { id: string; data: { status: string } }, options?: MutateOptions) => void
  isPending: boolean
}

interface CreatePaymentMutation {
  mutate: (
    variables: {
      appointment_id: string
      amount: string
      method: string
      date: string
      notes: string
    },
    options?: MutateOptions
  ) => void
}

interface UseAppointmentCompletionParams<A extends CompletableAppointment> {
  /** Mutación que actualiza `appointments.status` (payload `{ id, data: { status } }`). */
  updateAppointmentMutation: UpdateStatusMutation
  /** Mutación que inserta en `payments`. */
  createPaymentMutation: CreatePaymentMutation
  paymentsByAppointment: AppointmentCompletionPayment[]
  getServiceName: (serviceId: string) => string
  /** Se ejecuta al completar con éxito (cerrar modal, refetch, haptics, etc). */
  onCompleted: () => void
}

/**
 * Flujo compartido "marcar cita completada" (Dashboard y Agenda):
 * - Si hay un abono (pago parcial) y el total pagado no cubre el precio, bloquea.
 * - Si ya está pagada por completo, completa directo sin pedir método de pago.
 * - Si no hay pago aún, muestra el selector de método de pago antes de completar.
 */
export function useAppointmentCompletion<A extends CompletableAppointment>({
  updateAppointmentMutation,
  createPaymentMutation,
  paymentsByAppointment,
  getServiceName,
  onCompleted,
}: UseAppointmentCompletionParams<A>) {
  const [payMethodVisible, setPayMethodVisible] = useState(false)
  const [pendingPayMethod, setPendingPayMethod] = useState('cash')
  const [pendingAppointment, setPendingAppointment] = useState<A | null>(null)

  const completeAppointment = (appointment: A, method?: string) => {
    updateAppointmentMutation.mutate(
      { id: appointment.id, data: { status: 'completed' } },
      {
        onSuccess: () => {
          if (method) {
            const amount =
              typeof appointment.price === 'number'
                ? appointment.price
                : parseFloat(String(appointment.price))
            createPaymentMutation.mutate({
              appointment_id: appointment.id,
              amount: String(amount),
              method,
              date: new Date().toISOString(),
              notes: `Cita completada: ${getServiceName(appointment.service_id)}`,
            })
          }
          setPayMethodVisible(false)
          setPendingAppointment(null)
          onCompleted()
        },
      }
    )
  }

  const handleMarkCompleted = (appointment: A) => {
    const price =
      typeof appointment.price === 'number'
        ? appointment.price
        : parseFloat(String(appointment.price))
    const paymentsForApt = paymentsByAppointment.filter(
      (p) => p.appointment_id === appointment.id
    )
    const hasAbono = paymentsForApt.some((p) => p.is_abono)
    const totalPaid = paymentsForApt.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0)

    if (hasAbono && totalPaid < price) {
      Alert.alert(
        'Pago pendiente',
        'Esta cita solo tiene un pago parcial. Para marcarla como completada primero registra el pago del resto en Finanzas.'
      )
      return
    }
    if (totalPaid >= price) {
      completeAppointment(appointment)
      return
    }
    setPendingAppointment(appointment)
    setPendingPayMethod('cash')
    setPayMethodVisible(true)
  }

  const confirmCompleteWithMethod = () => {
    if (!pendingAppointment) return
    completeAppointment(pendingAppointment, pendingPayMethod)
  }

  const cancelPayMethod = () => {
    setPayMethodVisible(false)
    setPendingAppointment(null)
  }

  return {
    payMethodVisible,
    pendingPayMethod,
    setPendingPayMethod,
    handleMarkCompleted,
    confirmCompleteWithMethod,
    cancelPayMethod,
    isCompleting: updateAppointmentMutation.isPending,
  }
}
