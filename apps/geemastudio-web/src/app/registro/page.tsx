'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, KeyRound, Mail, Store, User } from 'lucide-react'
import { OnboardingError, signupTenant } from '@geemastudio/data'

import {
  AUTH_INPUT_CLASS,
  AUTH_SUBMIT_CLASS,
  AuthError,
  AuthField,
  AuthScreen,
} from '@/components/auth/AuthScreen'
import { supabase } from '@/lib/supabase'

const ICON = 'h-4 w-4'

export default function RegistroPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!supabase) {
      setError('No se pudo conectar. Intenta de nuevo más tarde.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    try {
      const trimmedEmail = email.trim()
      await signupTenant(supabase, {
        fullName: fullName.trim(),
        email: trimmedEmail,
        password,
        businessName: businessName.trim(),
      })

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail.toLowerCase(),
        password,
      })
      if (signInError) {
        setError('Tu negocio quedó creado, pero no pudimos iniciar sesión. Entra desde el login.')
        return
      }

      router.replace('/onboarding')
      router.refresh()
    } catch (err) {
      setError(err instanceof OnboardingError ? err.message : 'Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreen
      title="Crea tu negocio"
      subtitle="14 días gratis con el plan Pro. Sin tarjeta de crédito."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-[#40E0D0] hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <AuthError>{error}</AuthError>}

        <AuthField id="fullName" label="Tu nombre" icon={<User className={ICON} />}>
          <input
            id="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={AUTH_INPUT_CLASS}
            placeholder="Nombre y apellido"
            minLength={2}
            maxLength={80}
            required
          />
        </AuthField>

        <AuthField id="businessName" label="Nombre del negocio" icon={<Store className={ICON} />}>
          <input
            id="businessName"
            autoComplete="organization"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={AUTH_INPUT_CLASS}
            placeholder="Ej.: Studio Bella"
            minLength={2}
            maxLength={80}
            required
          />
        </AuthField>

        <AuthField id="email" label="Correo" icon={<Mail className={ICON} />}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={AUTH_INPUT_CLASS}
            placeholder="correo@negocio.com"
            required
          />
        </AuthField>

        <AuthField
          id="password"
          label="Contraseña"
          icon={<KeyRound className={ICON} />}
          hint="Mínimo 8 caracteres"
        >
          <input
            id="password"
            type={mostrarContrasena ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${AUTH_INPUT_CLASS} pr-11`}
            placeholder="Crea una contraseña"
            minLength={8}
            maxLength={72}
            required
          />
          <button
            type="button"
            onClick={() => setMostrarContrasena((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus-visible:text-[#40E0D0]"
            aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={mostrarContrasena}
          >
            {mostrarContrasena ? <EyeOff className={ICON} aria-hidden /> : <Eye className={ICON} aria-hidden />}
          </button>
        </AuthField>

        <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
          {loading ? 'Creando tu negocio…' : 'Crear mi negocio'}
        </button>

        <p className="text-center text-xs text-zinc-500">
          Te pediremos confirmar tu correo con un código antes de conectar WhatsApp.
        </p>
      </form>
    </AuthScreen>
  )
}
