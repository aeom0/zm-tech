// apps/web/src/components/ui/GradientButton.tsx
'use client'

import React from 'react'
import { LUNARIS } from '@/lib/theme'

interface GradientButtonProps {
  href: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  outline?: boolean
}

export function GradientButton({
  href,
  children,
  size = 'md',
  className = '',
  outline = false,
}: GradientButtonProps) {
  const sizeClasses = {
    sm: 'px-5 py-2.5 text-sm',
    md: 'px-7 py-3.5 text-base',
    lg: 'px-10 py-5 text-lg',
  }

  if (outline) {
    return (
      <a
        href={href}
        className={`inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 font-semibold text-white transition-all duration-300 hover:bg-white/10 ${sizeClasses[size]} ${className}`}
      >
        {children}
      </a>
    )
  }

  return (
    <a
      href={href}
      style={{
        background: LUNARIS.gradient.css,
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold text-white transition-all duration-300 hover:scale-105 hover:opacity-90 hover:shadow-xl ${sizeClasses[size]} ${className}`}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.boxShadow =
          `0 8px 30px ${LUNARIS.gradient.glow}`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'
      }}
    >
      {children}
    </a>
  )
}
