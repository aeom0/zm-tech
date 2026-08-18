'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Lock, Mail, KeyRound, FlaskConical } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const DEMO_PASSWORD = 'Geema2025!'

const DEMO_EMAILS = new Set([
  'demo.salon@ejemplo.com',
  'demo.nails@ejemplo.com',
  'demo.barberia@ejemplo.com',
  'demo.estetica@ejemplo.com',
])

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const demoEmail = searchParams.get('demo') ?? ''
  const isDemo = DEMO_EMAILS.has(demoEmail)

  // Estado inicial desde query (sin effect — evita set-state-in-effect en build)
  const [email, setEmail] = useState(demoEmail)
  const [password, setPassword] = useState(isDemo ? DEMO_PASSWORD : '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.ok) {
        router.replace('/finanzas')
        router.refresh()
      } else {
        setError(result.error ?? 'Error al iniciar sesi\u00f3n')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-md px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-[var(--primary)] dark:text-zinc-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div
              className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: isDemo
                  ? 'rgba(233,30,140,0.12)'
                  : 'var(--primary-10, rgba(99,102,241,0.1))',
              }}
            >
              {isDemo ? (
                <FlaskConical className="h-7 w-7" style={{ color: '#E91E8C' }} />
              ) : (
                <Lock className="h-7 w-7 text-[var(--primary)]" />
              )}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {isDemo ? 'Acceso demo' : 'Iniciar sesi\u00f3n'}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {isDemo
                ? 'Cuenta demo \u00b7 Los datos se restablecen al cerrar sesi\u00f3n'
                : 'Panel de finanzas \u00b7 Solo administraci\u00f3n'}
            </p>
          </div>

          {/* Banner demo */}
          {isDemo && (
            <div
              className="mb-5 rounded-xl border px-4 py-3 text-sm"
              style={{
                backgroundColor: 'rgba(233,30,140,0.08)',
                borderColor: 'rgba(233,30,140,0.25)',
                color: '#E91E8C',
              }}
            >
              <span className="font-semibold">Modo demo activo</span>
              {' · '}
              Puedes explorar y modificar libremente. Todo se restaura al hacer logout.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Correo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="tu@negocio.com"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 font-semibold text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: isDemo
                  ? 'linear-gradient(135deg, #E91E8C 0%, #9C27B0 100%)'
                  : 'var(--primary)',
              }}
            >
              {loading ? 'Entrando\u2026' : isDemo ? 'Entrar al demo' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
            {isDemo
              ? 'Cuenta de demo \u00b7 No ingresar datos reales'
              : 'Misma cuenta que la app m\u00f3vil (Supabase Auth).'}
          </p>
        </div>
      </main>
    </div>
  )
}

export default function FinanzasLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
