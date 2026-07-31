'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  Factory,
  Sparkles,
  Globe,
  ShoppingCart,
  Check,
  ChevronRight,
  Rocket,
  Zap,
  Crown,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { CotizadorHomeMessages } from '@/content/messages'

// ─── Datos estructurales (ids, iconos, precios, clases) ─────────────────────

const tipoIds = ['landing', 'corporativa', 'ecommerce', 'saas'] as const
type TipoId = (typeof tipoIds)[number]

const tipoMeta: Record<TipoId, { icon: LucideIcon; min: number; max: number }> = {
  landing: { icon: Globe, min: 120, max: 180 },
  corporativa: { icon: Factory, min: 250, max: 400 },
  ecommerce: { icon: ShoppingCart, min: 500, max: 800 },
  saas: { icon: Sparkles, min: 800, max: 1500 },
}

const disenioIds = ['template', 'custom', 'premium'] as const
type DisenioId = (typeof disenioIds)[number]

const disenioMeta: Record<DisenioId, { mul: number }> = {
  template: { mul: 1.0 },
  custom: { mul: 1.3 },
  premium: { mul: 1.6 },
}

const packIds = ['arranque', 'negocio', 'enterprise'] as const
type PackId = (typeof packIds)[number]

const packMeta: Record<
  PackId,
  {
    icon: LucideIcon
    price: number
    color: string
    borderActive: string
    borderInactive: string
  }
> = {
  arranque: {
    icon: Rocket,
    price: 29,
    color: 'text-sky-400',
    borderActive: 'border-sky-500/70 bg-sky-500/10 shadow-[0_0_20px_rgba(14,165,233,0.15)]',
    borderInactive: 'border-white/10 bg-white/5 hover:border-white/20',
  },
  negocio: {
    icon: Zap,
    price: 69,
    color: 'text-violet-400',
    borderActive: 'border-violet-500/70 bg-violet-500/10 shadow-[0_0_25px_rgba(139,92,246,0.2)]',
    borderInactive: 'border-violet-500/30 bg-violet-500/5 hover:border-violet-500/50',
  },
  enterprise: {
    icon: Crown,
    price: 149,
    color: 'text-amber-400',
    borderActive: 'border-amber-500/70 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    borderInactive: 'border-white/10 bg-white/5 hover:border-white/20',
  },
}

type ExtraItem = CotizadorHomeMessages['extraGroups'][number]['items'][number]

type Props = { messages: CotizadorHomeMessages }

export default function Cotizador({ messages }: Props) {
  const [tipoId, setTipoId] = useState<string | null>(null)
  const [disenioId, setDisenioId] = useState<DisenioId>('template')
  const [packId, setPackId] = useState<string | null>(null)
  const [activeExtras, setActiveExtras] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'packs' | 'extras'>('packs')

  const tipos = tipoIds.map((id) => ({
    id,
    ...tipoMeta[id],
    ...messages.tipos[id],
  }))

  const disenios = disenioIds.map((id) => ({
    id,
    ...disenioMeta[id],
    label: messages.disenios[id],
  }))

  const packs = packIds.map((id) => ({
    id,
    ...packMeta[id],
    ...messages.packs[id],
  }))

  const extraGroups = messages.extraGroups
  const extrasFlat = extraGroups.flatMap((g) => g.items)

  const tipo = tipos.find((t) => t.id === tipoId)
  const disenio = disenios.find((d) => d.id === disenioId)!
  const pack = packs.find((p) => p.id === packId)
  const extrasSum = extrasFlat
    .filter((e) => activeExtras.has(e.id))
    .reduce((acc, e) => acc + e.price, 0)

  const minTotal = tipo ? Math.round(tipo.min * disenio.mul) + extrasSum : null
  const maxTotal = tipo ? Math.round(tipo.max * disenio.mul) + extrasSum : null

  const isExtraLocked = (e: ExtraItem) => !!e.requiresPack && packId !== e.requiresPack

  const toggleExtra = (e: ExtraItem) => {
    if (isExtraLocked(e)) return
    setActiveExtras((prev) => {
      const next = new Set(prev)
      if (next.has(e.id)) next.delete(e.id)
      else next.add(e.id)
      return next
    })
  }

  const renderResultPanel = () => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-violet-400" />
        <span className="font-mono text-xs tracking-widest text-gray-400 uppercase">
          {messages.estimateLabel}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {tipo ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4">
              <p className="mb-1 font-mono text-xs text-gray-500">{messages.initialInvestment}</p>
              <p className="text-3xl leading-none font-black text-white">
                ${minTotal}–${maxTotal}
                <span className="ml-1.5 text-sm font-normal text-gray-400">USD</span>
              </p>
            </div>

            {pack && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-xs tracking-wider text-violet-300 uppercase">
                    {messages.planPrefix} {pack.label}
                  </span>
                  <button
                    onClick={() => setPackId(null)}
                    className="text-gray-600 transition-colors hover:text-gray-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xl font-black text-white">
                  ${pack.price}
                  <span className="ml-1 text-xs font-normal text-gray-400">{messages.perMonth}</span>
                </p>
              </motion.div>
            )}

            {activeExtras.size > 0 && (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="mb-1 font-mono text-xs text-gray-500">
                  {messages.extrasLabel} ({activeExtras.size})
                </p>
                <p className="text-lg font-bold text-white">
                  +${extrasSum}{' '}
                  <span className="text-xs font-normal text-gray-400">{messages.extrasUnique}</span>
                </p>
              </div>
            )}

            <div className="mb-5 flex flex-col gap-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{messages.typeLabel}</span>
                <span className="font-mono text-xs text-white">{tipo.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{messages.designLabel}</span>
                <span className="font-mono text-xs text-white">{disenio.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{messages.deliveryLabel}</span>
                <span className="font-mono text-xs text-green-400">{tipo.dias}</span>
              </div>
            </div>

            <div className="mb-5 flex flex-col gap-1 font-mono text-xs text-gray-500">
              {messages.trust.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <a
              href="#contacto"
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 font-mono text-xs tracking-wider text-white uppercase transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]"
            >
              {messages.cta}
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10">
              <Calculator className="h-5 w-5 text-violet-400" />
            </div>
            <p className="font-mono text-xs leading-relaxed tracking-wider text-gray-500 uppercase whitespace-pre-line">
              {messages.emptyTitle}
            </p>
            <div className="flex flex-col gap-1 font-mono text-xs text-gray-600">
              {messages.emptyHints.map((hint) => (
                <p key={hint}>{hint}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <section id="cotizador" className="py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            {messages.eyebrow}
          </p>
          <h2 className="mb-4 text-5xl font-black text-white">{messages.title}</h2>
          <p className="font-mono text-sm text-gray-400">{messages.subtitle}</p>
          <div className="mx-auto mt-4 h-0.5 w-16 bg-violet-500" />
        </motion.div>

        <div className="mb-8 lg:hidden">{renderResultPanel()}</div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="flex flex-col gap-10 lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <p className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase">
                {messages.step1}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {tipos.map((t) => {
                  const Icon = t.icon
                  const active = tipoId === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTipoId(t.id)}
                      className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                        active
                          ? 'border-violet-500/70 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <Icon
                        className={`mb-2 h-5 w-5 ${active ? 'text-violet-400' : 'text-gray-500'}`}
                      />
                      <p className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-300'}`}>
                        {t.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.desc}</p>
                    </button>
                  )
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <p className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase">
                {messages.step2}
              </p>
              <div className="flex flex-wrap gap-3">
                {disenios.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDisenioId(d.id)}
                    className={`rounded-full border px-4 py-2 font-mono text-xs tracking-wider uppercase transition-all duration-200 ${
                      disenioId === d.id
                        ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                        : 'border-white/15 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <p className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase">
                {messages.step3}
              </p>

              <div className="mb-5 flex gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
                {(['packs', 'extras'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-md py-2 font-mono text-xs tracking-wider uppercase transition-all duration-200 ${
                      tab === t
                        ? 'bg-violet-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t === 'packs' ? `📦 ${messages.tabPacks}` : `⚡ ${messages.tabExtras}`}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {tab === 'packs' ? (
                  <motion.div
                    key="packs"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-3"
                  >
                    {packs.map((p) => {
                      const Icon = p.icon
                      const active = packId === p.id
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            const next = active ? null : p.id
                            setPackId(next)
                            if (active) {
                              const locked = extrasFlat
                                .filter((e) => e.requiresPack === p.id)
                                .map((e) => e.id)
                              if (locked.length) {
                                setActiveExtras((prev) => {
                                  const s = new Set(prev)
                                  locked.forEach((id) => s.delete(id))
                                  return s
                                })
                              }
                            }
                          }}
                          className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                            active ? p.borderActive : p.borderInactive
                          }`}
                        >
                          {p.badge && (
                            <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 px-2 py-0.5 font-mono text-[10px] tracking-widest text-white uppercase">
                              {p.badge}
                            </span>
                          )}

                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${active ? p.color : 'text-gray-500'}`} />
                              <span
                                className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-300'}`}
                              >
                                {messages.planPrefix} {p.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-xl font-black ${active ? 'text-white' : 'text-gray-300'}`}
                              >
                                ${p.price}
                              </span>
                              <span className="font-mono text-xs text-gray-500">
                                {messages.perMonth}
                              </span>
                            </div>
                          </div>

                          <p className="mb-3 text-xs leading-relaxed text-gray-500">{p.tagline}</p>

                          <ul className="flex flex-col gap-1">
                            {p.includes.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2 text-xs text-gray-400"
                              >
                                <Check
                                  className={`mt-0.5 h-3 w-3 shrink-0 ${active ? p.color : 'text-gray-600'}`}
                                />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </button>
                      )
                    })}

                    <p className="text-center font-mono text-xs text-gray-600">
                      {messages.cancelAnytime}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="extras"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-6"
                  >
                    {extraGroups.map((group) => (
                      <div key={group.category}>
                        <p
                          className={`mb-2 font-mono text-xs tracking-widest uppercase ${group.color}`}
                        >
                          {group.category}
                        </p>
                        <div className="flex flex-col gap-2">
                          {group.items.map((e) => {
                            const on = activeExtras.has(e.id)
                            const locked = isExtraLocked(e)
                            return (
                              <button
                                key={e.id}
                                onClick={() => toggleExtra(e)}
                                disabled={locked}
                                className={`flex items-start justify-between rounded-lg border px-4 py-3 text-left transition-all duration-200 ${
                                  locked
                                    ? 'cursor-not-allowed border-white/5 bg-white/3 opacity-50'
                                    : on
                                      ? 'border-violet-500/50 bg-violet-500/10'
                                      : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-medium ${on && !locked ? 'text-white' : 'text-gray-300'}`}
                                    >
                                      {e.label}
                                    </span>
                                    {locked && (
                                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                                        {messages.packs.enterprise.label}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs leading-relaxed text-gray-500">
                                    {e.desc}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 pt-0.5">
                                  <span className="font-mono text-xs text-gray-500">
                                    +${e.price}
                                  </span>
                                  <div
                                    className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${
                                      locked
                                        ? 'border-white/10'
                                        : on
                                          ? 'border-violet-500 bg-violet-500'
                                          : 'border-white/20'
                                    }`}
                                  >
                                    {on && !locked && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <p className="text-center font-mono text-xs text-gray-600">
                      {messages.extrasNote}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.div
            className="hidden lg:col-span-2 lg:block"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="sticky top-24">{renderResultPanel()}</div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
