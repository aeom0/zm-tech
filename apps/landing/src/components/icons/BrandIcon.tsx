import type { SimpleIcon } from 'simple-icons'

type Props = {
  icon: SimpleIcon
  className?: string
  /** Si true, usa el hex oficial de la marca; si no, hereda currentColor */
  branded?: boolean
  title?: string
}

/** Ícono de marca desde simple-icons (CC0). */
export function BrandIcon({ icon, className, branded = true, title }: Props) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill={branded ? `#${icon.hex}` : 'currentColor'}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d={icon.path} />
    </svg>
  )
}
