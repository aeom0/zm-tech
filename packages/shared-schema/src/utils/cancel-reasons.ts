export const APPOINTMENT_CANCEL_REASONS = [
  { value: 'client_cancelled', label: 'La clienta canceló' },
  { value: 'no_show', label: 'La clienta no asistió' },
  { value: 'rescheduled', label: 'Se reagendó' },
  { value: 'staff_unavailable', label: 'Profesional no disponible' },
  { value: 'booking_error', label: 'Error al agendar' },
  { value: 'other', label: 'Otro motivo' },
] as const

export type AppointmentCancelReason = (typeof APPOINTMENT_CANCEL_REASONS)[number]['value']

export function getCancelReasonLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return APPOINTMENT_CANCEL_REASONS.find((r) => r.value === value)?.label ?? value
}
