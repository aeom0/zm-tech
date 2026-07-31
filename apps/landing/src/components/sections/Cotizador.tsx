'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Calculator } from 'lucide-react'
import type { CotizadorHomeMessages } from '@/content/messages'
import type { Locale } from '@/content/locales'

type Props = { messages: CotizadorHomeMessages; locale: Locale }

export default function Cotizador({ messages, locale }: Props) {
  return (
    <section id="cotizador" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-linear-to-br from-violet-950/50 via-black to-black px-6 py-12 sm:px-12 sm:py-16"
        >
          <div
            className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
            }}
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
              {messages.eyebrow}
            </p>
            <h2 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl">
              {messages.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-400">
              {messages.subtitle}
            </p>

            <ul className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-6">
              {messages.trust.map((item) => (
                <li key={item} className="font-mono text-sm text-violet-200/90">
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/cotizador`}
              className="mt-10 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-8 py-4 font-mono text-sm tracking-wider text-white uppercase transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.45)] focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
            >
              <Calculator className="h-4 w-4" aria-hidden />
              {messages.cta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="mt-4 font-mono text-xs text-gray-500">{messages.secondaryNote}</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
