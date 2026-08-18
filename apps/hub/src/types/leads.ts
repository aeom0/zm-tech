/** Tipos de las tablas cross-producto que se leen en el inbox de leads. */

export interface ContactoLanding {
  id: string
  nombre: string | null
  empresa: string | null
  whatsapp: string | null
  presupuesto: string | null
  created_at: string
}

export interface QuoteLead {
  id: string
  created_at: string
  source: string | null
  slug: string | null
  cliente_nombre: string | null
  cliente_contacto: string | null
  service_ids: unknown
  subtotal: string | number | null
  descuento: string | number | null
  total: string | number | null
  requiere_contacto_directo: boolean | null
  status: string | null
}

export type LeadOrigen = 'landing' | 'cotizador'

export interface LeadUnificado {
  id: string
  origen: LeadOrigen
  nombre: string
  contacto: string | null
  presupuesto: string | null
  createdAt: string
  convertidoClienteId?: string | null
}
