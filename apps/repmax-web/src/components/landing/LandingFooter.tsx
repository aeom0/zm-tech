import { BrandLogo } from '@/components/brand/BrandLogo'

export function LandingFooter() {
  return (
    <footer className="l-footer">
      <div className="l-footer-logo">
        <BrandLogo variant="wordmark" height={22} />
      </div>
      <div className="l-footer-text">© 2026 RepMAX Business Suite · Hecho en Venezuela</div>
    </footer>
  )
}
