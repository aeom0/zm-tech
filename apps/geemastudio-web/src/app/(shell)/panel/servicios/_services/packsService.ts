import { supabase } from '@/lib/supabase'
import {
  createPack as createPackData,
  deletePack as deletePackData,
  fetchPacks as fetchPacksData,
  togglePackActive as togglePackActiveData,
  updatePack as updatePackData,
  type Pack,
  type PackInput,
} from '@geemastudio/data'

export type { Pack, PackInput }

function requireSupabase() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

export async function fetchPacks(): Promise<Pack[]> {
  return fetchPacksData(requireSupabase())
}

export async function createPack(input: PackInput): Promise<Pack> {
  return createPackData(requireSupabase(), input)
}

export async function updatePack(id: string, input: Partial<PackInput>): Promise<Pack> {
  return updatePackData(requireSupabase(), id, input)
}

export async function deletePack(id: string): Promise<void> {
  return deletePackData(requireSupabase(), id)
}

export async function togglePackActive(id: string, is_active: boolean): Promise<void> {
  return togglePackActiveData(requireSupabase(), id, is_active)
}
