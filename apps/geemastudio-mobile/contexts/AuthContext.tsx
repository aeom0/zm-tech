/**
 * AuthContext — Supabase Auth + fila en `profiles`.
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  type AuthProfile,
  type Role,
  fetchProfile,
  isAdminRole,
  pollProfileOrInsert,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'

export type { Role, AuthProfile }

type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  userId: string | null
  role: Role | null
  profile: AuthProfile | null
  isAdmin: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

/** Beta / preview: cierra sesión al arrancar para exigir login cada apertura. */
const FORCE_FRESH_START = process.env.EXPO_PUBLIC_FORCE_FRESH_START === 'true'

async function fetchProfileRow(userId: string): Promise<AuthProfile | null> {
  return fetchProfile(supabase, userId)
}

/**
 * Tras sign-in, RLS en `employees` usa get_my_role() desde `profiles`.
 * Si navegamos antes de que exista la fila (o no hay trigger), el INSERT falla.
 * Esperamos al trigger; si sigue sin fila, intentamos INSERT owner (política bootstrap en BD).
 */
async function esperarPerfilOInsertar(userId: string): Promise<AuthProfile | null> {
  return pollProfileOrInsert(supabase, userId, { insertOwnerIfMissing: true })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchProfile = async (uid: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, employee_id, full_name, avatar_url')
        .eq('id', uid)
        .maybeSingle()
      if (!cancelled) setProfile(data ? (data as AuthProfile) : null)
    }

    const init = async () => {
      if (FORCE_FRESH_START) {
        await supabase.auth.signOut()
      }
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      if (data.session) void fetchProfile(data.session.user.id)
      setIsLoading(false)
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (__DEV__) console.log('[AUTH]', event)
      setSession(session)
      if (session) void fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!email.trim() || !password.trim()) {
      return { ok: false, error: 'Correo y contraseña requeridos' }
    }
    const { data: signData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { ok: false, error: error.message }

    const uid = signData.user?.id ?? signData.session?.user?.id ?? null
    if (!uid) {
      return { ok: false, error: 'No se obtuvo la sesión. Reintenta.' }
    }

    const perfil = await esperarPerfilOInsertar(uid)
    if (!perfil) {
      return {
        ok: false,
        error:
          'No pudimos preparar tu perfil (necesario para guardar equipo y ajustes). Reintenta en unos segundos o escribe a soporte.',
      }
    }

    setProfile(perfil)
    return { ok: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const role: Role | null = profile?.role ?? null
  const isAdmin = role === 'dev' || role === 'owner'
  const isAuthenticated = session !== null && profile !== null
  const userId = session?.user.id ?? null

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        role,
        profile,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
