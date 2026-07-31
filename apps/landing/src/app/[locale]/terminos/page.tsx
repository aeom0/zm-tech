import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalDocument } from '@/components/legal/LegalDocument'
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
    title: `${messages.terms.title} — ZM Tech`,
    description: messages.terms.metaDescription,
    alternates: {
      canonical: `${site}/${locale}/terminos`,
      languages: {
        es: `${site}/es/terminos`,
        en: `${site}/en/terminos`,
        'x-default': `${site}/es/terminos`,
      },
    },
  }
}

export default async function TerminosPage({ params }: Props) {
  const { locale: raw } = await params
  if (!isLocale(raw)) notFound()
  const locale = raw as Locale
  const messages = getMessages(locale)

  return (
    <LegalDocument
      locale={locale}
      path="terminos"
      privacyLabel={messages.footer.privacy}
      termsLabel={messages.footer.terms}
      document={messages.terms}
    />
  )
}
