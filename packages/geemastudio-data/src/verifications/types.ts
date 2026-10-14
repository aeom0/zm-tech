export type VerificationFilter = 'pending' | 'approved' | 'rejected'

export interface VerificationItem {
  id: string
  client_name: string
  /** Fecha de la cita, en texto de BD (sin zona). */
  date: string
  price: number
  serviceName: string
  kind: string | null
  status: VerificationFilter
  /** Cuándo se aprobó o rechazó (solo historial). */
  resolvedAt: string | null
  /** La aprobación avisa a la clienta por WhatsApp: se resuelve desde ese flujo. */
  readOnly: true
  /** Marca interna: el adelanto se dio por perdido. */
  depositForfeited: boolean
  /** Muestra el control «Adelanto perdido» (adelantos por validar o validados). */
  canMarkForfeit: boolean
}
