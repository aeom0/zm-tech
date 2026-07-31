'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'

const phoneFrames = [
  { src: '/hero/zmlash-agenda.webp', alt: 'Agenda real — ZM Lash & Nails Beauty' },
  { src: '/hero/zetaeme-sales.webp', alt: 'Ventas del día — ZetaEme Mobile Sales' },
  { src: '/hero/cotizador.webp', alt: 'Cotizador self-service — ZM Tech' },
]

export default function HeroDeviceMockup() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % phoneFrames.length), 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-xl">
      {/* Laptop */}
      <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-black/40 shadow-[0_0_40px_rgba(139,92,246,0.15)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          <span className="ml-2 truncate font-mono text-[10px] tracking-wider text-gray-500 uppercase">
            central.zetaemecosmeticos.com
          </span>
        </div>
        <div className="relative aspect-video w-full">
          <Image
            src="/hero/zetaeme-hub.webp"
            alt="Panel gerencial en producción — ZetaEme Central"
            fill
            className="object-cover object-top"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
      </div>

      {/* Phone — crossfade */}
      <div className="absolute -right-1 -bottom-8 w-24 overflow-hidden rounded-2xl border border-violet-500/30 bg-black shadow-[0_0_30px_rgba(139,92,246,0.25)] sm:-right-2 sm:-bottom-10 sm:w-28 lg:-right-8 lg:-bottom-14 lg:w-36">
        <div className="relative aspect-9/19.5 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={phoneFrames[frame].src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <Image
                src={phoneFrames[frame].src}
                alt={phoneFrames[frame].alt}
                fill
                className="object-cover object-top"
                sizes="150px"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
