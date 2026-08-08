interface PaymentCardProps {
  icon: string;
  name: string;
  featured?: boolean;
}

function PaymentCard({ icon, name, featured }: PaymentCardProps) {
  return (
    <div className={`l-payment-card${featured ? " featured" : ""}`}>
      <span className="l-payment-icon">{icon}</span>
      <div className="l-payment-name">{name}</div>
    </div>
  );
}

const metodos: PaymentCardProps[] = [
  { icon: "💵", name: "Efectivo USD", featured: true },
  { icon: "💴", name: "Efectivo Bs" },
  { icon: "💜", name: "Zelle", featured: true },
  { icon: "📲", name: "Pago Móvil", featured: true },
  { icon: "🏦", name: "Transferencia" },
  { icon: "🔀", name: "Pago Mixto" },
];

export function PaymentsSection() {
  return (
    <section className="l-payments-section l-reveal">
      <div className="l-payments-inner">
        <p className="l-section-label">Métodos de pago</p>
        <h2 className="l-section-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(36px,5vw,56px)", lineHeight: 1 }}>
          Como se paga en Venezuela,<br />así lo registra RepMAX
        </h2>

        <div className="l-payments-grid">
          {metodos.map((m) => (
            <PaymentCard key={m.name} {...m} />
          ))}
        </div>

        <p className="l-payments-note">
          El pago mixto permite combinar cualquier método en una misma transacción.
          Ideal pa&apos; cuando el cliente tiene parte en USD y parte en Bs.
        </p>
      </div>
    </section>
  );
}
