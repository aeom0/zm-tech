export type PromoBroadcastStatus = 'draft' | 'sending' | 'done' | 'failed'
export type PromoItemStatus = 'pending' | 'sent' | 'failed'

export interface PromoBroadcast {
  id: string
  title: string
  template: string
  body_text: string
  image_url: string | null
  wa_media_id: string | null
  status: PromoBroadcastStatus
  total_sent: number
  total_failed: number
  created_by: string | null
  sent_at: string | null
  created_at: string
}

export interface PromoBroadcastItem {
  id: string
  broadcast_id: string
  client_id: string | null
  client_name: string
  phone: string
  status: PromoItemStatus
  error_msg: string | null
  sent_at: string | null
}

/** Clienta candidata a recibir la promo. `phone` es el destino WA (teléfono o BSUID). */
export interface PromoRecipient {
  id: string
  name: string
  phone: string
  last_appointment_date: string | null
  days_since_last_visit: number | null
  category_name: string | null
}

export interface PromoSegmentInput {
  tenantId: string
  timeZone: string
  /** Nombre de la categoría de servicio; null = todas. */
  categoryName: string | null
  /** Solo clientas sin cita futura y 30+ días sin venir (o leads de anuncios sin citas). */
  inactiveOnly: boolean
}

export interface PromoBroadcastCreateInput {
  tenantId: string
  createdBy: string | null
  title: string
  bodyText: string
  imageUrl: string
  recipients: PromoRecipient[]
}

export interface PromoSendResult {
  broadcast_id: string
  total_sent: number
  total_failed: number
}
