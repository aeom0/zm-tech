'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ProofMessages } from '@/content/messages'

type Props = { messages: ProofMessages }

export default function Proof({ messages }: Props) {
  return (
    <section className="border-y border-white/5 bg-black/60 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="mb-8 font-mono text-xs tracking-widest text-violet-400 uppercase">
            {messages.eyebrow}
          </p>

          <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <div className="rounded-xl border border-white/10 bg-white/3 px-6 py-4 text-left">
              <p className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                {messages.beforeLabel}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-300 line-through decoration-white/30">
                {messages.beforeValue}
              </p>
            </div>
            <ArrowRight className="hidden h-5 w-5 text-violet-400 sm:block" aria-hidden />
            <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-6 py-4 text-left">
              <p className="font-mono text-[10px] tracking-widest text-violet-300 uppercase">
                {messages.afterLabel}
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{messages.afterValue}</p>
            </div>
          </div>

          <blockquote className="mx-auto max-w-2xl text-xl leading-snug font-medium text-white sm:text-2xl">
            &ldquo;{messages.quote}&rdquo;
          </blockquote>
          <p className="mt-4 font-mono text-xs tracking-wider text-gray-500 uppercase">
            {messages.attribution}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
