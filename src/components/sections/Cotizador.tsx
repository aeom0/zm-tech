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
} from 'lucide-react'

// ─── Tipos de proyecto ───────────────────────────────────────────────────────
const tipos = [
  { id: 'landing',     label: 'Landing Page',     desc: 'Una página, orientada a conversión',      icon: Globe,        min: 120,  max: 180,  dias: '3–5 días'   },
  { id: 'corporativa', label: 'Sitio Corporativo', desc: 'Multi-sección, portafolio o empresa',     icon: Factory,      min: 250,  max: 400,  dias: '7–14 días'  },
  { id: 'ecommerce',   label: 'E-commerce',        desc: 'Tienda online con catálogo y pagos',      icon: ShoppingCart, min: 500,  max: 800,  dias: '14–21 días' },
  { id: 'saas',        label: 'Aplicación Web',     desc: 'Panel de control, acceso por usuario y lógica de negocio', icon: Sparkles, min: 800, max: 1500, dias: '21–45 días' },
]

// ─── Niveles de diseño ───────────────────────────────────────────────────────
const disenios = [
  { id: 'template', label: 'Plantilla adaptada', mul: 1.0 },
  { id: 'custom',   label: 'Personalizado',      mul: 1.3 },
  { id: 'premium',  label: 'Diseño premium',     mul: 1.6 },
]

// ─── Packs mensuales ─────────────────────────────────────────────────────────
const packs = [
  {
    id: 'arranque',
    label: 'Arranque',
    price: 29,
    icon: Rocket,
    color: 'text-sky-400',
    borderActive: 'border-sky-500/70 bg-sky-500/10 shadow-[0_0_20px_rgba(14,165,233,0.15)]',
    borderInactive: 'border-white/10 bg-white/5 hover:border-white/20',
    badge: null,
    tagline: 'Para el negocio que está arrancando en digital',
    includes: [
      'Hosting + dominio incluido',
      'Formulario de leads',
      'SEO on-page básico',
      'Soporte WhatsApp (48h)',
      '1 actualización de contenido/mes',
    ],
  },
  {
    id: 'negocio',
    label: 'Negocio',
    price: 69,
    icon: Zap,
    color: 'text-violet-400',
    borderActive: 'border-violet-500/70 bg-violet-500/10 shadow-[0_0_25px_rgba(139,92,246,0.2)]',
    borderInactive: 'border-violet-500/30 bg-violet-500/5 hover:border-violet-500/50',
    badge: 'MÁS POPULAR',
    tagline: 'Para la empresa que ya vende y quiere vender más',
    includes: [
      'Todo lo del Plan Arranque',
      'Tasa BCV actualizada a diario',
      'WhatsApp Business automatizado',
      'Telegram Bot de alertas',
      'Soporte prioritario (24h)',
      '2 actualizaciones de contenido/mes',
    ],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 149,
    icon: Crown,
    color: 'text-amber-400',
    borderActive: 'border-amber-500/70 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    borderInactive: 'border-white/10 bg-white/5 hover:border-white/20',
    badge: null,
    tagline: 'Para operaciones serias que no pueden fallar',
    includes: [
      'Todo lo del Plan Negocio',
      'Facturación SENIAT automática',
      'Acceso seguro por usuario y roles',
      'Google Calendar sincronizado',
      'Monitoreo 24/7 + backups diarios',
      'Soporte dedicado (4h)',
      'Actualizaciones ilimitadas',
    ],
  },
]

// ─── Tipos explícitos ────────────────────────────────────────────────────────
interface ExtraItem {
  id: string
  label: string
  desc: string
  price: number
  requiresPack?: string
}

interface ExtraGroup {
  category: string
  color: string
  items: ExtraItem[]
}

// ─── Extras à la carte (pago único) ──────────────────────────────────────────
const extraGroups: ExtraGroup[] = [
  {
    category: 'Integraciones de pago',
    color: 'text-blue-400',
    items: [
      { id: 'stripe',       label: 'Stripe',                  desc: 'Cobros en dólares o euros con tarjeta y link de pago. Ideal para la diáspora.',   price: 45 },
      { id: 'cashea',       label: 'Visor de cuotas Cashea',  desc: 'Muestra las cuotas al instante en tu tienda — más claridad para el cliente, más ventas.', price: 30 },
    ],
  },
  {
    category: 'Ecosistema Venezuela',
    color: 'text-red-400',
    items: [
      { id: 'mercadolibre', label: 'MercadoLibre',            desc: 'Catálogo, stock y órdenes sincronizados en tiempo real desde tu sistema.',         price: 60 },
      { id: 'seniat',       label: 'Facturación SENIAT',      desc: 'Facturas Art. 177 generadas automáticamente. Requiere Plan Enterprise.',           price: 65, requiresPack: 'enterprise' },
    ],
  },
  {
    category: 'Marketing & Ventas',
    color: 'text-pink-400',
    items: [
      { id: 'meta',         label: 'Catálogo Meta / Instagram', desc: 'Productos sincronizados con Instagram Shopping y Meta Ads.',                     price: 40 },
      { id: 'seo',          label: 'SEO on-page avanzado',      desc: 'Auditoría completa, keywords, schema markup y optimización técnica.',             price: 30 },
    ],
  },
  {
    category: 'Técnico',
    color: 'text-violet-400',
    items: [
      { id: 'auth',         label: 'Acceso seguro + Roles',    desc: 'Ingreso con correo o Google y control de acceso por usuario.',                    price: 50 },
      { id: 'form',         label: 'Formulario de leads',     desc: 'Captura de contactos con validación, email y guardado en BD.',                     price: 20 },
    ],
  },
]

const extrasFlat = extraGroups.flatMap((g) => g.items)

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Cotizador() {
  const [tipoId, setTipoId]               = useState<string | null>(null)
  const [disenioId, setDisenioId]         = useState('template')
  const [packId, setPackId]               = useState<string | null>(null)
  const [activeExtras, setActiveExtras]   = useState<Set<string>>(new Set())
  const [tab, setTab]                     = useState<'packs' | 'extras'>('packs')

  const tipo      = tipos.find((t) => t.id === tipoId)
  const disenio   = disenios.find((d) => d.id === disenioId)!
  const pack      = packs.find((p) => p.id === packId)
  const extrasSum = extrasFlat
    .filter((e) => activeExtras.has(e.id))
    .reduce((acc, e) => acc + e.price, 0)

  const minTotal = tipo ? Math.round(tipo.min * disenio.mul) + extrasSum : null
  const maxTotal = tipo ? Math.round(tipo.max * disenio.mul) + extrasSum : null

  const isExtraLocked = (e: ExtraItem) =>
    !!e.requiresPack && packId !== e.requiresPack

  const toggleExtra = (e: ExtraItem) => {
    if (isExtraLocked(e)) return
    setActiveExtras((prev) => {
      const next = new Set(prev)
      if (next.has(e.id)) next.delete(e.id)
      else next.add(e.id)
      return next
    })
  }

  // ─── Panel resultado (función, no componente — evita recrearlo como tipo en cada render)
  const renderResultPanel = () => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-violet-400" />
        <span className="font-mono text-xs tracking-widest text-gray-400 uppercase">Tu estimado</span>
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
            {/* Precio único */}
            <div className="mb-4">
              <p className="mb-1 font-mono text-xs text-gray-500">Inversión inicial (único)</p>
              <p className="text-3xl font-black text-white leading-none">
                ${minTotal}–${maxTotal}
                <span className="ml-1.5 text-sm font-normal text-gray-400">USD</span>
              </p>
            </div>

            {/* Pack seleccionado */}
            {pack && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-violet-300 uppercase tracking-wider">Plan {pack.label}</span>
                  <button onClick={() => setPackId(null)} className="text-gray-600 hover:text-gray-400 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xl font-black text-white">
                  ${pack.price}
                  <span className="ml-1 text-xs font-normal text-gray-400">/mes</span>
                </p>
              </motion.div>
            )}

            {/* Extras seleccionados */}
            {activeExtras.size > 0 && (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-mono text-xs text-gray-500 mb-1">Extras ({activeExtras.size})</p>
                <p className="text-lg font-bold text-white">+${extrasSum} <span className="text-xs font-normal text-gray-400">USD único</span></p>
              </div>
            )}

            {/* Detalles */}
            <div className="mb-5 flex flex-col gap-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className="font-mono text-xs text-white">{tipo.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Diseño</span>
                <span className="font-mono text-xs text-white">{disenio.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entrega est.</span>
                <span className="font-mono text-xs text-green-400">{tipo.dias}</span>
              </div>
            </div>

            {/* Trust */}
            <div className="mb-5 flex flex-col gap-1 font-mono text-xs text-gray-500">
              <p>✓ 50% anticipo · 50% entrega</p>
              <p>✓ Código fuente 100% tuyo</p>
              <p>✓ Cancela el plan cuando quieras</p>
              <p>✓ Tecnología de primer nivel</p>
            </div>

            {/* CTA */}
            <a
              href="#contacto"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-violet-600 py-3 font-mono text-xs tracking-wider text-white uppercase transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] group"
            >
              Quiero esta propuesta
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 flex flex-col items-center gap-4 text-center"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-violet-400" />
            </div>
            <p className="font-mono text-xs tracking-wider text-gray-500 uppercase leading-relaxed">
              Elige el tipo de proyecto<br />para ver tu estimado
            </p>
            <div className="flex flex-col gap-1 font-mono text-xs text-gray-600">
              <p>→ Sin compromiso</p>
              <p>→ Respuesta en menos de 24h</p>
              <p>→ Ajustable a tu presupuesto</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <section id="cotizador" className="py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">Herramienta</p>
          <h2 className="mb-4 text-5xl font-black text-white">Cotizador Instantáneo</h2>
          <p className="font-mono text-sm text-gray-400">Obtén un estimado real en menos de 60 segundos</p>
          <div className="mx-auto mt-4 h-0.5 w-16 bg-violet-500" />
        </motion.div>

        {/* Panel resultado — mobile (encima de controles) */}
        <div className="mb-8 lg:hidden">
          {renderResultPanel()}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

          {/* LEFT — Controles */}
          <div className="flex flex-col gap-10 lg:col-span-3">

            {/* 01 — Tipo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <p className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase">01 — ¿Qué necesitas?</p>
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
                      <Icon className={`mb-2 h-5 w-5 ${active ? 'text-violet-400' : 'text-gray-500'}`} />
                      <p className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-300'}`}>{t.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{t.desc}</p>
                    </button>
                  )
                })}
              </div>
            </motion.div>

            {/* 02 — Diseño */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <p className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase">02 — Nivel de diseño</p>
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

            {/* 03 — Packs + Extras (tabs) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <p className="mb-4 font-mono text-xs tracking-widest text-gray-500 uppercase">03 — Plan de soporte mensual</p>

              {/* Tabs */}
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
                    {t === 'packs' ? '📦 Packs mensuales' : '⚡ Extras à la carte'}
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
                          // limpiar extras que requieren el pack que se deseleccionó
                          if (active) {
                            const locked = extrasFlat.filter((e) => e.requiresPack === p.id).map((e) => e.id)
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
                          {/* Badge */}
                          {p.badge && (
                            <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 px-2 py-0.5 font-mono text-[10px] tracking-widest text-white uppercase">
                              {p.badge}
                            </span>
                          )}

                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${active ? p.color : 'text-gray-500'}`} />
                              <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-300'}`}>
                                Plan {p.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`text-xl font-black ${active ? 'text-white' : 'text-gray-300'}`}>
                                ${p.price}
                              </span>
                              <span className="font-mono text-xs text-gray-500">/mes</span>
                            </div>
                          </div>

                          <p className="mb-3 text-xs text-gray-500 leading-relaxed">{p.tagline}</p>

                          <ul className="flex flex-col gap-1">
                            {p.includes.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-xs text-gray-400">
                                <Check className={`mt-0.5 h-3 w-3 shrink-0 ${active ? p.color : 'text-gray-600'}`} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </button>
                      )
                    })}

                    <p className="text-center font-mono text-xs text-gray-600">
                      Sin contrato mínimo · Cancela cuando quieras
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
                        <p className={`mb-2 font-mono text-xs tracking-widest uppercase ${group.color}`}>
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
                                    <span className={`text-sm font-medium ${on && !locked ? 'text-white' : 'text-gray-300'}`}>
                                      {e.label}
                                    </span>
                                    {locked && (
                                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                                        Enterprise
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs leading-relaxed text-gray-500">{e.desc}</span>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 pt-0.5">
                                  <span className="font-mono text-xs text-gray-500">+${e.price}</span>
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
                      Pago único · Se suman al precio del proyecto
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* RIGHT — Panel sticky (solo desktop) */}
          <motion.div
            className="hidden lg:block lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="sticky top-24">
              {renderResultPanel()}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
