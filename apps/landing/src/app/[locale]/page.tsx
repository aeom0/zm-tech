import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import TrustBanner from '@/components/sections/TrustBanner'
import Proof from '@/components/sections/Proof'
import Verticals from '@/components/sections/Verticals'
import Features from '@/components/sections/Features'
import Integrations from '@/components/sections/Integrations'
import Cotizador from '@/components/sections/Cotizador'
import ContactForm from '@/components/sections/ContactForm'
import FAQ from '@/components/sections/FAQ'
import { getMessages, isLocale, type Locale } from '@/content'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  const { locale: raw } = await params
  if (!isLocale(raw)) notFound()
  const locale = raw as Locale
  const messages = getMessages(locale)

  return (
    <main>
      <Navbar locale={locale} messages={messages.nav} />
      <Hero messages={messages.hero} />
      <TrustBanner messages={messages.trust} />
      <Proof messages={messages.proof} />
      <Verticals messages={messages.verticals} />
      <Features messages={messages.features} />
      <Integrations messages={messages.integrations} />
      <Cotizador messages={messages.cotizadorHome} locale={locale} />
      <ContactForm messages={messages.contact} />
      <FAQ messages={messages.faq} />
      <Footer locale={locale} messages={messages.footer} />
    </main>
  )
}
