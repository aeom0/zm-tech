import LandingPage from '@/components/landing/LandingPage'

// La landing es un Server Component que delega a LandingPage (Client Component)
export default function HomePage() {
  return <LandingPage />
}
