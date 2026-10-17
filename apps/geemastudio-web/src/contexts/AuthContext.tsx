'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { type AuthProfile, type Role, fetchProfile, isAdminRole } from '@geemastudio/data'

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

export function AuthProvider({
  children,
  initialRole = null,
}: {
  children: React.ReactNode
  /** Rol leído en el servidor: la barra de tabs no espera a getSession(). */
  initialRole?: Role | null
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [seedRole, setSeedRole] = useState<Role | null>(initialRole)
  // Con rol de SSR las pestañas se pintan en el primer render.
  const [isLoading, setIsLoading] = useState(initialRole == null)

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    try {
      const p = await fetchProfile(supabase, userId)
      setProfile(p)
    } catch (err) {
      console.warn('Error inesperado cargando perfil:', err)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      if (!supabase) {
        setIsLoading(false)
        return
      }
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('Error recuperando sesión:', error.message)
        }
        if (!isMounted) return

        setSession(data.session ?? null)
        if (data.session?.user) {
          await loadProfile(data.session.user.id)
        } else {
          setSeedRole(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    if (!supabase) return undefined

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        const userId = newSession.user.id
        // Fuera del callback: una consulta aquí adentro espera el lock que
        // getSession() todavía no soltó y la barra se queda vacía.
        setTimeout(() => {
          void loadProfile(userId)
        }, 0)
      } else {
        setProfile(null)
        setSeedRole(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) {
        return {
          ok: false,
          error:
            'No se pudo conectar. Revisa la configuración del sitio e intenta de nuevo.',
        }
      }
      const trimmedEmail = email.trim()

      if (!trimmedEmail || !password.trim()) {
        return { ok: false, error: 'Correo y contraseña requeridos' }
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (error) {
          const message = error.message || ''
          if (/invalid login credentials/i.test(message)) {
            return { ok: false, error: 'Correo o contraseña incorrectos' }
          }
          return {
            ok: false,
            error: 'No se pudo iniciar sesión. Verifica tus datos o intenta más tarde.',
          }
        }

        if (data.session?.user) {
          await loadProfile(data.session.user.id)
        }

        return { ok: true }
      } catch {
        return { ok: false, error: 'Error de conexión' }
      }
    },
    [loadProfile]
  )

  const logout = useCallback(async () => {
    if (!supabase) return
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Error cerrando sesión:', err)
    } finally {
      setSession(null)
      setProfile(null)
      setSeedRole(null)
    }
  }, [])

  const profileRole =
    profile && (profile.role === 'dev' || profile.role === 'owner' || profile.role === 'staff')
      ? profile.role
      : null
  const role: Role | null = profileRole ?? seedRole

  const isAdmin = isAdminRole(role)

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading,
        userId: session?.user?.id ?? null,
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
