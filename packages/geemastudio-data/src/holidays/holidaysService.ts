import type { SupabaseClient } from '@supabase/supabase-js'
import { catalogRowsForSeed } from '@zmtech/tenant-config'

import type { SalonHolidayCreateInput, SalonHolidayRecord, SalonHolidayUpdateInput } from './types'

const HOLIDAY_COLUMNS =
  'id, date, name, is_closed, open_from_hour, open_until_hour, created_at, updated_at'

export async function fetchSalonHolidays(
  client: SupabaseClient,
  tenantId: string
): Promise<SalonHolidayRecord[]> {
  const { data, error } = await client
    .from('salon_holidays')
    .select(HOLIDAY_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as SalonHolidayRecord[]
}

/**
 * Siembra los feriados del país que falten (no pisa los existentes).
 * Devuelve cuántas filas intentó sembrar (0 si el país no tiene catálogo).
 */
export async function seedSalonHolidaysFromCatalog(
  client: SupabaseClient,
  tenantId: string,
  country: string
): Promise<number> {
  const seed = catalogRowsForSeed(country, tenantId)
  if (seed.length === 0) return 0
  const { error } = await client.from('salon_holidays').upsert(seed, {
    onConflict: 'tenant_id,date',
    ignoreDuplicates: true,
  })
  if (error) throw new Error(error.message)
  return seed.length
}

export async function createSalonHoliday(
  client: SupabaseClient,
  input: SalonHolidayCreateInput
): Promise<SalonHolidayRecord> {
  const { data, error } = await client
    .from('salon_holidays')
    .insert({
      tenant_id: input.tenantId,
      date: input.date,
      name: input.name.trim(),
      is_closed: input.is_closed,
      open_from_hour: input.is_closed ? null : input.open_from_hour,
      open_until_hour: input.is_closed ? null : input.open_until_hour,
    })
    .select(HOLIDAY_COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un feriado registrado para esa fecha.')
    }
    throw new Error(error.message)
  }
  return data as SalonHolidayRecord
}

export async function updateSalonHoliday(
  client: SupabaseClient,
  input: SalonHolidayUpdateInput
): Promise<SalonHolidayRecord> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.is_closed !== undefined) patch.is_closed = input.is_closed
  if (input.open_from_hour !== undefined) patch.open_from_hour = input.open_from_hour
  if (input.open_until_hour !== undefined) patch.open_until_hour = input.open_until_hour

  const { data, error } = await client
    .from('salon_holidays')
    .update(patch)
    .eq('id', input.id)
    .select(HOLIDAY_COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  return data as SalonHolidayRecord
}

export async function deleteSalonHoliday(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('salon_holidays').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
