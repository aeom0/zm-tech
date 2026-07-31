import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMessages, isLocale, locales, type Locale } from '@/content'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  if (!isLocale(raw)) return {}
  const locale = raw as Locale
  const messages = getMessages(locale)
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zmtechdev.com'

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    keywords: messages.metadata.keywords,
    openGraph: {
      title: messages.metadata.title,
      description: messages.metadata.description,
      type: 'website',
      locale: locale === 'es' ? 'es_VE' : 'en_US',
      url: `${site}/${locale}`,
    },
    alternates: {
      canonical: `${site}/${locale}`,
      languages: {
        es: `${site}/es`,
        en: `${site}/en`,
        'x-default': `${site}/es`,
      },
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return children
}
