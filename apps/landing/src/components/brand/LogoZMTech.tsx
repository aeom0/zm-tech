import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoZMTechProps {
  className?: string
  priority?: boolean
  href?: string
  ariaLabel?: string
}

export default function LogoZMTech({
  className,
  priority,
  href = '/',
  ariaLabel = 'Ir al inicio',
}: LogoZMTechProps) {
  const logo = (
    <span className={cn('relative inline-flex', className)} aria-label="ZM Tech">
      <Image
        src="/logo/Logo_ZMTech_light.svg"
        alt="ZM Tech"
        width={300}
        height={80}
        priority={priority}
        className="block h-auto w-36 dark:hidden"
      />
      <Image
        src="/logo/Logo_ZMTech_dark.svg"
        alt="ZM Tech"
        width={300}
        height={80}
        priority={priority}
        className="hidden h-auto w-36 dark:block"
      />
    </span>
  )

  return (
    <Link href={href} aria-label={ariaLabel}>
      {logo}
    </Link>
  )
}
