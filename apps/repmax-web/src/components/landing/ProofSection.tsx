interface TestimonioProps {
  quote: string
  name: string
  location: string
  avatar: string
}

function TestimonioCard({ quote, name, location, avatar }: TestimonioProps) {
  return (
    <div className="l-proof-card">
      <div className="l-proof-stars">★★★★★</div>
      <p className="l-proof-quote">{quote}</p>
      <div className="l-proof-author">
        <div className="l-proof-avatar">{avatar}</div>
        <div>
          <div className="l-proof-name">{name}</div>
          <div className="l-proof-location">{location}</div>
        </div>
      </div>
    </div>
  )
}

const testimonios: TestimonioProps[] = [
  {
    quote:
      'Antes tardaba 20 minutos cerrando la caja con la calculadora. Ahora son 2 minutos. El sistema hace la conversión de Bs solo.',
    name: 'Carlos Méndez',
    location: 'Auto Repuestos Méndez · Maracaibo',
    avatar: '🔧',
  },
  {
    quote:
      'Lo que más me gusta es la alerta de stock bajo. Ya no me pasa que el cliente pide una pieza y yo no la tengo sin saber.',
    name: 'María Luisa Pereira',
    location: 'Repuestos El Motor · Valencia',
    avatar: '⚙️',
  },
  {
    quote:
      'El export a ML me ahorró horas de copiar fotos y datos. Cuando llegue la sync automática voy a estar listo porque el catálogo ya está bien armado.',
    name: 'Rafael Torrealba',
    location: 'Moto Repuestos RT · Caracas',
    avatar: '🚗',
  },
]

export function ProofSection() {
  return (
    <section className="l-proof-section l-reveal">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="l-section-header">
          <p className="l-section-label">Testimonios</p>
          <h2
            className="l-section-title"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(36px,5vw,56px)',
              lineHeight: 1,
            }}
          >
            Tiendas de repuestos que ya
            <br />
            dieron el paso
          </h2>
        </div>

        <div className="l-proof-grid">
          {testimonios.map((t) => (
            <TestimonioCard key={t.name} {...t} />
          ))}
        </div>
      </div>
    </section>
  )
}
