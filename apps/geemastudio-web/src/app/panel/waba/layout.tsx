'use client'

import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { WabaNav } from './_components/WabaNav'

function WabaNavWrapper() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasSelectedPhone = pathname === '/panel/waba/mensajes' && Boolean(searchParams.get('phone'))

  return (
    <div className={hasSelectedPhone ? 'hidden md:block' : 'block'}>
      <WabaNav />
    </div>
  )
}

export default function WabaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
      <Suspense fallback={null}>
        <WabaNavWrapper />
      </Suspense>
      {children}
    </div>
  )
}
