'use client'

import { Bell, Calendar, LayoutGrid, MessageCircle, Plus, Users } from 'lucide-react'

import { onColor, textSafeColor } from '@/lib/tenant-theme'

function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/**
 * Vista previa en vivo: la agenda de Geema en miniatura con los colores elegidos
 * (encabezado, botón, citas y barra inferior), para ver la combinación antes de guardarla.
 */
export function BrandPreview({
  businessName,
  primary,
  accent,
  services,
}: {
  businessName: string
  primary: string
  accent: string
  services: readonly string[]
}) {
  const onPrimary = onColor(primary)
  const primaryText = textSafeColor(primary, 'dark')
  const accentText = textSafeColor(accent, 'dark')
  const initial = businessName.trim().charAt(0).toUpperCase() || 'G'
  const appointments = [
    { time: '10:00', name: 'María G.', service: services[0] ?? 'Servicio', bar: primary, status: 'Confirmada' },
    { time: '11:30', name: 'Carla M.', service: services[1] ?? 'Servicio', bar: accent, status: 'En curso' },
    { time: '15:00', name: 'Ana R.', service: services[2] ?? 'Servicio', bar: primary, status: 'Confirmada' },
  ]

  return (
    <figure className="mx-auto w-full max-w-[260px]" aria-label="Vista previa de tu app con estos colores">
      <div
        className="overflow-hidden rounded-[30px] border border-white/[0.12] bg-[#0F0F0F] p-2 shadow-2xl transition-shadow duration-500"
        style={{ boxShadow: `0 20px 60px ${tint(primary, 0.28)}` }}
      >
        <div className="overflow-hidden rounded-[24px] bg-[#121214]">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300"
              style={{ backgroundColor: primary, color: onPrimary }}
            >
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">{businessName || 'Tu negocio'}</span>
            <Bell className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          </div>

          <div className="space-y-2 px-3 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500">Agenda de hoy</p>
                <p className="text-xs font-bold text-white">3 citas</p>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors duration-300"
                style={{ backgroundColor: primary, color: onPrimary }}
              >
                <Plus className="h-3 w-3" aria-hidden />
                Nueva cita
              </span>
            </div>

            {appointments.map((a) => (
              <div key={a.time} className="flex items-stretch gap-2 rounded-xl bg-white/[0.04] p-2">
                <span className="w-1 rounded-full transition-colors duration-300" style={{ backgroundColor: a.bar }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-500">{a.time}</p>
                  <p className="truncate text-[11px] font-semibold text-white">{a.name}</p>
                  <p className="truncate text-[10px] text-zinc-400">{a.service}</p>
                </div>
                <span
                  className="self-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold transition-colors duration-300"
                  style={{ backgroundColor: tint(accent, 0.16), color: accentText }}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 border-t border-white/[0.06] px-2 py-2">
            {[Calendar, Users, MessageCircle, LayoutGrid].map((Icon, i) => (
              <span key={i} className="flex justify-center">
                <Icon
                  className="h-4 w-4 transition-colors duration-300"
                  style={{ color: i === 0 ? primaryText : '#71717A' }}
                  aria-hidden
                />
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-zinc-500">Así se verá tu app</figcaption>
    </figure>
  )
}
