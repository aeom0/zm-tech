import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CotizadorInteractivo } from './CotizadorInteractivo'
import { getMessages, isLocale, type Locale } from '@/content'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  if (!isLocale(raw)) return {}
  const locale = raw as Locale
  const messages = getMessages(locale)
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zmtechdev.com'

  return {
    title: messages.metadataCotizador.title,
    description: messages.metadataCotizador.description,
    keywords: messages.metadataCotizador.keywords,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${site}/${locale}/cotizador`,
      languages: {
        es: `${site}/es/cotizador`,
        en: `${site}/en/cotizador`,
        'x-default': `${site}/es/cotizador`,
      },
    },
  }
}

export default async function CotizadorPage({ params }: Props) {
  const { locale: raw } = await params
  if (!isLocale(raw)) notFound()
  const locale = raw as Locale
  const messages = getMessages(locale)

  return (
    <main className="min-h-screen bg-[#f5f5f5] p-4 font-sans text-[#111] antialiased">
      <div className="mx-auto max-w-105 pb-12">
        <header className="px-0 pt-6 pb-4 text-center">
          <Link href={`/${locale}`} className="inline-block rounded-xl bg-[#050505] px-4.5 py-2">
            <span className="text-[15px] font-bold tracking-wider text-[#8b5cf6]">ZM</span>
            <span className="text-[15px] font-bold text-white"> Tech</span>
          </Link>
          <div className="mt-3 flex justify-center gap-2 font-mono text-xs tracking-widest">
            <Link
              href="/es/cotizador"
              className={locale === 'es' ? 'text-[#1a3c5e] underline' : 'text-[#888]'}
              hrefLang="es"
            >
              ES
            </Link>
            <span className="text-[#ccc]">|</span>
            <Link
              href="/en/cotizador"
              className={locale === 'en' ? 'text-[#1a3c5e] underline' : 'text-[#888]'}
              hrefLang="en"
            >
              EN
            </Link>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[#111]">
            {messages.cotizadorPage.heading}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[#666]">
            {messages.cotizadorPage.subheading}
          </p>
        </header>

        <CotizadorInteractivo locale={locale} messages={messages.cotizadorPage} />
      </div>
    </main>
  )
}
