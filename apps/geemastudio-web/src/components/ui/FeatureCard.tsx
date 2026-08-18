import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: string
  title: string
  description: string
  index: number
}

export function FeatureCard({ icon, title, description, index }: Props) {
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[icon]

  return (
    <div
      className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
        {IconComponent && <IconComponent size={24} strokeWidth={1.75} />}
      </div>
      <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  )
}
