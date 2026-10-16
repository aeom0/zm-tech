'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Droplet, Plus, Scissors, Shield, User, X, type LucideIcon } from 'lucide-react'
import {
  ONBOARDING_ACCENT_COLORS,
  ONBOARDING_CATEGORIES,
  ONBOARDING_PRESETS,
  ONBOARDING_PRIMARY_COLORS,
  OnboardingError,
  buildOnboardingConfig,
  completeOnboarding,
  insertOnboardingEmployees,
  insertOnboardingServiceCategories,
  type OnboardingBusinessType,
  type OnboardingEmployeeInput,
} from '@geemastudio/data'
import { countriesForPicker } from '@zmtech/tenant-config'

import { AuthError } from '@/components/auth/AuthScreen'
import { supabase } from '@/lib/supabase'

const BUSINESS_TYPES: ReadonlyArray<{
  key: OnboardingBusinessType
  label: string
  description: string
  icon: LucideIcon
}> = [
  { key: 'spa-nails', label: 'Spa / Uñas', description: 'Manicure, pedicure, pestañas', icon: Droplet },
  { key: 'barbershop', label: 'Barbería', description: 'Cortes, barba, afeitado', icon: User },
  { key: 'hair-salon', label: 'Peluquería', description: 'Cortes, color, peinados', icon: Scissors },
  { key: 'full-aesthetic', label: 'Estética integral', description: 'Faciales, corporales y más', icon: Shield },
]

const STEPS = ['Tu negocio', 'Colores', 'Equipo', 'Servicios'] as const

const CARD = 'rounded-2xl border border-white/[0.08] bg-zinc-900 p-5 sm:p-6'
const INPUT =
  'w-full rounded-xl border border-white/[0.10] bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]'
const PRIMARY_BTN =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#40E0D0] px-5 font-semibold text-zinc-950 transition-colors hover:bg-[#2fc9b9] disabled:opacity-60'
const SECONDARY_BTN =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.12] px-5 font-semibold text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:opacity-60'

function ColorSwatches({
  colors,
  value,
  onChange,
  label,
}: {
  colors: ReadonlyArray<{ label: string; valor: string }>
  value: string
  onChange: (hex: string) => void
  label: string
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-300">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {colors.map((c) => {
          const selected = c.valor.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={c.valor}
              type="button"
              onClick={() => onChange(c.valor)}
              aria-label={c.label}
              aria-pressed={selected}
              title={c.label}
              className={[
                'flex h-10 w-10 items-center justify-center rounded-full border-2 transition',
                selected ? 'border-white' : 'border-transparent hover:border-white/40',
              ].join(' ')}
              style={{ backgroundColor: c.valor }}
            >
              {selected ? <Check className="h-4 w-4 text-white mix-blend-difference" aria-hidden /> : null}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function OnboardingWizard({
  tenantSlug,
  businessName,
}: {
  tenantSlug: string
  businessName: string
}) {
  const router = useRouter()
  const countries = useMemo(() => countriesForPicker(), [])
  const [step, setStep] = useState(0)
  const [countryCode, setCountryCode] = useState('PE')
  const [businessType, setBusinessType] = useState<OnboardingBusinessType>('spa-nails')
  const [primaryColor, setPrimaryColor] = useState(ONBOARDING_PRESETS['spa-nails'].theme.primaryColor)
  const [accentColor, setAccentColor] = useState(ONBOARDING_PRESETS['spa-nails'].theme.accentColor)
  const [team, setTeam] = useState<OnboardingEmployeeInput[]>([])
  const [memberName, setMemberName] = useState('')
  const [memberColor, setMemberColor] = useState(ONBOARDING_PRIMARY_COLORS[0].valor)
  const [categories, setCategories] = useState<string[]>([...ONBOARDING_CATEGORIES['spa-nails']])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Si un paso falla, el reintento no vuelve a insertar lo que ya se guardó.
  const saved = useRef({ team: false, categories: false })

  const chooseBusinessType = (key: OnboardingBusinessType) => {
    setBusinessType(key)
    setPrimaryColor(ONBOARDING_PRESETS[key].theme.primaryColor)
    setAccentColor(ONBOARDING_PRESETS[key].theme.accentColor)
    setCategories([...ONBOARDING_CATEGORIES[key]])
  }

  const addMember = () => {
    const name = memberName.trim()
    if (!name) return
    setTeam((prev) => [...prev, { name, color: memberColor }])
    setMemberName('')
  }

  const toggleCategory = (name: string) => {
    setCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]))
  }

  const finish = async () => {
    if (!supabase) {
      setError('No se pudo conectar. Intenta de nuevo.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (!saved.current.team) {
        await insertOnboardingEmployees(supabase, tenantSlug, team)
        saved.current.team = true
      }
      if (!saved.current.categories) {
        const ordered = ONBOARDING_CATEGORIES[businessType].filter((c) => categories.includes(c))
        await insertOnboardingServiceCategories(supabase, tenantSlug, ordered)
        saved.current.categories = true
      }
      const config = buildOnboardingConfig({ businessName, businessType, countryCode })
      // Al final: is_configured solo pasa a true cuando todo lo anterior quedó guardado.
      await completeOnboarding(supabase, tenantSlug, {
        ...config,
        theme: { ...config.theme, primaryColor, accentColor },
      })
      router.replace('/panel')
      router.refresh()
    } catch (err) {
      setError(
        err instanceof OnboardingError
          ? `No pudimos guardar: ${err.message}`
          : 'No pudimos guardar la configuración. Intenta de nuevo.'
      )
      setSaving(false)
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="dark">
      <div className="min-h-screen bg-[#0F0F0F] px-4 py-8 text-white sm:py-12">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#40E0D0]">
              Paso {step + 1} de {STEPS.length}
            </p>
            <h1 className="text-2xl font-bold">{STEPS[step]}</h1>
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={['h-1 flex-1 rounded-full', i <= step ? 'bg-[#40E0D0]' : 'bg-white/10'].join(' ')}
                />
              ))}
            </div>
          </header>

          {error ? <AuthError>{error}</AuthError> : null}

          {step === 0 ? (
            <section className={`${CARD} space-y-5`}>
              <p className="text-sm text-zinc-400">
                Configuramos moneda, zona horaria y textos para <strong className="text-white">{businessName}</strong>.
              </p>
              <div>
                <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  País
                </label>
                <select
                  id="country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className={INPUT}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label} ({c.currency.code})
                    </option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-zinc-300">Tipo de negocio</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BUSINESS_TYPES.map(({ key, label, description, icon: Icon }) => {
                    const selected = key === businessType
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => chooseBusinessType(key)}
                        aria-pressed={selected}
                        className={[
                          'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                          selected
                            ? 'border-[#40E0D0] bg-[#40E0D0]/10'
                            : 'border-white/[0.08] hover:border-white/20',
                        ].join(' ')}
                      >
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#40E0D0]" aria-hidden />
                        <span>
                          <span className="block font-semibold">{label}</span>
                          <span className="block text-xs text-zinc-400">{description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </section>
          ) : null}

          {step === 1 ? (
            <section className={`${CARD} space-y-6`}>
              <p className="text-sm text-zinc-400">
                Se usan en tu panel y en tu página de reservas. Puedes cambiarlos después.
              </p>
              <ColorSwatches
                label="Color principal"
                colors={ONBOARDING_PRIMARY_COLORS}
                value={primaryColor}
                onChange={setPrimaryColor}
              />
              <ColorSwatches
                label="Color de acento"
                colors={ONBOARDING_ACCENT_COLORS}
                value={accentColor}
                onChange={setAccentColor}
              />
              <div
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] p-4"
                aria-hidden
              >
                <span className="h-10 w-10 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="h-6 w-6 rounded-full" style={{ backgroundColor: accentColor }} />
                <span className="font-semibold">{businessName}</span>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className={`${CARD} space-y-5`}>
              <p className="text-sm text-zinc-400">
                Agrega a quienes atienden citas. Puedes saltar este paso y hacerlo luego en Personal.
              </p>
              <div className="flex gap-2">
                <input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addMember()
                    }
                  }}
                  className={INPUT}
                  placeholder="Nombre"
                  maxLength={60}
                  aria-label="Nombre del integrante"
                />
                <button
                  type="button"
                  onClick={addMember}
                  className={SECONDARY_BTN}
                  aria-label="Agregar integrante"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <ColorSwatches
                label="Color en la agenda"
                colors={ONBOARDING_PRIMARY_COLORS}
                value={memberColor}
                onChange={setMemberColor}
              />
              {team.length > 0 ? (
                <ul className="space-y-2">
                  {team.map((m, i) => (
                    <li
                      key={`${m.name}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.08] px-3 py-2"
                    >
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="flex-1">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => setTeam((prev) => prev.filter((_, j) => j !== i))}
                        className="text-zinc-500 hover:text-white"
                        aria-label={`Quitar a ${m.name}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {step === 3 ? (
            <section className={`${CARD} space-y-4`}>
              <p className="text-sm text-zinc-400">
                Elige las categorías de servicios. Los servicios con precio los agregas en el panel.
              </p>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_CATEGORIES[businessType].map((name) => {
                  const selected = categories.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleCategory(name)}
                      aria-pressed={selected}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition',
                        selected
                          ? 'border-[#40E0D0] bg-[#40E0D0]/10 text-white'
                          : 'border-white/[0.12] text-zinc-400 hover:border-white/30',
                      ].join(' ')}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                      {name}
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0 || saving}
              className={`${SECONDARY_BTN} ${step === 0 ? 'invisible' : ''}`}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => (isLast ? void finish() : setStep((s) => s + 1))}
              disabled={saving}
              className={PRIMARY_BTN}
            >
              {isLast ? (saving ? 'Guardando…' : 'Ir a mi panel') : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
