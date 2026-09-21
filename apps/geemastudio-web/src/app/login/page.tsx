'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { KeyRound, Mail } from 'lucide-react'

import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password.trim()) {
      setError('Correo y contraseña requeridos')
      return
    }

    if (!supabase) {
      setError(
        'Configuración de Supabase faltante. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local'
      )
      return
    }

    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (signInError) {
        const msg = signInError.message || ''
        if (/invalid login credentials/i.test(msg)) {
          setError('Correo o contraseña incorrectos')
          return
        }
        setError('No se pudo iniciar sesión. Intenta de nuevo.')
        return
      }

      router.replace('/panel')
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark">
      <div className="flex min-h-screen flex-col bg-[#0F0F0F]">
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <Image
                src="/logo-diamondSparkleNGlow.svg"
                alt="GeemaStudio"
                width={200}
                height={200}
                className="mx-auto -mb-2"
                priority
              />
              <h1 className="text-xl font-bold text-white">Bienvenida a tu panel</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-400">
                Gestiona tu agenda, clientas, catálogo de servicios y campañas de WhatsApp desde un
                mismo lugar.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 shadow-sm"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Correo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.10] bg-zinc-800 py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.10] bg-zinc-800 py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#40E0D0] py-3 font-semibold text-white transition-colors hover:bg-[#00897B] focus:outline-none focus:ring-2 focus:ring-[#40E0D0] focus:ring-offset-2 focus:ring-offset-[#0F0F0F] disabled:opacity-60"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-500">
              ¿No tienes acceso? Contacta a soporte de GeemaStudio.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
