"use client";

import { useState } from "react";
import { FAQS } from "@/lib/constants";
import { RevealWrapper } from "@/components/ui/RevealWrapper";
import { MessageCircle } from "lucide-react";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="px-4 py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900/30"
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="text-center mb-12">
            <span className="text-accent font-semibold text-sm uppercase tracking-widest">
              Preguntas frecuentes
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
              Resolvemos tus dudas
            </h2>
          </div>
        </RevealWrapper>

        {/* Acordeón */}
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <RevealWrapper key={i} variant="up" delay={i * 60}>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 pr-4">
                    {faq.question}
                  </span>
                  <span
                    className={`text-primary text-xl flex-shrink-0 transition-transform duration-300 ${
                      open === i ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>

                {open === i && (
                  <div className="px-6 pb-5">
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
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
          <div className="text-center mt-10">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-3">
              ¿Tienes más preguntas?
            </p>
            <a
              href="https://wa.me/51932535512"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={16} strokeWidth={2} />
              Escribir por WhatsApp
            </a>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
