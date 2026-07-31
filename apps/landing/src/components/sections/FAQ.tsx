'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { FaqMessages } from '@/content/messages'

type Props = { messages: FaqMessages }

export default function FAQ({ messages }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            {messages.eyebrow}
          </p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">{messages.title}</h2>
          <p className="mt-4 text-gray-400">{messages.subtitle}</p>
        </div>

        <div className="space-y-2">
          {messages.items.map((faq, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-white/10">
              <button
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-white/3 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <div className="flex items-center gap-4 pr-4">
                  <span className="shrink-0 font-mono text-sm text-violet-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-medium text-white">{faq.question}</span>
                </div>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown className="h-5 w-5 text-violet-400" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 pl-17 text-sm leading-relaxed text-gray-400">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
