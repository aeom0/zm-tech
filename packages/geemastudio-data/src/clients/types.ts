export interface FieldCheck {
  error?: string
  hint?: string
}

export interface PhoneCheck extends FieldCheck {
  phone: string | null
  phoneCountry: string | null
  phoneNormalized: string | null
}

export interface DocumentCheck extends FieldCheck {
  value: string | null
}

export interface ClientFormPayload {
  name: string
  phone: string
  email: string
  dni: string
  notes: string
}

export interface ClientRow {
  id: string
  name: string
  phone: string | null
  phone_country: string | null
  phone_normalized: string | null
  email: string | null
  dni: string | null
  notes: string | null
  created_at: string
  tenant_id?: string
}

export type ClientSegment = 'all' | 'vip' | 'new' | 'at_risk' | 'churned'
