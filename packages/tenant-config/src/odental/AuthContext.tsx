/**
 * Auth OdentalPro — Supabase Auth + claims tenant_id / role en app_metadata
 * y fila odental_employees (auth_user_id).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

import { extractOdentalClaims, isOdentalAdmin } from './jwt'
import type { OdentalEmployeeRow, OdentalRole } from './types'

type AuthContextValue = {
  client: SupabaseClient
  isAuthenticated: boolean
  isLoading: boolean
  session: Session | null
  userId: string | null
  role: OdentalRole | null
  tenantId: string | null
  employeeId: string | null
  employee: OdentalEmployeeRow | null
  isAdmin: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refreshEmployee: () => Promise<void>
}

const OdentalAuthContext = createContext<AuthContextValue | null>(null)

async function fetchEmployeeByAuthUser(
  client: SupabaseClient,
  userId: string
): Promise<OdentalEmployeeRow | null> {
  const { data, error } = await client
    .from('odental_employees')
    .select('id, tenant_id, role, specialty, full_name, auth_user_id, created_at')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[odental auth] employee lookup:', error.message)
    return null
  }
  return (data as OdentalEmployeeRow | null) ?? null
}

export function OdentalAuthProvider({
  client,
  children,
}: {
  client: SupabaseClient
  children: React.ReactNode
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [employee, setEmployee] = useState<OdentalEmployeeRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncEmployee = useCallback(
    async (uid: string | null) => {
      if (!uid) {
        setEmployee(null)
        return
      }
      const row = await fetchEmployeeByAuthUser(client, uid)
      setEmployee(row)
    },
    [client]
  )

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const { data } = await client.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      await syncEmployee(data.session?.user.id ?? null)
      if (!cancelled) setIsLoading(false)
    }

    void init()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void syncEmployee(next?.user.id ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [client, syncEmployee])

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

      const row = await fetchEmployeeByAuthUser(client, uid)
      setEmployee(row)
      if (!row) {
        return {
          ok: false,
          error:
            'Tu usuario no está vinculado a un empleado de clínica. Pide al dueño que te asocie.',
        }
      }
      return { ok: true }
    },
    [client]
  )

  const logout = useCallback(async () => {
    await client.auth.signOut()
    setEmployee(null)
  }, [client])

  const refreshEmployee = useCallback(async () => {
    await syncEmployee(session?.user.id ?? null)
  }, [session?.user.id, syncEmployee])

  const claims = extractOdentalClaims(session)
  const role = (asRoleFromEmployee(employee?.role) ?? claims.role) as OdentalRole | null
  const tenantId = employee?.tenant_id ?? claims.tenantId
  const employeeId = employee?.id ?? claims.employeeId
  const userId = session?.user.id ?? null
  const isAuthenticated = session !== null && employee !== null

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      isAuthenticated,
      isLoading,
      session,
      userId,
      role,
      tenantId,
      employeeId,
      employee,
      isAdmin: isOdentalAdmin(role),
      login,
      logout,
      refreshEmployee,
    }),
    [
      client,
      isAuthenticated,
      isLoading,
      session,
      userId,
      role,
      tenantId,
      employeeId,
      employee,
      login,
      logout,
      refreshEmployee,
    ]
  )

  return <OdentalAuthContext.Provider value={value}>{children}</OdentalAuthContext.Provider>
}

function asRoleFromEmployee(value: string | undefined): OdentalRole | null {
  if (
    value === 'dev' ||
    value === 'dentist-owner' ||
    value === 'assistant' ||
    value === 'specialist'
  ) {
    return value
  }
  return null
}

export function useOdentalAuth(): AuthContextValue {
  const ctx = useContext(OdentalAuthContext)
  if (!ctx) {
    throw new Error('useOdentalAuth debe usarse dentro de <OdentalAuthProvider>')
  }
  return ctx
}

/** Alias pedido en el plan — mismo hook */
export const useAuth = useOdentalAuth
