'use client'

import { useEffect, useState } from 'react'
import { LUNARIS } from '@/lib/theme'

const MESSAGES = [
  { from: 'client', text: 'Hola, quiero una cita para mañana', delay: 0 },
  {
    from: 'bot',
    text: '¡Hola! Tenemos disponibilidad mañana a las 11am, 2pm y 4pm. ¿Cuál te va bien?',
    delay: 900,
  },
  { from: 'client', text: 'A las 2pm', delay: 1700 },
  {
    from: 'bot',
    text: 'Cita confirmada para mañana a las 2pm. ¡Te esperamos!',
    delay: 2500,
  },
] as const

export function WABAPreview() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const timers = MESSAGES.map((msg, i) => setTimeout(() => setVisible(i + 1), msg.delay + 400))
    const reset = setTimeout(() => setVisible(0), 5000)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(reset)
    }
  }, [visible])

  useEffect(() => {
    if (visible === 0) {
      const t = setTimeout(() => setVisible(1), 600)
      return () => clearTimeout(t)
    }
  }, [visible])

  return (
    <div className="relative mx-auto max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#0B1418] shadow-2xl">
      {/* Header tipo WA */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-[#1F2C34] px-4 py-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: LUNARIS.gradient.css }}
        >
          SP
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-white">GeemaStudio Bot</p>
          <p className="mt-0.5 text-xs text-[#8696A0]">en línea</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex min-h-[180px] flex-col justify-end space-y-2 p-3">
        {MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={`transition-all duration-500 ${
              visible > i ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            } flex ${msg.from === 'client' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.from === 'client'
                  ? 'rounded-br-sm bg-[#025C4C] text-white'
                  : 'rounded-bl-sm bg-[#1F2C34] text-[#D1D7DB]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Badge 24/7 */}
      <div className="absolute right-3 top-3">
        <span className="rounded-full bg-[#25D366] px-2 py-0.5 text-[10px] font-bold text-white">
          24/7
        </span>
      </div>
    </div>
  )
}
