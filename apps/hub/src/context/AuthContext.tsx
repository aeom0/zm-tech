/**
 * Auth del Hub — Supabase Auth + membership hub_members.
 * Sesión válida sin fila en hub_members → member = null (pantalla /sin-acceso).
 */
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import type { HubMemberRole } from '@zmtech/hub-schema'
import { createClient } from '@/lib/supabase/client'
import type { HubMemberWeb } from '@/types'

export interface AuthContextValue {
  token: string | null
  user: { id: string; email: string } | null
  member: HubMemberWeb | null
  /** true si hay sesión pero no hay fila en hub_members (o tabla ausente). */
  sinAcceso: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadMember(userId: string): Promise<HubMemberWeb | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hub_members')
    .select('user_id, role, display_name')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    // Tabla aún no aplicada (plan 02) u otro error RLS
    console.warn('[hub auth]', error.message)
    return null
  }
  if (!data) return null

  return {
    userId: data.user_id as string,
    role: data.role as HubMemberRole,
    displayName: (data.display_name as string | null) ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<HubMemberWeb | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncMember = useCallback(async (uid: string | null) => {
    if (!uid) {
      setMember(null)
      return
    }
    const m = await loadMember(uid)
    setMember(m)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      await syncMember(data.session?.user.id ?? null)
      if (!cancelled) setIsLoading(false)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void syncMember(next?.user.id ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [syncMember])

  const login = useCallback(async (email: string, password: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw new Error(error.message)

    const uid = data.user?.id ?? data.session?.user?.id ?? null
    if (!uid) throw new Error('No se obtuvo la sesión')

    const m = await loadMember(uid)
    setSession(data.session)
    setMember(m)
    // Si no hay membership, el caller redirige a /sin-acceso
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSession(null)
    setMember(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null
    return {
      token: session?.access_token ?? null,
      user,
      member,
      sinAcceso: Boolean(session && !member),
      isLoading,
      login,
      logout,
    }
  }, [session, member, isLoading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
