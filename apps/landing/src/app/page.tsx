import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import TrustBanner from '@/components/sections/TrustBanner'
import Verticals from '@/components/sections/Verticals'
import Features from '@/components/sections/Features'
import Integrations from '@/components/sections/Integrations'
import Cotizador from '@/components/sections/Cotizador'
import ContactForm from '@/components/sections/ContactForm'
import FAQ from '@/components/sections/FAQ'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustBanner />
      <Verticals />
      <Features />
      <Integrations />
      <Cotizador />
      <ContactForm />
      <FAQ />
      <Footer />
    </main>
  )
}
