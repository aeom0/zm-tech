/* Logo oficial de MercadoLibre en SVG */
function MLLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MercadoLibre"
    >
      {/* Fondo amarillo redondeado */}
      <rect width="64" height="64" rx="12" fill="#FFE600" />
      {/* Letra M estilizada en azul MercadoLibre */}
      <path
        d="M10 42V24l10 10 10-10v18"
        stroke="#3483FA"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M34 42V24l10 10 10-10v18"
        stroke="#3483FA"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function MLSection() {
  return (
    <section className="l-ml-section l-reveal">
      <div className="l-ml-glow" />
      <div className="l-ml-inner">
        {/* Columna texto */}
        <div>
          <div className="l-ml-logo-badge">
            <MLLogo size={36} />
            <div className="l-ml-badge-text">
              <span className="l-ml-logo">MercadoLibre</span>
              <span className="l-ml-badge-tag">INTEGRACIÓN OFICIAL</span>
            </div>
          </div>
          <h2 className="l-ml-title">
            Tu tienda en RepMAX,<br />
            <span className="highlight">visible en MercadoLibre</span>
          </h2>
          <p className="l-ml-desc">
            Conecta tu cuenta de MercadoLibre una sola vez. Desde ahí, tus productos del inventario
            se publican, actualizan y sincronizan automáticamente. Si vendes en la tienda física,
            el stock baja en ML al instante.
          </p>
          <div className="l-ml-features">
            <div className="l-ml-feature">
              <div className="l-ml-check">🔄</div>
              <div className="l-ml-feature-text">
                <strong>Sincronización de stock en tiempo real</strong>
                Vendiste en mostrador → la publicación de ML se actualiza sola. Sin sorpresas con clientes.
              </div>
            </div>
            <div className="l-ml-feature">
              <div className="l-ml-check">📤</div>
              <div className="l-ml-feature-text">
                <strong>Publicar desde el inventario</strong>
                Selecciona las piezas que quieres vender online y publica en ML con un toque.
                Fotos, precio y descripción incluidos.
              </div>
            </div>
            <div className="l-ml-feature">
              <div className="l-ml-check">📥</div>
              <div className="l-ml-feature-text">
                <strong>Pedidos ML entran al sistema</strong>
                Las ventas de MercadoLibre aparecen en tu historial de RepMAX y descuentan
                el inventario como cualquier venta normal.
              </div>
            </div>
          </div>

          {/* Stat bar de ML */}
          <div className="l-ml-stat-bar">
            <div className="l-ml-stat">
              <div className="l-ml-stat-value">+40%</div>
              <div className="l-ml-stat-label">Ventas online promedio</div>
            </div>
            <div className="l-ml-stat-divider" />
            <div className="l-ml-stat">
              <div className="l-ml-stat-value">0 errores</div>
              <div className="l-ml-stat-label">Stock desincronizado</div>
            </div>
            <div className="l-ml-stat-divider" />
            <div className="l-ml-stat">
              <div className="l-ml-stat-value">1 clic</div>
              <div className="l-ml-stat-label">Para publicar</div>
            </div>
          </div>
        </div>

        {/* Columna visual mockup */}
        <div className="l-ml-visual">
          <div className="l-ml-floating">
            <div className="l-ml-floating-title">Ventas hoy</div>
            <div className="l-ml-floating-value">$847</div>
            <div className="l-ml-floating-sub">+3 vía MercadoLibre</div>
          </div>

          <div className="l-ml-card-main">
            <div className="l-ml-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MLLogo size={24} />
                <span className="l-ml-card-title">Inventario sincronizado</span>
              </div>
              <span className="l-ml-status">● Activo</span>
            </div>

            <div className="l-ml-product-row">
              <div className="l-ml-product-thumb">🔩</div>
              <div className="l-ml-product-info">
                <div className="l-ml-product-name">Filtro aceite Corolla 2015-2020</div>
                <div className="l-ml-product-price">$12.00 · Stock: 8 unid.</div>
              </div>
              <span className="l-ml-sync-badge">ML ✓</span>
            </div>
            <div className="l-ml-product-row">
              <div className="l-ml-product-thumb">⚙️</div>
              <div className="l-ml-product-info">
                <div className="l-ml-product-name">Pastilla freno delantera Aveo</div>
                <div className="l-ml-product-price">$28.50 · Stock: 4 unid.</div>
              </div>
              <span className="l-ml-sync-badge">ML ✓</span>
            </div>
            <div className="l-ml-product-row">
              <div className="l-ml-product-thumb">🔧</div>
              <div className="l-ml-product-info">
                <div className="l-ml-product-name">Bujía NGK Platino BKR6E</div>
                <div className="l-ml-product-price">$8.00 · Stock: 24 unid.</div>
              </div>
              <span className="l-ml-sync-badge pending">Pendiente</span>
            </div>

            {/* Footer del card con logo ML */}
            <div className="l-ml-card-footer">
              <MLLogo size={16} />
              <span>Sincronizado con MercadoLibre Venezuela</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
