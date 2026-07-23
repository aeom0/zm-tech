'use client'

import { motion } from 'framer-motion'
import { Activity, Bot, TrendingUp, Shield } from 'lucide-react'
import type { ElementType } from 'react'

interface Feature {
  icon: ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Activity,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    title: 'Tu equipo trabaja más rápido',
    description:
      'Eliminamos los procesos que frenan tu negocio. Interfaces limpias, flujos directos y cero pasos innecesarios para que tu gente se enfoque en lo que importa.',
  },
  {
    icon: Bot,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    title: 'Soporte que no te abandona',
    description:
      'No desaparecemos después del lanzamiento. Monitoreamos tu sistema 24/7, resolvemos problemas antes de que los notes y mejoramos el software con el tiempo.',
  },
  {
    icon: TrendingUp,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    title: 'Crece sin romper nada',
    description:
      'Construimos pensando en el futuro. Tu plataforma aguanta desde tus primeros clientes hasta miles de usuarios, sin necesidad de rehacer todo desde cero.',
  },
  {
    icon: Shield,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
    title: 'El código es tuyo, punto',
    description:
      'Transparencia total desde el día uno. El código fuente, los datos y la infraestructura te pertenecen a ti — sin licencias trampa ni dependencias de por vida.',
  },
]

export default function Features() {
  return (
    <section id="ventajas" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="lg:pr-8"
          >
            <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
              MOTOR ZM
            </p>
            <h2 className="mb-6 text-5xl leading-tight font-black text-white">Por qué ZM Tech</h2>
            <p className="mb-8 leading-relaxed text-gray-400">
              No somos una agencia más. Somos el equipo técnico que tu negocio necesitaba — sin los costos de tener uno propio.
            </p>

            {/* Terminal box */}
            <div className="mt-8 rounded-xl border border-white/10 bg-black p-6 font-mono text-sm">
              <p className="text-green-400">&gt; status: operational</p>
              <p className="text-green-400">&gt; latency: &lt; 50ms</p>
              <p className="text-green-400">
                &gt; security_protocols: active
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-green-400 align-middle" />
              </p>
            </div>
          </motion.div>

          {/* RIGHT COLUMN — 2x2 grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((f, index) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors duration-300 hover:border-white/20"
              >
                <div
                  className={`h-10 w-10 rounded-lg ${f.iconBg} mb-3 flex items-center justify-center`}
                >
                  <f.icon className={`h-5 w-5 ${f.iconColor}`} />
                </div>
                <h3 className="mb-2 text-sm font-bold text-white">{f.title}</h3>
                <p className="text-xs leading-relaxed text-gray-400">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
