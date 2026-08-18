/**
 * Auth RepMAX — Supabase Auth + fila repmax_store_users (user_id = auth.uid()).
 * No usa JWT propio ni bcrypt. No cablear a apps todavía (fase 03).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

import type { RepmaxStoreRow, RepmaxStoreUserRole, RepmaxStoreUserRow } from './types'

type AuthContextValue = {
  client: SupabaseClient
  isAuthenticated: boolean
  isLoading: boolean
  session: Session | null
  userId: string | null
  email: string | null
  role: RepmaxStoreUserRole | null
  storeId: string | null
  storeUser: RepmaxStoreUserRow | null
  store: RepmaxStoreRow | null
  isOwner: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refreshMembership: () => Promise<void>
}

const RepmaxAuthContext = createContext<AuthContextValue | null>(null)

type Membership = {
  storeUser: RepmaxStoreUserRow
  store: RepmaxStoreRow
}

async function fetchMembership(client: SupabaseClient, userId: string): Promise<Membership | null> {
  const { data, error } = await client
    .from('repmax_store_users')
    .select(
      `
      id, store_id, user_id, role, full_name, is_active, created_at,
      store:repmax_stores (
        id, name, slug, logo_url, phone, address, city, custom_domain,
        plan, is_active, currency_usd, currency_bs, usd_bs_rate, created_at, updated_at
      )
    `
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[repmax auth] membership lookup:', error.message)
    return null
  }
  if (!data) return null

  const row = data as RepmaxStoreUserRow & {
    store: RepmaxStoreRow | RepmaxStoreRow[] | null
  }
  const store = Array.isArray(row.store) ? row.store[0] : row.store
  if (!store) return null

  const { store: _omit, ...storeUser } = row
  return { storeUser: storeUser as RepmaxStoreUserRow, store }
}

function asRole(value: string | undefined | null): RepmaxStoreUserRole | null {
  if (value === 'owner' || value === 'cashier' || value === 'inventory') {
    return value
  }
  return null
}

export function RepmaxAuthProvider({
  client,
  children,
}: {
  client: SupabaseClient
  children: React.ReactNode
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncMembership = useCallback(
    async (uid: string | null) => {
      if (!uid) {
        setMembership(null)
        return
      }
      const row = await fetchMembership(client, uid)
      setMembership(row)
    },
    [client]
  )

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const { data } = await client.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      await syncMembership(data.session?.user.id ?? null)
      if (!cancelled) setIsLoading(false)
    }

    void init()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void syncMembership(next?.user.id ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [client, syncMembership])

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!email.trim() || !password.trim()) {
        return { ok: false, error: 'Correo y contraseña requeridos' }
      }
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { ok: false, error: error.message }

      const uid = data.user?.id ?? data.session?.user?.id ?? null
      if (!uid) {
        return { ok: false, error: 'No se obtuvo la sesión. Reintenta.' }
      }

      const row = await fetchMembership(client, uid)
      setMembership(row)
      if (!row) {
        return {
          ok: false,
          error: 'Tu usuario no está vinculado a una tienda RepMAX. Pide al dueño que te asocie.',
        }
      }
      return { ok: true }
    },
    [client]
  )

  const logout = useCallback(async () => {
    await client.auth.signOut()
    setMembership(null)
  }, [client])

  const refreshMembership = useCallback(async () => {
    await syncMembership(session?.user.id ?? null)
  }, [session?.user.id, syncMembership])

  const storeUser = membership?.storeUser ?? null
  const store = membership?.store ?? null
  const role = asRole(storeUser?.role)
  const userId = session?.user.id ?? null
  const isAuthenticated = session !== null && membership !== null

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      isAuthenticated,
      isLoading,
      session,
      userId,
      email: session?.user.email ?? null,
      role,
      storeId: store?.id ?? storeUser?.store_id ?? null,
      storeUser,
      store,
      isOwner: role === 'owner',
      login,
      logout,
      refreshMembership,
    }),
    [
      client,
      isAuthenticated,
      isLoading,
      session,
      userId,
      role,
      store,
      storeUser,
      login,
      logout,
      refreshMembership,
    ]
  )

  return <RepmaxAuthContext.Provider value={value}>{children}</RepmaxAuthContext.Provider>
}

export function useRepmaxAuth(): AuthContextValue {
  const ctx = useContext(RepmaxAuthContext)
  if (!ctx) {
    throw new Error('useRepmaxAuth debe usarse dentro de <RepmaxAuthProvider>')
  }
  return ctx
}

/** Alias pedido en el plan — mismo hook */
export const useAuth = useRepmaxAuth
