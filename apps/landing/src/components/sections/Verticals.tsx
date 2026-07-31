'use client'

import { motion } from 'framer-motion'
import { Factory, Sparkles, Wrench } from 'lucide-react'
import Image from 'next/image'
import type { ElementType } from 'react'
import type { VerticalsMessages } from '@/content/messages'

type Props = { messages: VerticalsMessages }

const meta: Array<{
  key: keyof VerticalsMessages['items']
  icon: ElementType
  iconColor: string
  iconBg: string
  image: string
  hoverBorder: string
  glow: string
}> = [
  {
    key: 'industrial',
    icon: Factory,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
    hoverBorder: 'hover:border-blue-500/40',
    glow: 'rgba(59,130,246,0.2)',
  },
  {
    key: 'beauty',
    icon: Sparkles,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    hoverBorder: 'hover:border-violet-500/40',
    glow: 'rgba(139,92,246,0.2)',
  },
  {
    key: 'workshop',
    icon: Wrench,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80',
    hoverBorder: 'hover:border-emerald-500/40',
    glow: 'rgba(16,185,129,0.2)',
  },
]

export default function Verticals({ messages }: Props) {
  return (
    <section id="verticales" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            {messages.eyebrow}
          </p>
          <h2 className="text-5xl font-black text-white">{messages.title}</h2>
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
                className={`group relative overflow-hidden rounded-xl border border-white/10 ${v.hoverBorder} cursor-pointer transition-all duration-500`}
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
                    className="object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
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
                </div>
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-bold text-white">{copy.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{copy.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
