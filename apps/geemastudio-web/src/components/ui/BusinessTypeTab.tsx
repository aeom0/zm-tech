'use client'

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type BusinessType = {
  id: string
  label: string
  icon: string
}

type Props = {
  types: BusinessType[]
  active: string
  onChange: (id: string) => void
}

export function BusinessTypeTab({ types, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {types.map((t) => {
        const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[t.icon]
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
              active === t.id
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {IconComponent && <IconComponent size={15} strokeWidth={2} />}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
