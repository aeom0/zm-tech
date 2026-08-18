import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={textareaId} className="text-muted text-xs font-medium">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        rows={3}
        className={cn(
          'border-border bg-surface text-foreground placeholder:text-muted/60 focus:border-accent/60 focus:ring-accent/30 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50',
          error && 'border-danger/60',
          className
        )}
        {...props}
      />
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  )
}
