'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import Image from 'next/image'

const phoneSrcs = [
  '/hero/zmlash-agenda.webp',
  '/hero/zetaeme-sales.webp',
  '/hero/cotizador.webp',
] as const

const TILT_SPRING = { stiffness: 140, damping: 24, mass: 0.4 }

/** Mostrar phone junto a la laptop en el hero */
const SHOW_PHONE = true

/** Filas del teclado (flex-grow relativo por tecla) — solo decoración */
const KEY_ROWS: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.4],
  [1.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6],
  [1.7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.9],
  [2.1, 1, 1, 1, 1, 1, 1, 1, 1, 2.3],
  [1.3, 1.3, 1.3, 5.2, 1.3, 1.3, 1.3],
]

type Props = {
  laptopAlt: string
  phoneAlts: [string, string, string]
}

function LaptopKeyboard() {
  return (
    <div className="space-y-[3px] px-0.5 sm:space-y-1" aria-hidden>
      {KEY_ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-[2px] sm:gap-[3px]">
          {row.map((grow, ki) => (
            <span
              key={ki}
              style={{ flex: grow }}
              className="h-[5px] rounded-[2px] bg-zinc-700/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-1.5 sm:rounded-sm lg:h-2"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function HeroDeviceMockup({ laptopAlt, phoneAlts }: Props) {
  const [frame, setFrame] = useState(0)
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, TILT_SPRING)
  const springY = useSpring(mouseY, TILT_SPRING)

  // Solo rotateY: bordes laterales verticales (sin rotateX en escena).
  const sceneRotateY = useTransform(springX, [-0.5, 0.5], [12, 20])

  const phoneX = useTransform(springX, [-0.5, 0.5], [-6, 6])
  const phoneY = useTransform(springY, [-0.5, 0.5], [-3, 5])

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setFrame((f) => (f + 1) % phoneSrcs.length), 3500)
    return () => clearInterval(id)
  }, [reduceMotion])

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const onMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative mx-auto w-full max-w-md px-2 perspective-distant sm:px-3 lg:max-w-xl lg:px-0"
    >
      {/* Glow Deep Space */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute top-[18%] left-1/2 h-56 w-[90%] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute right-[-8%] bottom-[8%] h-44 w-44 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute top-[28%] left-[-6%] h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
      </div>

      <motion.div
        style={
          reduceMotion
            ? { rotateY: 16 }
            : { rotateX: 0, rotateY: sceneRotateY }
        }
        className="relative origin-[50%_55%] pb-10 transform-3d will-change-transform sm:pb-12 lg:pb-14"
      >
        {/* ——— Laptop chassis (lid + bisagra + base unidos) ——— */}
        <div className="relative z-10 transform-3d">
          {/* Lid / screen */}
          <div
            className="relative rounded-t-xl border border-b-0 border-violet-500/20 bg-linear-to-b from-zinc-800 to-zinc-900 p-1 pt-1.5 sm:rounded-t-2xl sm:p-1.5 sm:pt-2"
            style={{
              boxShadow:
                '0 0 0 1px rgba(139,92,246,0.1), 0 0 40px rgba(139,92,246,0.18), 0 18px 36px -14px rgba(0,0,0,0.55)',
            }}
          >
            {/* Cámara / notch */}
            <div className="mb-1 flex items-center justify-center gap-2" aria-hidden>
              <span className="h-1 w-1 rounded-full bg-zinc-600 ring-1 ring-zinc-500/40 sm:h-1.5 sm:w-1.5" />
            </div>

            {/* Pantalla inset */}
            <div className="overflow-hidden rounded-md border border-black/60 bg-black sm:rounded-lg">
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-2.5 py-1.5 sm:px-3 sm:py-2">
                <span className="h-2 w-2 rounded-full bg-red-500/60 sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-yellow-500/60 sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-green-500/60 sm:h-2.5 sm:w-2.5" />
                <span className="ml-1.5 truncate font-mono text-[9px] tracking-wider text-gray-500 uppercase sm:ml-2 sm:text-[10px]">
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
          </div>

          {/* Bisagra — mismo plano Z que lid/base para que no “flote” */}
          <div
            className="relative z-10 -mb-px h-2 bg-[#2a2a2e] sm:h-2.5"
            aria-hidden
          >
            <div className="absolute inset-x-0 top-0 h-px bg-white/12" />
            <div className="absolute inset-x-[12%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-linear-to-b from-zinc-500/80 to-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] sm:h-1" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-black/50" />
          </div>

          {/* Base + teclado — mismo ancho que lid; +translateX compensa el
              desfase lateral que produce rotateX bajo la escena en rotateY */}
          <div className="relative z-0 h-8 -translate-y-px transform-3d sm:h-9 lg:h-10">
            <div
              className="absolute inset-x-0 top-0 origin-top rounded-b-xl border border-t-0 border-violet-500/15 px-2.5 pt-1.5 pb-2 sm:rounded-b-2xl sm:px-3.5 sm:pt-2 sm:pb-2.5"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, #2a2a2e 0%, #1a1a1d 40%, #121214 100%)',
                boxShadow:
                  '0 20px 40px -18px rgba(0,0,0,0.7), 0 0 40px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.07)',
                transform: 'rotateX(52deg) translateX(1.5px)',
              }}
            >
              <LaptopKeyboard />
              <div
                className="mx-auto mt-1 h-4 w-[28%] rounded-md border border-white/5 bg-zinc-900/80 sm:mt-1.5 sm:h-6 sm:rounded-lg"
                aria-hidden
                style={{
                  boxShadow:
                    'inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 2px 4px rgba(0,0,0,0.35)',
                }}
              />
              <div
                className="mx-auto mt-1.5 h-1 w-[44%] rounded-full bg-linear-to-b from-zinc-600 to-zinc-950 sm:mt-2 sm:h-1.5"
                aria-hidden
              />
            </div>
          </div>
        </div>

        {/* Phone — a la derecha, bisel visible, poco overlap con la laptop */}
        {SHOW_PHONE ? (
        <motion.div
          style={reduceMotion ? undefined : { x: phoneX, y: phoneY }}
          className="absolute -right-6 bottom-[18%] z-20 w-24 transform-3d sm:-right-8 sm:bottom-[20%] sm:w-30 lg:-right-12 lg:bottom-[22%] lg:w-40"
        >
          <div
            className="relative transform-3d"
            style={{
              // Solo Z: el rotateY lo aporta la escena (mismo eje vertical que la laptop)
              transform: 'translateZ(72px)',
            }}
          >
            {/* Chassis + bisel — el canto se sugiere con borde/sombra, no cara plana */}
            <div
              className="relative rounded-[1.35rem] border border-violet-400/35 bg-linear-to-b from-zinc-700 via-zinc-900 to-zinc-950 p-[5px] sm:rounded-[1.5rem] sm:p-1.5"
              style={{
                boxShadow:
                  '0 24px 48px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(167,139,250,0.18), 0 0 40px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.12), -3px 0 0 #1a1a1d, -5px 1px 0 #0c0c0e, -6px 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              {/* Dynamic Island / notch */}
              <div
                className="pointer-events-none absolute top-2.5 left-1/2 z-10 h-2.5 w-12 -translate-x-1/2 rounded-full bg-black sm:top-3 sm:h-3 sm:w-14"
                aria-hidden
                style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
              />

              {/* Pantalla inset (el padding del chassis = bisel) */}
              <div className="relative aspect-9/19.5 w-full overflow-hidden rounded-[1.05rem] border border-black/70 bg-black sm:rounded-[1.15rem]">
                <AnimatePresence>
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
                      sizes="180px"
                      priority={frame === 0}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Barra home */}
              <div
                className="pointer-events-none mx-auto mt-1 h-0.5 w-8 rounded-full bg-white/25 sm:mt-1.5 sm:h-1 sm:w-10"
                aria-hidden
              />
            </div>
          </div>
        </motion.div>
        ) : null}
      </motion.div>
    </div>
  )
}
