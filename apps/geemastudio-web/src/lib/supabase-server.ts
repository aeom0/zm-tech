import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copia apps/geemastudio-web/.env.local.example → .env.local ' +
        '(mismos valores que EXPO_PUBLIC_* en geemastudio-mobile/.env) y reinicia `pnpm dev`.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignorar: en Server Components está prohibido setear cookies
          // en ciertos escenarios (pre-render). El cliente se mantiene igual.
        }
      },
    },
  })
}
