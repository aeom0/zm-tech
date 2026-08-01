'use client'

import { motion } from 'framer-motion'
import type { HeroMessages } from '@/content/messages'
import HeroDeviceMockup from './HeroDeviceMockup'

type Props = { messages: HeroMessages }

export default function Hero({ messages }: Props) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative lg:min-h-screen">
      {/* Glow clippeado aparte — la section no corta el phone */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-0 right-0 h-150 w-150 rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(139,92,246,0.15) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20 lg:min-h-screen lg:px-8 lg:pt-32 lg:pr-12 lg:pb-24">
        {/*
          Mobile: badge → H1 → mockup → párrafo → CTAs (mockup en el fold)
          Desktop: copy izq (badge+H1+párrafo+CTAs) | mockup der
        */}
        <div className="grid grid-cols-1 gap-8 lg:min-h-[calc(100vh-8rem)] lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-center lg:gap-x-12 lg:gap-y-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="order-1 flex flex-col gap-5 sm:gap-6"
          >
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-xl text-base leading-snug font-medium text-violet-200 sm:text-lg"
            >
              {messages.badge}
            </motion.p>

            <h1 className="text-4xl leading-none font-black sm:text-5xl lg:text-7xl">
              {messages.h1Lines.map((line, i) => (
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="order-2 overflow-visible pr-6 pb-4 sm:pr-10 lg:col-start-2 lg:row-span-2 lg:pr-4 lg:pb-8"
          >
            <HeroDeviceMockup laptopAlts={messages.laptopAlts} phoneAlts={messages.phoneAlts} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="order-3 flex flex-col gap-5 sm:gap-6 lg:col-start-1 lg:row-start-2"
          >
            <p className="max-w-lg text-base leading-relaxed text-gray-400 sm:text-lg">
              {messages.paragraph}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={() => scrollTo('cotizador')}
                className="rounded-lg bg-violet-600 px-6 py-3 font-mono text-sm tracking-wider text-white uppercase transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                {messages.ctaPrimary}
              </button>
              <button
                type="button"
                onClick={() => scrollTo('verticales')}
                className="rounded-lg border border-white/20 px-6 py-3 font-mono text-sm tracking-wider text-white uppercase transition-all duration-200 hover:border-violet-500/50 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
              >
                {messages.ctaSecondary}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
