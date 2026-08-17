import { ML_API_ENABLED } from "@/constants/mlConfig";

interface PlanFeature {
  text: string;
  disabled?: boolean;
  highlight?: boolean;
}

interface PlanProps {
  name: string;
  price: number | string;
  period: string;
  features: PlanFeature[];
  ctaText: string;
  ctaVariant: "primary" | "outline";
  popular?: boolean;
}

function PricingCard({ name, price, period, features, ctaText, ctaVariant, popular }: PlanProps) {
  return (
    <div className={`l-pricing-card${popular ? " popular" : ""}`}>
      {popular && <div className="l-popular-badge">Más popular</div>}
      <div className="l-plan-name">{name}</div>
      <div className="l-plan-price">
        <span className="currency">$</span>
        {price}
        {price !== 0 && <span className="per">/mes</span>}
      </div>
      <div className="l-plan-period">{period}</div>
      <div className="l-plan-divider" />
      <ul className="l-plan-features">
        {features.map((f, i) => (
          <li
            key={i}
            className={`l-plan-feature${f.disabled ? " disabled" : ""}${f.highlight ? " highlight" : ""}`}
          >
            {f.highlight ? <strong style={{ color: "var(--orange)" }}>{f.text} ✦</strong> : f.text}
          </li>
        ))}
      </ul>
      <a href="#registro" className={`l-plan-cta ${ctaVariant}`}>
        {ctaText}
      </a>
    </div>
  );
}

const planes: PlanProps[] = [
  {
    name: "Básico",
    price: 0,
    period: "Para siempre gratis",
    ctaText: "Empezar gratis",
    ctaVariant: "outline",
    features: [
      { text: "Hasta 100 productos" },
      { text: "POS y ventas" },
      { text: "Gestión de caja" },
      { text: "1 usuario cajero" },
      {
        text: ML_API_ENABLED ? "Integración MercadoLibre" : "Catálogo ML-ready + export",
        disabled: true,
      },
      { text: "Reportes avanzados", disabled: true },
      { text: "Múltiples usuarios", disabled: true },
    ],
  },
  {
    name: "Pro",
    price: 19,
    period: "Facturado mensual · Cancela cuando quieras",
    ctaText: "Activar plan Pro",
    ctaVariant: "primary",
    popular: true,
    features: [
      { text: "Productos ilimitados" },
      { text: "POS y ventas" },
      { text: "Gestión de caja" },
      { text: "Hasta 5 usuarios" },
      {
        text: ML_API_ENABLED ? "Integración MercadoLibre" : "Catálogo ML-ready + export",
        highlight: true,
      },
      { text: "Reportes completos" },
      { text: "Soporte prioritario" },
    ],
  },
  {
    name: "Enterprise",
    price: 49,
    period: "Para cadenas de repuestos",
    ctaText: "Contactar ventas",
    ctaVariant: "outline",
    features: [
      { text: "Todo lo del plan Pro" },
      { text: "Múltiples sucursales" },
      { text: "Usuarios ilimitados" },
      { text: "API personalizada" },
      { text: ML_API_ENABLED ? "Integración MercadoLibre" : "Catálogo ML-ready + export" },
      { text: "Onboarding dedicado" },
      { text: "SLA de soporte" },
    ],
  },
];

export function PricingSection() {
  return (
    <section className="l-pricing-section l-reveal" id="precios">
      <div className="l-section-header">
        <p className="l-section-label">Planes</p>
        <h2 className="l-section-title">
          Empieza gratis,<br />crece sin límites
        </h2>
      </div>

      <div className="l-pricing-grid">
        {planes.map((p) => (
          <PricingCard key={p.name} {...p} />
        ))}
      </div>
    </section>
  );
}
