/**
 * message-logger.ts — Singleton de logging de mensajes WA en wa_messages.
 */

import type { SupabaseClient } from './supabase.ts'

let _supabase: SupabaseClient | null = null
let _tenantId: string | null = null

export function initMessageLogger(supabase: SupabaseClient, tenantId: string): void {
  _supabase = supabase
  _tenantId = tenantId
}

export function logOutMessage(
  phone: string,
  content: string,
  msg_type: 'text' | 'interactive' | 'image' = 'text'
): void {
  if (!_supabase || !_tenantId) return
  void _supabase
    .from('wa_messages')
    .insert({
      tenant_id: _tenantId,
      phone,
      direction: 'out',
      msg_type,
      content: content.slice(0, 2000),
      step_before: null,
    })
    .then(
      () => {},
      () => {}
    )
}
