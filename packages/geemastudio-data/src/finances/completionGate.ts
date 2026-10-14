/** Fila mínima de `payments` necesaria para evaluar el gate de abono/pago pendiente. */
export interface AppointmentCompletionPayment {
  appointment_id: string | null
  amount: number | string
  is_abono?: boolean
}

export type CompletionGate =
  /** Hay pago parcial que no cubre el precio: no se completa hasta registrar el resto. */
  | { kind: 'partial'; totalPaid: number; amountDue: number }
  /** Ya está pagada por completo: se completa sin pedir método de pago. */
  | { kind: 'paid'; totalPaid: number; amountDue: 0 }
  /** Sin pagos: se pide el método y se registra el cobro al completar. */
  | { kind: 'needs_payment'; totalPaid: 0; amountDue: number }

function toAmount(value: number | string): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/** Total cobrado de una cita (abonos + pagos). */
export function totalPaidForAppointment(
  appointmentId: string,
  payments: AppointmentCompletionPayment[]
): number {
  return payments
    .filter((p) => p.appointment_id === appointmentId)
    .reduce((sum, p) => sum + toAmount(p.amount), 0)
}

/** Saldo pendiente de una cita (nunca negativo). */
export function amountDueForAppointment(
  appointment: { id: string; price: number | string },
  payments: AppointmentCompletionPayment[]
): number {
  const due = toAmount(appointment.price) - totalPaidForAppointment(appointment.id, payments)
  return due > 0 ? Math.round(due * 100) / 100 : 0
}

/** Regla compartida para "marcar cita completada" (app y panel web). */
export function evaluateCompletionGate(
  appointment: { id: string; price: number | string },
  payments: AppointmentCompletionPayment[]
): CompletionGate {
  const price = toAmount(appointment.price)
  const totalPaid = totalPaidForAppointment(appointment.id, payments)
  if (totalPaid > 0 && totalPaid < price) {
    return { kind: 'partial', totalPaid, amountDue: amountDueForAppointment(appointment, payments) }
  }
  if (totalPaid >= price && totalPaid > 0) {
    return { kind: 'paid', totalPaid, amountDue: 0 }
  }
  if (price <= 0) return { kind: 'paid', totalPaid, amountDue: 0 }
  return { kind: 'needs_payment', totalPaid: 0, amountDue: price }
}
