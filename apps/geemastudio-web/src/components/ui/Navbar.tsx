'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { GradientButton } from '@/components/ui/GradientButton'
import { NavbarDashboardLink } from '@/components/ui/NavbarDashboardLink'
import { LUNARIS } from '@/lib/theme'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Funciones', href: '#funciones' },
    { label: 'Demo', href: '#demo' },
    { label: 'Precios', href: '#precios' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-zinc-200 bg-white/90 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo — ícono + wordmark + badge */}
        <a href="#" className="group flex items-center gap-2.5" aria-label="GeemaStudio — inicio">
          <Image
            src="/logo-diamondSparkle.svg"
            alt="GeemaStudio"
            width={44}
            height={50}
            priority
            className="h-11 w-auto shrink-0"
          />
          <span
            className={`text-[19px] font-bold tracking-tight ${
              scrolled ? 'text-zinc-900 dark:text-white' : 'text-white'
            }`}
          >
            Geema
            <span
              style={{
                background: LUNARIS.gradient.css90,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Studio
            </span>
          </span>
          <span
            style={{
              border: `1px solid ${LUNARIS.badge.border}`,
              background: LUNARIS.badge.bg,
              color: LUNARIS.badge.text,
            }}
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
          >
            Beta
          </span>
        </a>

        {/* Links — desktop */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-white ${
                scrolled
                  ? 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {l.label}
            </a>
          ))}
          <NavbarDashboardLink scrolled={scrolled} />
        </nav>

        {/* CTA — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#"
            className={`text-sm font-medium transition-colors ${
              scrolled
                ? 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Iniciar sesión
          </a>
          {/* Divider */}
          <span className="h-5 w-px bg-white/15 dark:bg-white/10" />
          <GradientButton href="#precios" size="sm">
            Empezar gratis
          </GradientButton>
        </div>

        {/* Hamburger — mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 md:hidden"
          aria-label="Menú"
        >
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`block h-0.5 w-6 transition-all duration-300 ${
                  scrolled ? 'bg-zinc-800 dark:bg-zinc-200' : 'bg-white'
                } ${
                  menuOpen && i === 0
                    ? 'translate-y-2 rotate-45'
                    : menuOpen && i === 1
                      ? 'opacity-0'
                      : menuOpen && i === 2
                        ? '-translate-y-2 -rotate-45'
                        : ''
                }`}
              />
            ))}
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="space-y-4 border-t border-zinc-800 bg-zinc-950/95 px-4 py-6 backdrop-blur-md md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 font-medium text-white/90 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <div onClick={() => setMenuOpen(false)} className="py-2">
            <NavbarDashboardLink scrolled={false} />
          </div>
          <div className="pt-2">
            <GradientButton href="#precios" size="md" className="w-full justify-center">
              Empezar gratis — 14 días
            </GradientButton>
          </div>
        </div>
      )}
    </header>
  )
}
