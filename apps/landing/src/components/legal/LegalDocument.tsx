import Link from 'next/link'
import LogoZMTech from '@/components/brand/LogoZMTech'
import type { Locale } from '@/content/locales'
import type { LegalPageMessages } from '@/content/messages'
import { locales } from '@/content/locales'

type Props = {
  locale: Locale
  path: 'privacidad' | 'terminos'
  privacyLabel: string
  termsLabel: string
  document: LegalPageMessages
}

export function LegalDocument({ locale, path, privacyLabel, termsLabel, document }: Props) {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <LogoZMTech href={`/${locale}`} ariaLabel={document.backHome} className="items-center" />
          <div className="flex items-center gap-3 font-mono text-xs tracking-widest text-white/50">
            {locales.map((l) => (
              <Link
                key={l}
                href={`/${l}/${path}`}
                hrefLang={l}
                className={`rounded px-1.5 py-0.5 uppercase transition-colors ${
                  l === locale ? 'bg-violet-600/30 text-violet-300' : 'hover:text-white'
                }`}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
          {document.lastUpdated}
        </p>
        <h1 className="mb-10 text-3xl font-black tracking-tight sm:text-4xl">{document.title}</h1>

        <div className="space-y-10">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-lg font-bold text-white">{section.heading}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-gray-400">
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm">
          <Link href={`/${locale}`} className="text-violet-400 transition-colors hover:text-violet-300">
            ← {document.backHome}
          </Link>
          <Link
            href={`/${locale}/privacidad`}
            className={`transition-colors hover:text-white ${
              path === 'privacidad' ? 'text-white' : 'text-gray-500'
            }`}
          >
            {privacyLabel}
          </Link>
          <Link
            href={`/${locale}/terminos`}
            className={`transition-colors hover:text-white ${
              path === 'terminos' ? 'text-white' : 'text-gray-500'
            }`}
          >
            {termsLabel}
          </Link>
        </div>
      </article>
    </main>
  )
}
