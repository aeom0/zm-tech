'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Settings } from 'lucide-react'

const h1Lines = ['Ingeniería de', 'Software a', 'Velocidad de IA']

export default function Hero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Hero gradient top-right */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(139,92,246,0.15) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 pt-32 pb-24 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 font-mono text-xs tracking-widest text-violet-300 uppercase">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                Tu próxima app empieza aquí
              </span>
            </motion.div>

            {/* H1 */}
            <h1 className="text-5xl leading-none font-black lg:text-7xl">
              {h1Lines.map((line, i) => (
                <motion.span
                  key={line}
                  className={`block ${i === 2 ? 'bg-clip-text text-transparent' : 'text-white'}`}
                  style={
                    i === 2
                      ? { backgroundImage: 'linear-gradient(to right, #a78bfa, #c084fc, #60a5fa)' }
                      : {}
                  }
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                >
                  {line}
                </motion.span>
              ))}
            </h1>

            {/* Paragraph */}
            <motion.p
              className="max-w-lg text-lg leading-relaxed text-gray-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              Convertimos tu idea en software real. Rápido, elegante y listo para crecer contigo desde el primer día.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <button
                onClick={() => scrollTo('cotizador')}
                className="rounded-lg bg-violet-600 px-6 py-3 font-mono text-sm tracking-wider text-white uppercase transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
              >
                COTIZAR PROYECTO →
              </button>
              <button
                onClick={() => scrollTo('verticales')}
                className="rounded-lg border border-white/20 px-6 py-3 font-mono text-sm tracking-wider text-white uppercase transition-all duration-200 hover:border-violet-500/50 hover:bg-white/5"
              >
                VER ECOSISTEMA
              </button>
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/20">
              <div className="relative h-[420px] w-full lg:h-[520px]">
                <Image
                  src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80"
                  alt="Código de ingeniería de software"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                {/* Overlay gradients */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, transparent, rgba(88,28,235,0.2))',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(5,5,5,0.2), transparent, rgba(5,5,5,0.1))',
                  }}
                />
              </div>

              {/* Floating status card */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-lg border border-violet-500/30 bg-black/80 p-3 backdrop-blur">
                <Settings className="animate-spin-slow h-5 w-5 text-violet-400" />
                <div>
                  <p className="font-mono text-xs tracking-wider text-gray-400 uppercase">
                    Proyectos activos
                  </p>
                  <p className="font-mono text-sm text-green-400">3 verticales en producción</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
