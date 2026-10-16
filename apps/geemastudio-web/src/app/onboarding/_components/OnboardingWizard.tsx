'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Droplet, Plus, Scissors, Shield, Shuffle, User, UsersRound, X, type LucideIcon } from 'lucide-react'
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
import { onColor } from '@/lib/tenant-theme'
import { BrandPreview } from './BrandPreview'
import { ColorChooser, randomBrandPair } from './ColorChooser'
import { OnboardingDone } from './OnboardingDone'
import { GradientCta, GradientOutline, NebulaBackdrop, Rise, SelectableCard, StepHeader } from './OnboardingUi'

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

const STEPS = [
  { title: 'Tu negocio', subtitle: 'Configuramos moneda, zona horaria y textos según tu país y rubro.' },
  { title: 'Tu marca', subtitle: 'Elige los colores de tu app y de tu página de reservas. Puedes cambiarlos después.' },
  { title: 'Tu equipo', subtitle: 'Agrega a quienes atienden citas. Puedes saltar este paso y hacerlo luego en Personal.' },
  { title: 'Tus servicios', subtitle: 'Elige las categorías. Los servicios con precio los agregas en el panel.' },
] as const

const INPUT =
  'w-full rounded-xl border border-white/[0.10] bg-zinc-800/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]'
const CARD = 'rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-5 backdrop-blur sm:p-6'

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
  const [done, setDone] = useState(false)
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

  const surprise = () => {
    const pair = randomBrandPair()
    setPrimaryColor(pair.primary)
    setAccentColor(pair.accent)
  }

  const addMember = () => {
    const name = memberName.trim()
    if (!name) return
    setTeam((prev) => [...prev, { name, color: memberColor }])
    setMemberName('')
    // Siguiente integrante con otro color de la paleta para distinguirlos en la agenda.
    const next = ONBOARDING_PRIMARY_COLORS[(team.length + 1) % ONBOARDING_PRIMARY_COLORS.length]
    setMemberColor(next.valor)
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
      setDone(true)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(
        err instanceof OnboardingError
          ? `No pudimos guardar: ${err.message}`
          : 'No pudimos guardar la configuración. Intenta de nuevo.'
      )
    } finally {
      setSaving(false)
    }
  }

  const goTo = (next: number) => {
    setError(null)
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isLast = step === STEPS.length - 1
  const country = countries.find((c) => c.code === countryCode)

  return (
    <div className="dark">
      <div className="relative min-h-screen bg-[#0B0B0F] px-4 pb-10 pt-8 text-white sm:pt-12">
        <NebulaBackdrop />
        <div className="relative mx-auto w-full max-w-xl space-y-6">
          {done ? (
            <OnboardingDone
              businessName={businessName}
              stats={[
                { value: String(categories.length), label: categories.length === 1 ? 'Categoría' : 'Categorías' },
                { value: String(team.length), label: team.length === 1 ? 'Profesional' : 'Profesionales' },
                { value: country?.currency.code ?? '—', label: 'Moneda' },
              ]}
              onFinish={() => {
                router.replace('/panel')
                router.refresh()
              }}
            />
          ) : (
            <>
              <StepHeader step={step} total={STEPS.length} title={STEPS[step].title} subtitle={STEPS[step].subtitle} />

              {error ? <AuthError>{error}</AuthError> : null}

              <div key={step} className="space-y-5">
                {step === 0 ? (
                  <>
                    <Rise order={1} className={CARD}>
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
                    </Rise>
                    <Rise order={2}>
                      <fieldset>
                        <legend className="mb-2.5 text-sm font-medium text-zinc-300">
                          ¿Qué tipo de negocio es {businessName}?
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {BUSINESS_TYPES.map(({ key, label, description, icon: Icon }) => {
                            const selected = key === businessType
                            return (
                              <SelectableCard key={key} selected={selected} onClick={() => chooseBusinessType(key)}>
                                <span
                                  className={[
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
                                    selected ? 'bg-geema-gradient' : 'bg-white/[0.06]',
                                  ].join(' ')}
                                >
                                  <Icon className={`h-5 w-5 ${selected ? 'text-white' : 'text-[#40E0D0]'}`} aria-hidden />
                                </span>
                                <span>
                                  <span className="block font-semibold text-white">{label}</span>
                                  <span className="block text-xs text-zinc-400">{description}</span>
                                </span>
                              </SelectableCard>
                            )
                          })}
                        </div>
                      </fieldset>
                    </Rise>
                  </>
                ) : null}

                {step === 1 ? (
                  <>
                    <Rise order={1}>
                      <BrandPreview
                        businessName={businessName}
                        primary={primaryColor}
                        accent={accentColor}
                        services={ONBOARDING_CATEGORIES[businessType]}
                      />
                    </Rise>
                    <Rise order={2} className={`${CARD} space-y-6`}>
                      <ColorChooser
                        label="Color principal"
                        colors={ONBOARDING_PRIMARY_COLORS}
                        value={primaryColor}
                        onChange={setPrimaryColor}
                      />
                      <ColorChooser
                        label="Color de acento"
                        colors={ONBOARDING_ACCENT_COLORS}
                        value={accentColor}
                        onChange={setAccentColor}
                      />
                      <button
                        type="button"
                        onClick={surprise}
                        className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-[#40E0D0]/60 hover:text-white active:scale-95"
                      >
                        <Shuffle className="h-4 w-4 text-[#40E0D0]" aria-hidden />
                        Sorpréndeme
                      </button>
                    </Rise>
                  </>
                ) : null}

                {step === 2 ? (
                  <Rise order={1} className={`${CARD} space-y-5`}>
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
                        placeholder="Nombre (ej.: Vanessa)"
                        maxLength={60}
                        aria-label="Nombre del integrante"
                      />
                      <button
                        type="button"
                        onClick={addMember}
                        disabled={!memberName.trim()}
                        className="bg-geema-gradient inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                        aria-label="Agregar integrante"
                      >
                        <Plus className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                    <ColorChooser
                      label="Su color en la agenda"
                      colors={ONBOARDING_PRIMARY_COLORS}
                      value={memberColor}
                      onChange={setMemberColor}
                      size="sm"
                    />
                    {team.length > 0 ? (
                      <ul className="space-y-2">
                        {team.map((m, i) => (
                          <li
                            key={`${m.name}-${i}`}
                            className="animate-rise flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
                          >
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                              style={{ backgroundColor: m.color, color: onColor(m.color) }}
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="flex-1 font-medium">{m.name}</span>
                            <button
                              type="button"
                              onClick={() => setTeam((prev) => prev.filter((_, j) => j !== i))}
                              className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                              aria-label={`Quitar a ${m.name}`}
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="flex items-center gap-2 rounded-xl border border-dashed border-white/[0.10] px-3 py-3 text-sm text-zinc-500">
                        <UsersRound className="h-4 w-4 shrink-0" aria-hidden />
                        ¿Atiendes sin equipo? Agrégate a ti para recibir citas.
                      </p>
                    )}
                  </Rise>
                ) : null}

                {step === 3 ? (
                  <Rise order={1} className={CARD}>
                    <div className="flex flex-wrap gap-2.5">
                      {ONBOARDING_CATEGORIES[businessType].map((name) => {
                        const selected = categories.includes(name)
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleCategory(name)}
                            aria-pressed={selected}
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-95',
                              selected
                                ? 'bg-geema-gradient text-white shadow-[0_4px_16px_rgba(64,224,208,0.2)]'
                                : 'border border-white/[0.12] text-zinc-400 hover:border-white/30 hover:text-white',
                            ].join(' ')}
                          >
                            {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                            {name}
                          </button>
                        )
                      })}
                    </div>
                  </Rise>
                ) : null}
              </div>

              <Rise order={3} className="flex gap-3">
                {step > 0 ? (
                  <GradientOutline onClick={() => goTo(step - 1)} disabled={saving} className="flex-1">
                    Atrás
                  </GradientOutline>
                ) : null}
                <GradientCta
                  onClick={() => (isLast ? void finish() : goTo(step + 1))}
                  loading={saving}
                  className={step > 0 ? 'flex-[2]' : 'w-full'}
                >
                  {isLast ? (saving ? 'Guardando…' : 'Terminar') : 'Continuar'}
                </GradientCta>
              </Rise>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
