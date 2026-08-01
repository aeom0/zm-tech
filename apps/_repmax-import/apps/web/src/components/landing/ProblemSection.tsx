interface ProblemCardProps {
  emoji: string;
  title: string;
  desc: string;
}

function ProblemCard({ emoji, title, desc }: ProblemCardProps) {
  return (
    <div className="l-problem-card">
      <span className="l-problem-emoji">{emoji}</span>
      <div className="l-problem-title">{title}</div>
      <p className="l-problem-desc">{desc}</p>
    </div>
  );
}

const problemas: ProblemCardProps[] = [
  {
    emoji: "📒",
    title: "Inventario en papel o en tu cabeza",
    desc: "¿Cuántas juntas tóricas te quedan? ¿Ese filtro de aceite llegó? Si no tienes el cuaderno, no sabes nada.",
  },
  {
    emoji: "🧮",
    title: "Calculadora pa' todo",
    desc: "Convertir USD a Bs con cada venta, calcular el cambio, llevar el conteo del día — es un martirio diario.",
  },
  {
    emoji: "📱",
    title: "WhatsApp como punto de venta",
    desc: "Los pedidos llegan por mensajes, no tienes historial de clientes y siempre hay confusiones con los precios.",
  },
  {
    emoji: "😤",
    title: "MercadoLibre actualizado a mano",
    desc: "Vendiste el último en tienda y tu publicación sigue activa. El cliente llega molesto. Tú también.",
  },
];

export function ProblemSection() {
  return (
    <section className="l-problem-section l-reveal">
      <div className="l-section-inner">
        <p className="l-section-label">¿Te suena familiar?</p>
        <h2 className="l-section-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(36px,5vw,56px)", lineHeight: 1 }}>
          El problema de manejar una<br />tienda de autopartes sin sistema
        </h2>

        <div className="l-problem-grid">
          {problemas.map((p) => (
            <ProblemCard key={p.title} {...p} />
          ))}
        </div>

        <div className="l-problem-arrow">↓</div>
        <div className="l-problem-cta">
          <p className="l-problem-cta-text">
            RepMAX resuelve todo eso desde el celular
          </p>
        </div>
      </div>
    </section>
  );
}
