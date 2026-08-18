import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={selectId} className="text-muted text-xs font-medium">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cn(
          'border-border bg-surface text-foreground focus:border-accent/60 focus:ring-accent/30 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50',
          error && 'border-danger/60',
          className
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  )
}
