'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Factory, Sparkles, Wrench } from 'lucide-react'
import Image from 'next/image'
import type { ElementType } from 'react'
import type { VerticalsMessages } from '@/content/messages'

type Props = { messages: VerticalsMessages }

const meta: Array<{
  key: keyof VerticalsMessages['items']
  icon: ElementType
  iconColor: string
  image: string
  hoverBorder: string
  glow: string
  objectPosition?: string
}> = [
  {
    key: 'industrial',
    icon: Factory,
    iconColor: 'text-blue-400',
    image: '/hero/zetaeme-hub.webp',
    hoverBorder: 'hover:border-blue-500/40',
    glow: 'rgba(59,130,246,0.2)',
    objectPosition: 'object-top',
  },
  {
    key: 'beauty',
    icon: Sparkles,
    iconColor: 'text-violet-400',
    image: '/verticales/geemastudio-preview.webp',
    hoverBorder: 'hover:border-violet-500/40',
    glow: 'rgba(139,92,246,0.2)',
  },
  {
    key: 'workshop',
    icon: Wrench,
    iconColor: 'text-emerald-400',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80',
    hoverBorder: 'hover:border-emerald-500/40',
    glow: 'rgba(16,185,129,0.2)',
  },
]

export default function Verticals({ messages }: Props) {
  const scrollToCotizador = () => {
    document.getElementById('cotizador')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="verticales" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            {messages.eyebrow}
          </p>
          <h2 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl">
            {messages.title}
          </h2>
          <div className="mx-auto mt-4 h-0.5 w-16 bg-violet-500" />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {meta.map((v, index) => {
            const copy = messages.items[v.key]
            return (
              <motion.div
                key={v.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`group relative flex flex-col overflow-hidden rounded-xl border border-white/10 ${v.hoverBorder} transition-all duration-500`}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${v.glow}`
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={v.image}
                    alt={copy.title}
                    fill
                    className={`object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0 ${v.objectPosition ?? ''}`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, #050505, transparent)' }}
                  />
                  <div className="absolute inset-0 bg-violet-900/40 mix-blend-multiply" />
                  <div className="absolute top-3 right-3 rounded-full border border-white/20 bg-black/60 p-2 backdrop-blur">
                    <v.icon className={`h-4 w-4 ${v.iconColor}`} />
                  </div>
                  {v.key === 'beauty' && (
                    <div className="absolute top-3 left-3 rounded-full border border-violet-400/40 bg-black/70 px-2.5 py-1 font-mono text-[10px] tracking-wider text-violet-300 uppercase backdrop-blur">
                      {messages.previewBadge}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-2 text-xl font-bold text-white">{copy.title}</h3>
                  <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-400">
                    {copy.description}
                  </p>
                  <button
                    type="button"
                    onClick={scrollToCotizador}
                    className="inline-flex items-center gap-1 self-start font-mono text-xs tracking-wider text-violet-300 uppercase transition-colors hover:text-violet-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                  >
                    {copy.cta}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
