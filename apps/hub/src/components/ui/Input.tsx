import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={inputId} className="text-muted text-xs font-medium">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'border-border bg-surface text-foreground placeholder:text-muted/60 focus:border-accent/60 focus:ring-accent/30 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50',
          error && 'border-danger/60 focus:border-danger/60 focus:ring-danger/20',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-danger text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
