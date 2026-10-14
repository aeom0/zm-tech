export type SalonHolidayRecord = {
  id: string
  date: string
  name: string
  is_closed: boolean
  /** Primera hora de inicio; null = apertura habitual. */
  open_from_hour: number | null
  /** Última hora de inicio; null = cierre habitual. */
  open_until_hour: number | null
  created_at?: string
  updated_at?: string
}

export type SalonHolidayCreateInput = {
  tenantId: string
  date: string
  name: string
  is_closed: boolean
  open_from_hour: number | null
  open_until_hour: number | null
}

export type SalonHolidayUpdateInput = {
  id: string
  name?: string
  is_closed?: boolean
  open_from_hour?: number | null
  open_until_hour?: number | null
}
