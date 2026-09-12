'use client'

import { WabaNav } from './_components/WabaNav'

export default function WabaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <WabaNav />
      {children}
    </div>
  )
}
