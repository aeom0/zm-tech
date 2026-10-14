import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthProfile, Role } from './types'

export async function fetchProfile(
  client: SupabaseClient,
  userId: string
): Promise<AuthProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, role, employee_id, full_name, avatar_url, tenant_id')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  const role = data.role as Role
  if (role !== 'dev' && role !== 'owner' && role !== 'staff') {
    return null
  }

  return {
    id: String(data.id),
    role,
    employee_id: (data.employee_id as string | null) ?? null,
    full_name: (data.full_name as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    tenant_id: (data.tenant_id as string | null) ?? null,
  }
}

export interface PollProfileOptions {
  pollMs?: number
  pollAttempts?: number
  insertOwnerIfMissing?: boolean
}

export async function pollProfileOrInsert(
  client: SupabaseClient,
  userId: string,
  options: PollProfileOptions = {}
): Promise<AuthProfile | null> {
  const { pollMs = 200, pollAttempts = 30, insertOwnerIfMissing = false } = options

  for (let i = 0; i < pollAttempts; i++) {
    const row = await fetchProfile(client, userId)
    if (row) return row
    await new Promise((r) => setTimeout(r, pollMs))
  }

  if (!insertOwnerIfMissing) return null

  const { error } = await client.from('profiles').insert({
    id: userId,
    role: 'owner',
  })

  if (error && typeof console !== 'undefined') {
    console.warn('[AUTH] insert perfil propio tras espera:', error.message)
  }

  for (let i = 0; i < 15; i++) {
    const row = await fetchProfile(client, userId)
    if (row) return row
    await new Promise((r) => setTimeout(r, pollMs))
  }

  return null
}
