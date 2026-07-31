'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'

const phoneSrcs = [
  '/hero/zmlash-agenda.webp',
  '/hero/zetaeme-sales.webp',
  '/hero/cotizador.webp',
] as const

type Props = {
  laptopAlt: string
  phoneAlts: [string, string, string]
}

export default function HeroDeviceMockup({ laptopAlt, phoneAlts }: Props) {
  const [frame, setFrame] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setFrame((f) => (f + 1) % phoneSrcs.length), 3500)
    return () => clearInterval(id)
  }, [reduceMotion])

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden px-1 lg:max-w-xl lg:overflow-visible lg:px-0">
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
            alt={laptopAlt}
            fill
            className="object-cover object-top"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
      </div>

      {/* Phone — crossfade */}
      <div className="absolute right-1 -bottom-6 w-20 overflow-hidden rounded-2xl border border-violet-500/30 bg-black shadow-[0_0_30px_rgba(139,92,246,0.25)] sm:right-2 sm:-bottom-8 sm:w-24 lg:-right-6 lg:-bottom-12 lg:w-36">
        <div className="relative aspect-9/19.5 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={phoneSrcs[frame]}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6 }}
              className="absolute inset-0"
            >
              <Image
                src={phoneSrcs[frame]}
                alt={phoneAlts[frame]}
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
