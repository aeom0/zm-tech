import Image from 'next/image'
import { LUNARIS } from '@/lib/theme'
import { getSiteUrl } from '@/lib/site-url'

export default function TenantDomainNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#111318] px-6 py-12 text-center text-[#f0ede8]">
      <Image
        src="/logo-diamondSparkle.svg"
        alt=""
        width={56}
        height={56}
        className="mb-4 opacity-90"
        priority
      />
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Salón no encontrado</h1>
      <p className="mb-7 max-w-sm text-sm text-[rgba(240,237,232,0.55)]">
        Este dominio no está activo o el salón aún no ha publicado su página web.
      </p>
      <a
        href={getSiteUrl()}
        className="rounded-full px-7 py-3 text-sm font-semibold text-white no-underline"
        style={{ background: LUNARIS.gradient.css }}
      >
        Conocer GeemaStudio
      </a>
    </div>
  )
}
