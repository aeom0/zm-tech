import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { supabaseEnv } from './env.ts'

export function adminClient(): SupabaseClient {
  const env = supabaseEnv()
  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function userFromJwt(req: Request): Promise<{ id: string }> {
  const env = supabaseEnv()
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Falta Authorization.')

  const client = createClient(env.url, env.anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) {
    throw new Error('Sesión inválida o vencida.')
  }
  return { id: data.user.id }
}

export interface StoreMembership {
  storeUserId: string
  role: string
  countryCode: string
  plan: string
}

export async function requireStoreMember(
  admin: SupabaseClient,
  userId: string,
  storeId: string,
  opts?: { ownerOnly?: boolean }
): Promise<StoreMembership> {
  const { data: member, error: memberError } = await admin
    .from('repmax_store_users')
    .select('id, role, is_active')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .eq('is_active', true)
    .maybeSingle()

  if (memberError) throw new Error(memberError.message)
  if (!member) throw new Error('No perteneces a esta tienda.')
  if (opts?.ownerOnly && member.role !== 'owner') {
    throw new Error('Solo el dueño puede conectar o desconectar MercadoLibre.')
  }

  const { data: store, error: storeError } = await admin
    .from('repmax_stores')
    .select('country_code, plan')
    .eq('id', storeId)
    .maybeSingle()

  if (storeError) throw new Error(storeError.message)
  if (!store) throw new Error('No encontramos la tienda.')

  return {
    storeUserId: member.id as string,
    role: member.role as string,
    countryCode: (store.country_code as string | null) ?? 'VE',
    plan: (store.plan as string | null) ?? 'basic',
  }
}
