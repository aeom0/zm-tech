'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: '¿El código me pertenece a mí o a ZM Tech?',
    answer:
      'Tuyo 100%. Al cerrar el proyecto, te entregamos el código completo, las claves de acceso al servidor y la documentación. No hay letras chiquitas, no hay dependencia de nosotros para que tu sistema funcione.',
  },
  {
    question: '¿Qué pasa después de que lancen mi app?',
    answer:
      'No desaparecemos. Ofrecemos planes de mantenimiento donde monitoreamos tu sistema, resolvemos errores y vamos mejorando el software con el tiempo — con soporte de IA que detecta problemas antes de que tú los notes.',
  },
  {
    question: '¿Cuánto tarda en estar lista mi aplicación?',
    answer:
      'Depende del proyecto, pero gracias a nuestra metodología de trabajo, una primera versión funcional puede estar lista en 4 a 6 semanas. Mucho menos que el promedio del mercado, sin sacrificar calidad.',
  },
  {
    question: '¿Solo trabajan con ciertas industrias?',
    answer:
      'Tenemos verticales especializadas en Industria, Belleza y Automotriz, pero nos adaptamos a cualquier negocio que necesite software serio. Si tienes un problema real, nosotros tenemos la solución.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            BASE DE CONOCIMIENTO
          </p>
          <h2 className="text-4xl font-black text-white">Protocolos Frecuentes</h2>
          <p className="mt-4 text-gray-400">Todo lo que necesitas saber antes de empezar</p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-white/10">
              <button
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-white/3"
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
