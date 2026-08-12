import { MercadoLibreLogo } from "@/components/brand/MercadoLibreLogo";

export function PhoneSection() {
  return (
    <section className="l-phone-section l-reveal">
      {/* Fondo decorativo */}
      <div className="l-phone-bg-glow" />

      <div className="l-phone-inner">
        {/* Columna izquierda: mockup del teléfono */}
        <div className="l-phone-device-col">
          <div className="l-phone-device">
            {/* Notch / cámara */}
            <div className="l-phone-notch">
              <div className="l-phone-camera" />
            </div>

            {/* Pantalla */}
            <div className="l-phone-screen">
              {/* Status bar */}
              <div className="l-phone-statusbar">
                <span>9:41</span>
                <div className="l-phone-statusbar-icons">
                  <span>▲▲▲</span>
                  <span>WiFi</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* Header de la app */}
              <div className="l-phone-app-header">
                <div>
                  <div className="l-phone-app-store-name">Repuestos Méndez</div>
                  <div className="l-phone-app-greeting">Buenos días, Carlos 👋</div>
                </div>
                <div className="l-phone-app-avatar">CM</div>
              </div>

              {/* KPI Cards */}
              <div className="l-phone-kpi-row">
                <div className="l-phone-kpi-card kpi-highlight">
                  <div className="l-phone-kpi-label">Ventas hoy</div>
                  <div className="l-phone-kpi-value">$847</div>
                  <div className="l-phone-kpi-sub">↑ +12% vs ayer</div>
                </div>
                <div className="l-phone-kpi-card">
                  <div className="l-phone-kpi-label">Caja abierta</div>
                  <div className="l-phone-kpi-value">6h 23m</div>
                  <div className="l-phone-kpi-sub">Desde 8:00 AM</div>
                </div>
              </div>

              {/* Sección POS rápido */}
              <div className="l-phone-section-title">Acceso rápido</div>
              <div className="l-phone-quick-actions">
                <div className="l-phone-action-btn action-primary">
                  <span>🛒</span>
                  <span>Nueva venta</span>
                </div>
                <div className="l-phone-action-btn">
                  <span>📦</span>
                  <span>Inventario</span>
                </div>
                <div className="l-phone-action-btn">
                  <span>👥</span>
                  <span>Clientes</span>
                </div>
                <div className="l-phone-action-btn">
                  <span>📊</span>
                  <span>Reportes</span>
                </div>
              </div>

              {/* Últimas ventas */}
              <div className="l-phone-section-title">Últimas ventas</div>
              <div className="l-phone-sale-row">
                <div className="l-phone-sale-icon">🔩</div>
                <div className="l-phone-sale-info">
                  <div className="l-phone-sale-name">Filtro aceite Corolla</div>
                  <div className="l-phone-sale-meta">Hace 12 min · Efectivo USD</div>
                </div>
                <div className="l-phone-sale-amount">$12.00</div>
              </div>
              <div className="l-phone-sale-row">
                <div className="l-phone-sale-icon">⚙️</div>
                <div className="l-phone-sale-info">
                  <div className="l-phone-sale-name">Pastilla freno Aveo</div>
                  <div className="l-phone-sale-meta">Hace 34 min · Zelle</div>
                </div>
                <div className="l-phone-sale-amount">$28.50</div>
              </div>
              <div className="l-phone-sale-row">
                <div className="l-phone-sale-icon l-phone-sale-icon-ml">
                  <MercadoLibreLogo size={18} />
                </div>
                <div className="l-phone-sale-info">
                  <div className="l-phone-sale-name">Bujía NGK BKR6E (x4)</div>
                  <div className="l-phone-sale-meta">Hace 1h · MercadoLibre</div>
                </div>
                <div className="l-phone-sale-amount">$32.00</div>
              </div>
            </div>

            {/* Botón home */}
            <div className="l-phone-home-bar" />
          </div>

          {/* Reflejo / sombra del teléfono */}
          <div className="l-phone-shadow" />
        </div>

        {/* Columna derecha: beneficios */}
        <div className="l-phone-benefits-col">
          <div className="l-section-label">APP MÓVIL</div>
          <h2 className="l-section-title">
            Tu negocio en el<br />
            <span style={{ color: "var(--orange)" }}>bolsillo</span>
          </h2>
          <p className="l-phone-desc">
            Gestiona ventas, inventario y caja desde tu teléfono. Sin laptop, sin papeles,
            sin excusas. RepMAX corre en Android y iPhone, sin conexión a internet cuando la necesitas.
          </p>

          <div className="l-phone-benefits">
            <div className="l-phone-benefit">
              <div className="l-phone-benefit-icon">⚡</div>
              <div className="l-phone-benefit-text">
                <strong>POS ultrarrápido</strong>
                Registra una venta en menos de 10 segundos. Busca por nombre, código o vehículo compatible.
              </div>
            </div>
            <div className="l-phone-benefit">
              <div className="l-phone-benefit-icon">📶</div>
              <div className="l-phone-benefit-text">
                <strong>Funciona sin internet</strong>
                Las ventas se guardan localmente y sincronizan cuando recuperas señal. Sin interrupciones.
              </div>
            </div>
            <div className="l-phone-benefit">
              <div className="l-phone-benefit-icon">🔔</div>
              <div className="l-phone-benefit-text">
                <strong>Alertas de stock bajo</strong>
                Notificación inmediata cuando una pieza llega a su mínimo. Nunca más pierdas una venta por falta de inventario.
              </div>
            </div>
            <div className="l-phone-benefit">
              <div className="l-phone-benefit-icon">💰</div>
              <div className="l-phone-benefit-text">
                <strong>Caja dual USD/Bs en tiempo real</strong>
                La tasa del día siempre visible. Cobra en cualquier moneda y el sistema convierte automáticamente.
              </div>
            </div>
            <div className="l-phone-benefit">
              <div className="l-phone-benefit-icon">📲</div>
              <div className="l-phone-benefit-text">
                <strong>Disponible en Android e iOS</strong>
                Un mismo equipo, varios teléfonos. Cada vendedor con su cuenta, todo bajo tu control.
              </div>
            </div>
          </div>

          {/* Badges de plataforma */}
          <div className="l-phone-platform-badges">
            <div className="l-phone-platform-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-2)" }}>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.33.74 3.14.8 1.16-.21 2.28-.9 3.54-.77 1.5.17 2.63.82 3.35 2.07-3.28 2.17-2.66 6.52.99 7.86-.74 1.97-1.71 3.89-3.02 4.92zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>iOS</span>
            </div>
            <div className="l-phone-platform-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-2)" }}>
                <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.44-.66-3.05-1.03-4.77-1.03-1.72 0-3.33.37-4.77 1.03L4.85 5.67c-.19-.29-.54-.37-.83-.22-.29.15-.42.54-.26.85L5.6 9.48C3.3 11.25 1.77 14.06 1.77 17.18h20.46c0-3.12-1.53-5.93-4.63-7.7zM7.5 15.18c-.69 0-1.25-.56-1.25-1.25S6.81 12.68 7.5 12.68s1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm9 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
              </svg>
              <span>Android</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
