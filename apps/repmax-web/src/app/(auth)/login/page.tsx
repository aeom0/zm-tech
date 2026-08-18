// ============================================================
// Login del panel web — Industrial Dark
// ============================================================

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { useAuth } from '@/context/AuthContext'

const inputClass =
  'w-full rounded-lg border border-[#2A2A2A] bg-[#242424] px-3 py-2.5 text-[#F5F5F5] placeholder:text-[#616161] focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading: authCargando, token } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destino = searchParams.get('from')?.startsWith('/dashboard')
    ? searchParams.get('from')!
    : '/dashboard/overview'

  // Si ya hay sesión (p. ej. cookie expiró pero quedó el token en localStorage)
  useEffect(() => {
    if (!authCargando && token) {
      router.replace(destino)
    }
  }, [authCargando, token, router, destino])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await login(email, password)
      router.replace(destino)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandLogo variant="wordmark" height={40} priority className="mx-auto" />
        <p className="mt-3 text-sm text-[#9E9E9E]">Panel de administración</p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[#F5F5F5]">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className={inputClass}
              disabled={cargando || authCargando}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[#F5F5F5]">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              disabled={cargando || authCargando}
            />
          </div>

          <button
            type="submit"
            disabled={cargando || authCargando}
            className="flex w-full items-center justify-center rounded-lg bg-[#FF6B00] py-3 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#FF8533] disabled:opacity-60"
          >
            {cargando ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#0D0D0D] border-t-transparent" />
            ) : (
              'Iniciar sesión'
            )}
          </button>

          {error ? <p className="text-center text-sm text-[#F44336]">{error}</p> : null}
        </form>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] px-4">
      <div className="mb-8 h-10 w-48 animate-pulse rounded bg-[#1A1A1A]" />
      <div className="h-80 w-full max-w-md animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
