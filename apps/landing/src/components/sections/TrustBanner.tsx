'use client'

import { Shield } from 'lucide-react'
import type { TrustMessages } from '@/content/messages'

type Props = { messages: TrustMessages }

export default function TrustBanner({ messages }: Props) {
  return (
    <div className="border-y border-violet-500/20 bg-violet-950/40 py-3 text-center">
      <div className="flex items-center justify-center gap-3 px-4 font-mono text-sm text-violet-300">
        <Shield className="h-4 w-4 shrink-0 text-violet-400" />
        <p>
          {messages.before} <strong className="text-white">{messages.cosmetic}</strong>{' '}
          {messages.and} <strong className="text-white">{messages.sports}</strong>{' '}
          {messages.after}
          <strong className="text-white">{messages.mlb}</strong>)
        </p>
      </div>
    </div>
  )
}
