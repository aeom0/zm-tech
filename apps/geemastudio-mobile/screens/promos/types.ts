export type BroadcastStatus = 'draft' | 'sending' | 'done' | 'failed'
export type ItemStatus = 'pending' | 'sent' | 'failed'

export interface PromoBroadcast {
  id: string
  title: string
  template: string
  body_text: string
  image_url: string | null
  wa_media_id: string | null
  status: BroadcastStatus
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
  status: ItemStatus
  error_msg: string | null
  sent_at: string | null
}

export interface ClienteSegmento {
  id: string
  name: string
  phone: string
  last_appointment_date: string | null
  days_since_last_visit: number | null
  category_name: string | null
}

export type PromoStep = 'config' | 'clientes' | 'preview' | 'enviando' | 'resultado'
