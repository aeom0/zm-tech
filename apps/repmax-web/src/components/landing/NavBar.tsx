'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'

export function NavBar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`l-nav${scrolled ? 'scrolled' : ''}`}>
      <a href="#" className="l-nav-logo" aria-label="RepMAX">
        <BrandLogo variant="wordmark" height={28} priority />
      </a>
      <div className="l-nav-actions">
        <Link href="/login" className="l-nav-login">
          Iniciar sesión
        </Link>
        <a href="#registro" className="l-nav-cta">
          Registrar mi tienda →
        </a>
      </div>
    </nav>
  )
}
