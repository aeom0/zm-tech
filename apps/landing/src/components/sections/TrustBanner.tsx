'use client'

import type { TrustMessages } from '@/content/messages'

type Props = { messages: TrustMessages }

export default function TrustBanner({ messages }: Props) {
  return (
    <div className="border-y border-violet-500/20 bg-violet-950/40 py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-center sm:gap-8">
        <p className="shrink-0 font-mono text-xs tracking-widest text-violet-400 uppercase">
          {messages.label}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {messages.brands.map((brand) => (
            <li key={brand} className="text-sm font-medium tracking-wide text-white/90">
              {brand}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
