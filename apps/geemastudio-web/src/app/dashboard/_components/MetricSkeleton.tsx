import { LUNARIS } from '@/lib/theme'

interface MetricSkeletonProps {
  variant: 'card' | 'list-item' | 'bar'
  className?: string
}

export function MetricSkeleton({ variant, className = '' }: MetricSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={`space-y-4 rounded-xl border border-white/10 bg-[#1A1A1A] p-5 ${className}`}>
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-10 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-full max-w-[160px] animate-pulse rounded bg-white/10" />
      </div>
    )
  }

  if (variant === 'list-item') {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/5 max-w-[140px] animate-pulse rounded bg-white/10" />
          <div className="h-2 w-full animate-pulse rounded bg-white/10" />
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
        style={{ background: LUNARIS.gradient.css, opacity: 0.35 }}
      />
    </div>
  )
}
