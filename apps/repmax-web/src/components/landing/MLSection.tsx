import { MercadoLibreLogo } from '@/components/brand/MercadoLibreLogo'
import { ML_API_ENABLED } from '@/constants/mlConfig'

export function MLSection() {
  return (
    <section className="l-ml-section l-reveal">
      <div className="l-ml-glow" />
      <div className="l-ml-inner">
        <div>
          <div className="l-ml-logo-badge">
            <MercadoLibreLogo size={36} />
            <div className="l-ml-badge-text">
              <span className="l-ml-logo">MercadoLibre</span>
              <span className="l-ml-badge-tag">
                {ML_API_ENABLED ? 'INTEGRACIÓN OFICIAL' : 'CATÁLOGO ML-READY'}
              </span>
            </div>
          </div>
          <h2 className="l-ml-title">
            Tu inventario listo pa&apos; MercadoLibre,
            <br />
            <span className="highlight">
              {ML_API_ENABLED ? 'visible y sincronizado' : 'sin depender de la API hoy'}
            </span>
          </h2>
          <p className="l-ml-desc">
            {ML_API_ENABLED
              ? 'Conecta tu cuenta de MercadoLibre una sola vez. Tus productos se publican y el stock baja al instante cuando vendes en mostrador.'
              : 'Prepara fotos, ficha y categoría en RepMAX. Exporta un CSV con URLs de fotos y súbelo al publicador masivo de ML. MercadoLibre Venezuela no tiene API de desarrolladores activa — el control del catálogo queda en tus manos.'}
          </p>
          <div className="l-ml-features">
            <div className="l-ml-feature">
              <div className="l-ml-check">01</div>
              <div className="l-ml-feature-text">
                <strong>Checklist ML en cada pieza</strong>
                Portada, n. parte, título y descripción sin teléfono — lo que ML exige antes de
                publicar.
              </div>
            </div>
            <div className="l-ml-feature">
              <div className="l-ml-check">02</div>
              <div className="l-ml-feature-text">
                <strong>Export al publicador masivo</strong>
                CSV con categoría, atributos y links de fotos listos para copiar en tu cuenta ML.
              </div>
            </div>
            <div className="l-ml-feature">
              <div className="l-ml-check">03</div>
              <div className="l-ml-feature-text">
                <strong>
                  {ML_API_ENABLED
                    ? 'Stock sincronizado al vender'
                    : 'Alerta tras vender en mostrador'}
                </strong>
                {ML_API_ENABLED
                  ? 'Vendiste en la tienda → la publicación de ML se actualiza sola.'
                  : 'Si la pieza está en ML manual, el recibo te avisa que revises el stock allá.'}
              </div>
            </div>
          </div>

          <div className="l-ml-stat-bar">
            <div className="l-ml-stat">
              <div className="l-ml-stat-value">6</div>
              <div className="l-ml-stat-label">Fotos ML-ready por pieza</div>
            </div>
            <div className="l-ml-stat-divider" />
            <div className="l-ml-stat">
              <div className="l-ml-stat-value">CSV</div>
              <div className="l-ml-stat-label">Export listo pa&apos; ML</div>
            </div>
            <div className="l-ml-stat-divider" />
            <div className="l-ml-stat">
              <div className="l-ml-stat-value">{ML_API_ENABLED ? 'Sync' : 'Manual'}</div>
              <div className="l-ml-stat-label">
                {ML_API_ENABLED ? 'Stock en tiempo real' : 'Control total hoy'}
              </div>
            </div>
          </div>
        </div>

        <div className="l-ml-visual">
          <div className="l-ml-floating">
            <div className="l-ml-floating-title">Ventas hoy</div>
            <div className="l-ml-floating-value">$847</div>
            <div className="l-ml-floating-sub">Mostrador + vitrina web</div>
          </div>

          <div className="l-ml-card-main">
            <div className="l-ml-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MercadoLibreLogo size={24} />
                <span className="l-ml-card-title">
                  {ML_API_ENABLED ? 'Inventario sincronizado' : 'Catálogo ML-ready'}
                </span>
              </div>
              <span className="l-ml-status">{ML_API_ENABLED ? '● Activo' : '● Export manual'}</span>
            </div>

            <div className="l-ml-product-row">
              <div className="l-ml-product-thumb">FA</div>
              <div className="l-ml-product-info">
                <div className="l-ml-product-name">Filtro aceite Corolla 2015-2020</div>
                <div className="l-ml-product-price">$12.00 · Stock: 8 unid.</div>
              </div>
              <span className="l-ml-sync-badge">Listo</span>
            </div>
            <div className="l-ml-product-row">
              <div className="l-ml-product-thumb">PF</div>
              <div className="l-ml-product-info">
                <div className="l-ml-product-name">Pastilla freno delantera Aveo</div>
                <div className="l-ml-product-price">$28.50 · Stock: 4 unid.</div>
              </div>
              <span className="l-ml-sync-badge">Exportado</span>
            </div>
            <div className="l-ml-product-row">
              <div className="l-ml-product-thumb">BK</div>
              <div className="l-ml-product-info">
                <div className="l-ml-product-name">Bujía NGK Platino BKR6E</div>
                <div className="l-ml-product-price">$8.00 · Stock: 24 unid.</div>
              </div>
              <span className="l-ml-sync-badge pending">En ML manual</span>
            </div>

            <div className="l-ml-card-footer">
              <MercadoLibreLogo size={16} />
              <span>
                {ML_API_ENABLED
                  ? 'Sincronizado con MercadoLibre Venezuela'
                  : 'Preparado para MercadoLibre Venezuela'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
