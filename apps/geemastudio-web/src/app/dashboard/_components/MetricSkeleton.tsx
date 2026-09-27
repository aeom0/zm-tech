
interface MetricSkeletonProps {
  variant: 'card' | 'list-item' | 'bar'
  className?: string
}

export function MetricSkeleton({ variant, className = '' }: MetricSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={`space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-10 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-3 w-full max-w-[160px] animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    )
  }

  if (variant === 'list-item') {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/5 max-w-[140px] animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-2 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-white/10" />
      </div>
    )
  }

  return (
    <div
      className={`h-3 w-full overflow-hidden rounded-full ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="h-full w-1/3 animate-pulse"
        style={{ background: 'var(--tenant-primary)', opacity: 0.35 }}
      />
    </div>
  )
}
