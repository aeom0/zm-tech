// Composición de 3 dispositivos: Laptop (fondo) + Tablet (medio) + Teléfono (frente)
// Server Component — 100% CSS, sin imágenes externas

/* ── Contenido compartido de la pantalla (Dashboard RepMAX) ─────────────── */

function AppHeader() {
  return (
    <div className="l-dm-app-header">
      <div className="l-dm-app-logo">REP<span>MAX</span></div>
      <div className="l-dm-app-avatar">CM</div>
    </div>
  );
}

function KpiRow({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`l-dm-kpi-row${compact ? " compact" : ""}`}>
      <div className="l-dm-kpi-card hot">
        <div className="l-dm-kpi-label">Ventas hoy</div>
        <div className="l-dm-kpi-value">$847</div>
        <div className="l-dm-kpi-delta">↑ +12%</div>
      </div>
      <div className="l-dm-kpi-card">
        <div className="l-dm-kpi-label">Productos</div>
        <div className="l-dm-kpi-value">238</div>
        <div className="l-dm-kpi-delta muted">en stock</div>
      </div>
      <div className="l-dm-kpi-card">
        <div className="l-dm-kpi-label">Caja</div>
        <div className="l-dm-kpi-value small">6h 23m</div>
        <div className="l-dm-kpi-delta muted">abierta</div>
      </div>
    </div>
  );
}

function SaleRow({
  icon,
  name,
  meta,
  amount,
  mlIcon = false,
}: {
  icon?: string;
  name: string;
  meta: string;
  amount: string;
  mlIcon?: boolean;
}) {
  return (
    <div className="l-dm-sale-row">
      <div className={`l-dm-sale-icon${mlIcon ? " ml" : ""}`}>
        {mlIcon ? "ML" : icon}
      </div>
      <div className="l-dm-sale-info">
        <div className="l-dm-sale-name">{name}</div>
        <div className="l-dm-sale-meta">{meta}</div>
      </div>
      <div className="l-dm-sale-amount">{amount}</div>
    </div>
  );
}

/* ── LAPTOP ──────────────────────────────────────────────────────────────── */
function LaptopMockup() {
  return (
    <div className="l-dm-laptop-wrap">
      {/* Cuerpo de la laptop */}
      <div className="l-dm-laptop-body">
        {/* Barra superior con botones de ventana */}
        <div className="l-dm-laptop-titlebar">
          <div className="l-dm-laptop-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="l-dm-laptop-url">app.repmax.com/dashboard</div>
        </div>

        {/* Pantalla con sidebar + contenido */}
        <div className="l-dm-laptop-screen">
          {/* Sidebar */}
          <div className="l-dm-laptop-sidebar">
            <div className="l-dm-laptop-sidebar-logo">REP<span>MAX</span></div>
            <div className="l-dm-laptop-nav-item active">📊 Dashboard</div>
            <div className="l-dm-laptop-nav-item">🛒 POS</div>
            <div className="l-dm-laptop-nav-item">📦 Inventario</div>
            <div className="l-dm-laptop-nav-item">👥 Clientes</div>
            <div className="l-dm-laptop-nav-item">📈 Reportes</div>
          </div>

          {/* Contenido principal */}
          <div className="l-dm-laptop-main">
            <div className="l-dm-laptop-greeting">Buenos días, Carlos 👋</div>
            <KpiRow />
            <div className="l-dm-section-title">Ventas recientes</div>
            <SaleRow icon="🔩" name="Filtro aceite Corolla" meta="Hace 12 min · Efectivo USD" amount="$12.00" />
            <SaleRow icon="⚙️" name="Pastilla freno Aveo" meta="Hace 34 min · Zelle" amount="$28.50" />
            <SaleRow mlIcon name="Bujía NGK BKR6E ×4" meta="Hace 1h · MercadoLibre" amount="$32.00" />
          </div>
        </div>
      </div>

      {/* Base / teclado */}
      <div className="l-dm-laptop-base">
        <div className="l-dm-laptop-trackpad" />
      </div>
      <div className="l-dm-laptop-foot" />
    </div>
  );
}

/* ── TABLET ──────────────────────────────────────────────────────────────── */
function TabletMockup() {
  return (
    <div className="l-dm-tablet-wrap">
      <div className="l-dm-tablet">
        {/* Cámara frontal */}
        <div className="l-dm-tablet-camera" />

        {/* Pantalla */}
        <div className="l-dm-tablet-screen">
          <AppHeader />
          <div className="l-dm-greeting">Buenos días, Carlos 👋</div>
          <KpiRow compact />
          <div className="l-dm-section-title">Últimas ventas</div>
          <SaleRow icon="🔩" name="Filtro aceite Corolla" meta="Hace 12 min" amount="$12.00" />
          <SaleRow icon="⚙️" name="Pastilla freno Aveo" meta="Hace 34 min" amount="$28.50" />
          <SaleRow mlIcon name="Bujía NGK BKR6E ×4" meta="Hace 1h · ML" amount="$32.00" />
        </div>

        {/* Botón home */}
        <div className="l-dm-tablet-home" />
      </div>
    </div>
  );
}

/* ── TELÉFONO ────────────────────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="l-dm-phone-wrap">
      <div className="l-dm-phone">
        {/* Notch */}
        <div className="l-dm-phone-notch" />

        {/* Pantalla */}
        <div className="l-dm-phone-screen">
          {/* Status bar */}
          <div className="l-dm-statusbar">
            <span>9:41</span>
            <div className="l-dm-statusbar-r">
              <span>▲▲▲</span><span>WiFi</span><span>🔋</span>
            </div>
          </div>

          <AppHeader />
          <div className="l-dm-greeting">Buenos días 👋</div>

          {/* KPI row compacta */}
          <div className="l-dm-kpi-row compact">
            <div className="l-dm-kpi-card hot">
              <div className="l-dm-kpi-label">Ventas</div>
              <div className="l-dm-kpi-value">$847</div>
              <div className="l-dm-kpi-delta">↑ +12%</div>
            </div>
            <div className="l-dm-kpi-card">
              <div className="l-dm-kpi-label">Stock</div>
              <div className="l-dm-kpi-value">238</div>
              <div className="l-dm-kpi-delta muted">items</div>
            </div>
          </div>

          <div className="l-dm-section-title">Hoy</div>
          <SaleRow icon="🔩" name="Filtro Corolla" meta="12 min" amount="$12" />
          <SaleRow mlIcon name="Bujía NGK ×4" meta="1h · ML" amount="$32" />

          {/* Nav inferior */}
          <div className="l-dm-phone-nav">
            <span className="active">📊</span>
            <span>🛒</span>
            <span>📦</span>
            <span>👥</span>
          </div>
        </div>

        {/* Barra home */}
        <div className="l-dm-phone-homebar" />
      </div>
    </div>
  );
}

/* ── COMPOSICIÓN FINAL ───────────────────────────────────────────────────── */
export function DeviceMockup() {
  return (
    <div className="l-dm-scene l-reveal">
      {/* Laptop al fondo */}
      <LaptopMockup />
      {/* Tablet en medio */}
      <TabletMockup />
      {/* Teléfono al frente */}
      <PhoneMockup />
      {/* Resplandor ambiental */}
      <div className="l-dm-glow" />
    </div>
  );
}
