'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { TrendingUp, FileText, Shield } from 'lucide-react'
import {
  siWhatsapp,
  siStripe,
  siGooglecalendar,
  siTelegram,
  siMeta,
} from 'simple-icons'
import type { ElementType, ReactNode } from 'react'
import type { IntegrationsMessages } from '@/content/messages'
import { BrandIcon } from '@/components/icons/BrandIcon'

type Props = { messages: IntegrationsMessages }

type MetaItem = {
  key: keyof IntegrationsMessages['items']
  name: string
  categoryColor: string
  glowColor: string
  renderIcon: () => ReactNode
}

const lucideIcon =
  (Icon: ElementType, className: string) =>
  () =>
    <Icon className={className} />

const meta: MetaItem[] = [
  {
    key: 'mercadolibre',
    name: 'MercadoLibre',
    categoryColor: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    glowColor: 'hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]',
    renderIcon: () => (
      <Image
        src="/brands/mercadolibre.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8"
        unoptimized
      />
    ),
  },
  {
    key: 'cashea',
    name: 'Cashea',
    categoryColor: 'text-yellow-300 border-yellow-300/30 bg-yellow-300/10',
    glowColor: 'hover:border-yellow-400/50 hover:shadow-[0_0_20px_rgba(255,233,66,0.2)]',
    renderIcon: () => (
      <Image
        src="/brands/cashea.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-md"
        unoptimized
      />
    ),
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    categoryColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    glowColor: 'hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]',
    renderIcon: () => (
      <BrandIcon icon={siWhatsapp} className="h-8 w-8" title="WhatsApp" />
    ),
  },
  {
    key: 'stripe',
    name: 'Stripe',
    categoryColor: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
    glowColor: 'hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(99,91,255,0.25)]',
    renderIcon: () => (
      <BrandIcon icon={siStripe} className="h-8 w-8" title="Stripe" />
    ),
  },
  {
    key: 'bcv',
    name: 'Tasa BCV',
    categoryColor: 'text-red-400 border-red-400/30 bg-red-400/10',
    glowColor: 'hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(248,113,113,0.2)]',
    renderIcon: lucideIcon(TrendingUp, 'h-8 w-8 text-red-400'),
  },
  {
    key: 'seniat',
    name: 'Facturación SENIAT',
    categoryColor: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    glowColor: 'hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)]',
    renderIcon: lucideIcon(FileText, 'h-8 w-8 text-orange-400'),
  },
  {
    key: 'calendar',
    name: 'Google Calendar',
    categoryColor: 'text-sky-400 border-sky-400/30 bg-sky-400/10',
    glowColor: 'hover:border-sky-500/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]',
    renderIcon: () => (
      <BrandIcon icon={siGooglecalendar} className="h-8 w-8" title="Google Calendar" />
    ),
  },
  {
    key: 'telegram',
    name: 'Telegram Bot',
    categoryColor: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
    glowColor: 'hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]',
    renderIcon: () => (
      <BrandIcon icon={siTelegram} className="h-8 w-8" title="Telegram" />
    ),
  },
  {
    key: 'meta',
    name: 'Meta / Instagram',
    categoryColor: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    glowColor: 'hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(4,103,223,0.25)]',
    renderIcon: () => (
      <BrandIcon icon={siMeta} className="h-8 w-8" title="Meta" />
    ),
  },
  {
    key: 'auth',
    name: 'Acceso Seguro',
    categoryColor: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
    glowColor: 'hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(167,139,250,0.2)]',
    renderIcon: lucideIcon(Shield, 'h-8 w-8 text-violet-400'),
  },
]

export default function Integrations({ messages }: Props) {
  return (
    <section id="integraciones" className="border-y border-white/5 bg-black/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            {messages.eyebrow}
          </p>
          <h2 className="text-5xl font-black text-white">{messages.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
            {messages.subtitle}
          </p>
          <div className="mx-auto mt-6 h-0.5 w-16 bg-violet-500" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {meta.map((item, index) => {
            const copy = messages.items[item.key]
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className={`flex flex-col gap-3 rounded-xl border border-white/5 bg-white/3 p-5 backdrop-blur-sm transition-all duration-300 ${item.glowColor}`}
              >
                <span
                  className={`w-fit rounded border px-2 py-0.5 font-mono text-xs ${item.categoryColor}`}
                >
                  {copy.category}
                </span>
                {item.renderIcon()}
                <p className="text-base font-bold text-white">{item.name}</p>
                <p className="text-xs leading-relaxed text-gray-400">{copy.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
