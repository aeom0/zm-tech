import { DeviceMockup } from "./DeviceMockup";

export function HeroSection() {
  return (
    <section className="l-hero">
      <div className="l-hero-grid-bg" />
      <div className="l-hero-glow" />
      <div className="l-hero-glow-2" />

      {/* Layout 2 columnas en desktop, columna única en mobile */}
      <div className="l-hero-inner">
        {/* Columna izquierda: texto + CTAs */}
        <div className="l-hero-content">
          <div className="l-hero-badge">
            <span className="l-badge-dot" />
            Sistema de gestión para tiendas de autopartes venezolanas
          </div>

          <h1 className="l-hero-title">
            TU TIENDA DE AUTOPARTES
            <span className="line-orange">EN MODO PRO</span>
          </h1>

          <p className="l-hero-subtitle">
            Inventario, POS, clientes y caja desde el celular.<br />
            <strong>Conectado con MercadoLibre.</strong> Acepta Zelle, Pago Móvil,
            USD y Bs — todo en una sola app hecha pa&apos; Venezuela.
          </p>

          <div className="l-hero-actions">
            <a href="#registro" className="l-btn-primary">
              Empieza gratis ahora
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#features" className="l-btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M10 8l6 4-6 4V8z" />
              </svg>
              Ver cómo funciona
            </a>
          </div>

          <div className="l-hero-stats">
            <div className="l-stat-item">
              <span className="l-stat-number">100%</span>
              <span className="l-stat-label">Hecho pa&apos; Venezuela</span>
            </div>
            <div className="l-stat-item">
              <span className="l-stat-number">6</span>
              <span className="l-stat-label">Métodos de pago</span>
            </div>
            <div className="l-stat-item">
              <span className="l-stat-number">0$</span>
              <span className="l-stat-label">Para empezar</span>
            </div>
            <div className="l-stat-item">
              <span className="l-stat-number">ML</span>
              <span className="l-stat-label">Integrado</span>
            </div>
          </div>
        </div>

        {/* Columna derecha: mockup del dispositivo */}
        <div className="l-hero-device-col">
          <DeviceMockup />
        </div>
      </div>
    </section>
  );
}
