type Props = {
  name: string
  role: string
  country: string
  avatar: string
  color: string
  text: string
  stars: number
}

export function TestimonialCard({ name, role, country, avatar, color, text, stars }: Props) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Stars */}
      <div className="mb-4 flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <span key={i} className="text-lg text-accent">
            ★
          </span>
        ))}
      </div>

      {/* Text */}
      <p className="flex-1 text-sm italic leading-relaxed text-zinc-600 dark:text-zinc-400">
        &ldquo;{text}&rdquo;
      </p>

      {/* Author */}
      <div className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name}</p>
          <p className="text-xs text-zinc-500">
            {role} · {country}
          </p>
        </div>
      </div>
    </div>
  )
}
