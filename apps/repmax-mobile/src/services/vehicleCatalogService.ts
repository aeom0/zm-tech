import { supabase } from '../utils/supabase'
import type { VehicleCatalogEntry, VehicleType } from '../types/database'

interface VehicleCatalogRow {
  id: string
  store_id: string
  brand: string
  model: string
  year_from: number | null
  year_to: number | null
  vehicle_type: VehicleType | null
  created_at: string | null
}

function mapEntry(row: VehicleCatalogRow): VehicleCatalogEntry {
  return {
    id: row.id,
    storeId: row.store_id,
    brand: row.brand,
    model: row.model,
    yearFrom: row.year_from ?? undefined,
    yearTo: row.year_to ?? undefined,
    vehicleType: row.vehicle_type ?? undefined,
    createdAt: row.created_at ?? '',
  }
}

export const vehicleCatalogService = {
  async getAll(storeId: string): Promise<VehicleCatalogEntry[]> {
    const { data, error } = await supabase
      .from('repmax_vehicle_catalog')
      .select('*')
      .eq('store_id', storeId)
      .order('brand', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapEntry)
  },

  async create(entry: {
    storeId: string
    brand: string
    model: string
    yearFrom?: number
    yearTo?: number
    vehicleType?: VehicleType
  }): Promise<VehicleCatalogEntry> {
    const payload: Record<string, unknown> = {
      store_id: entry.storeId,
      brand: entry.brand.trim().toUpperCase(),
      model: entry.model.trim().toUpperCase(),
      year_from: entry.yearFrom ?? null,
      year_to: entry.yearTo ?? null,
      vehicle_type: entry.vehicleType ?? null,
    }

    const { data, error } = await supabase
      .from('repmax_vehicle_catalog')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapEntry(data)
  },
}
