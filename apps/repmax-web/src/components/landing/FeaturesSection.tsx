import { useRef } from "react";

interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  tag: string;
}

function FeatureCard({ icon, title, desc, tag }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.background = `radial-gradient(circle at ${x}% ${y}%, #1a1a1a 0%, #111 60%)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) cardRef.current.style.background = "";
  };

  return (
    <div
      ref={cardRef}
      className="l-feature-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="l-feature-icon">{icon}</div>
      <div className="l-feature-title">{title}</div>
      <p className="l-feature-desc">{desc}</p>
      <span className="l-feature-tag">{tag}</span>
    </div>
  );
}

const features: FeatureCardProps[] = [
  {
    icon: "📦",
    title: "Inventario Inteligente",
    desc: "Registra cada pieza con marca, modelo, año y número de parte. Alertas automáticas de stock bajo antes de que se te acabe.",
    tag: "Por vehículo",
  },
  {
    icon: "🏪",
    title: "Punto de Venta (POS)",
    desc: "Busca el repuesto, agrégalo al carrito, cobra. En menos de 30 segundos la venta está registrada y el stock actualizado.",
    tag: "Ultra rápido",
  },
  {
    icon: "💰",
    title: "Caja Dual USD / Bs",
    desc: "Tasa de cambio configurable. Cada venta se registra en USD y Bs automáticamente. Cierre de caja con resumen por método de pago.",
    tag: "Venezolano",
  },
  {
    icon: "👥",
    title: "Clientes y Fiado",
    desc: "Historial completo de cada cliente. Cuánto ha comprado, qué piezas necesita, cédula/RIF para facturación.",
    tag: "Fidelización",
  },
  {
    icon: "📊",
    title: "Dashboard de KPIs",
    desc: "Ventas del día, productos más vendidos, ingresos en USD. Toda la foto de tu negocio al abrir la app en la mañana.",
    tag: "Tiempo real",
  },
  {
    icon: "👤",
    title: "Roles de Equipo",
    desc: "Owner, cajero e inventarista con permisos diferenciados. Tu empleado vende pero no ve los reportes financieros.",
    tag: "Multi-usuario",
  },
];

export function FeaturesSection() {
  return (
    <section className="l-features-section l-reveal" id="features">
      <div className="l-section-header">
        <p className="l-section-label">Lo que incluye</p>
        <h2 className="l-section-title">
          Todo lo que necesita<br />tu negocio
        </h2>
        <p className="l-section-desc">
          Una sola app para manejar tu negocio de autopartes de principio a fin. Sin complicaciones, sin papelería.
        </p>
      </div>

      <div className="l-features-grid">
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}
