import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('border-border bg-surface rounded-xl border', className)}>{children}</div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'border-border flex items-center justify-between border-b px-5 py-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('p-5', className)}>{children}</div>
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h2 className={cn('font-display text-foreground text-base font-semibold', className)}>
      {children}
    </h2>
  )
}
