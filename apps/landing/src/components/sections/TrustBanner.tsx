'use client'

import { Shield } from 'lucide-react'

export default function TrustBanner() {
  return (
    <div className="border-y border-violet-500/20 bg-violet-950/40 py-3 text-center">
      <div className="flex items-center justify-center gap-3 px-4 font-mono text-sm text-violet-300">
        <Shield className="h-4 w-4 shrink-0 text-violet-400" />
        <p>
          Tecnología probada en la industria <strong className="text-white">cosmética</strong> y{' '}
          <strong className="text-white">deportiva</strong> (
          <strong className="text-white">MLB Standards</strong>)
        </p>
      </div>
    </div>
  )
}
