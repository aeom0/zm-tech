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
    title: `${messages.privacy.title} — ZM Tech`,
    description: messages.privacy.metaDescription,
    alternates: {
      canonical: `${site}/${locale}/privacidad`,
      languages: {
        es: `${site}/es/privacidad`,
        en: `${site}/en/privacidad`,
        'x-default': `${site}/es/privacidad`,
      },
    },
  }
}

export default async function PrivacidadPage({ params }: Props) {
  const { locale: raw } = await params
  if (!isLocale(raw)) notFound()
  const locale = raw as Locale
  const messages = getMessages(locale)

  return (
    <LegalDocument
      locale={locale}
      path="privacidad"
      privacyLabel={messages.footer.privacy}
      termsLabel={messages.footer.terms}
      document={messages.privacy}
    />
  )
}
