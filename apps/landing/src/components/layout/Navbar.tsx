'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import LogoZMTech from '@/components/brand/LogoZMTech'

const navLinks = [
  { label: 'VERTICALES', href: '#verticales' },
  { label: 'VENTAJAS', href: '#ventajas' },
  { label: 'INTEGRACIONES', href: '#integraciones' },
  { label: 'COTIZADOR', href: '#cotizador' },
  { label: 'PROTOCOLOS FRECUENTES', href: '#faq' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLinkClick = (href: string) => {
    setMobileOpen(false)
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-white/10 bg-black/60 backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <LogoZMTech priority className="items-center" />

          {/* Links desktop */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleLinkClick(link.href)}
                className="font-mono text-xs tracking-widest text-white/60 uppercase transition-colors duration-200 hover:text-violet-400"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleLinkClick('#contacto')}
              className="hidden rounded bg-violet-600 px-5 py-2 font-mono text-xs tracking-wider text-white uppercase transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] md:inline-flex"
            >
              Habla con nosotros
            </button>
            <button
              className="text-white/70 transition-colors hover:text-white md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Abrir menú"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/10 bg-black/90 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-4 px-6 py-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleLinkClick(link.href)}
                  className="py-1 text-left font-mono text-xs tracking-widest text-white/60 uppercase transition-colors hover:text-violet-400"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => handleLinkClick('#contacto')}
                className="mt-2 rounded bg-violet-600 px-5 py-3 text-center font-mono text-xs tracking-wider text-white uppercase transition-all hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]"
              >
                Habla con nosotros
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
