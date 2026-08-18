import { Star } from 'lucide-react'

interface ReviewStarsProps {
  color: string
  className?: string
}

export function ReviewStars({ color, className }: ReviewStarsProps) {
  return (
    <div className={`mb-2 flex gap-0.5 ${className ?? ''}`} style={{ color }} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  )
}
