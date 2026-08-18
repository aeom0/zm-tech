'use client'

import { useState } from 'react'
import { FAQS } from '@/lib/constants'
import { RevealWrapper } from '@/components/ui/RevealWrapper'
import { MessageCircle } from 'lucide-react'

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="bg-zinc-50 px-4 py-20 dark:bg-zinc-900/30 md:py-28">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">
              Preguntas frecuentes
            </span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100 md:text-5xl">
              Resolvemos tus dudas
            </h2>
          </div>
        </RevealWrapper>

        {/* Acordeón */}
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <RevealWrapper key={i} variant="up" delay={i * 60}>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    {faq.question}
                  </span>
                  <span
                    className={`flex-shrink-0 text-xl text-primary transition-transform duration-300 ${
                      open === i ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>

                {open === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            </RevealWrapper>
          ))}
        </div>

        {/* CTA debajo */}
        <RevealWrapper variant="up" delay={100}>
          <div className="mt-10 text-center">
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">¿Tienes más preguntas?</p>
            <a
              href="https://wa.me/51932535512"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-600"
            >
              <MessageCircle size={16} strokeWidth={2} />
              Escribir por WhatsApp
            </a>
          </div>
        </RevealWrapper>
      </div>
    </section>
  )
}
