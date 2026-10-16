import Link from 'next/link'
import Image from 'next/image'

import {
  LEGAL_PRIVACY_LABEL,
  LEGAL_TERMS_LABEL,
  type LegalPage,
} from '@/content/legal'
import { LUNARIS } from '@/lib/theme'

type Props = {
  path: 'privacidad' | 'terminos'
  document: LegalPage
}

export function LegalDocument({ path, document }: Props) {
  return (
    <main className="min-h-screen bg-[#0D0D12] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={document.backHome}>
            <Image
              src="/logo-diamondSparkle.svg"
              alt=""
              width={36}
              height={40}
              className="h-9 w-auto"
              priority
            />
            <span className="text-lg font-bold tracking-tight">
              Geema
              <span
                style={{
                  background: LUNARIS.gradient.css90,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Studio
              </span>
            </span>
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p
          className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]"
          style={{ color: LUNARIS.primary }}
        >
          {document.lastUpdated}
        </p>
        <h1 className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl">{document.title}</h1>

        <div className="space-y-10">
          {document.sections.map((section) => (
            <section key={section.heading} id={section.id}>
              <h2 className="mb-3 text-lg font-semibold text-white">{section.heading}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-400">
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 64)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm">
          <Link href="/" className="text-[#40E0D0] transition-colors hover:text-[#2fc9b9]">
            ← {document.backHome}
          </Link>
          <Link
            href="/privacidad"
            className={`transition-colors hover:text-white ${
              path === 'privacidad' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            {LEGAL_PRIVACY_LABEL}
          </Link>
          <Link
            href="/terminos"
            className={`transition-colors hover:text-white ${
              path === 'terminos' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            {LEGAL_TERMS_LABEL}
          </Link>
        </div>
      </article>
    </main>
  )
}
