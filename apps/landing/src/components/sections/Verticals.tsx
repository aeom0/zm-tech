'use client'

import { motion } from 'framer-motion'
import { Factory, Sparkles, Wrench } from 'lucide-react'
import Image from 'next/image'
import type { ElementType } from 'react'

interface Vertical {
  icon: ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  image: string
  hoverBorder: string
  glow: string
}

const verticals: Vertical[] = [
  {
    icon: Factory,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    title: 'ZM Industrial Core',
    description:
      'Controla tu empresa desde una sola pantalla. Inventario, logística, producción y reportes en tiempo real — diseñado para negocios que no pueden darse el lujo de fallar.',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
    hoverBorder: 'hover:border-blue-500/40',
    glow: 'rgba(59,130,246,0.2)',
  },
  {
    icon: Sparkles,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    title: 'ZM Beauty Engine',
    description:
      'Tu spa o estética merece tecnología de primera. Agenda online, historial de clientes, punto de venta y recordatorios automáticos — todo en una app que tu equipo va a querer usar.',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    hoverBorder: 'hover:border-violet-500/40',
    glow: 'rgba(139,92,246,0.2)',
  },
  {
    icon: Wrench,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    title: 'ZM Workshop & Parts',
    description:
      'Vende repuestos, gestiona tu taller y atiende más clientes sin caos. Catálogo digital, órdenes de trabajo y seguimiento de inventario en un solo lugar.',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80',
    hoverBorder: 'hover:border-emerald-500/40',
    glow: 'rgba(16,185,129,0.2)',
  },
]

export default function Verticals() {
  return (
    <section id="verticales" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            ECOSISTEMA
          </p>
          <h2 className="text-5xl font-black text-white">Verticales ZM</h2>
          <div className="mx-auto mt-4 h-0.5 w-16 bg-violet-500" />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {verticals.map((v, index) => (
            <motion.div
              key={v.title}
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
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={v.image}
                  alt={v.title}
                  fill
                  className="object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Overlay gradient — fixed Tailwind v4 */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, #050505, transparent)' }}
                />
                {/* Violet tint */}
                <div className="absolute inset-0 bg-violet-900/40 mix-blend-multiply" />

                {/* Icon floating top-right */}
                <div className="absolute top-3 right-3 rounded-full border border-white/20 bg-black/60 p-2 backdrop-blur">
                  <v.icon className={`h-4 w-4 ${v.iconColor}`} />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">{v.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{v.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
