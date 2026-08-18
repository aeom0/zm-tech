import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://llacowjutjfefboqgfnj.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!SUPABASE_ANON_KEY && __DEV__) {
  console.warn('[odentalpro] Falta EXPO_PUBLIC_SUPABASE_ANON_KEY — copia .env.example a .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
