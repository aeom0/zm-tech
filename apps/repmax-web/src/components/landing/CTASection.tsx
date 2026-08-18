import { useState } from 'react'

export function CTASection() {
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="l-cta-section" id="registro">
      <div className="l-cta-glow" />
      <h2 className="l-cta-title">
        Tu tienda merece
        <br />
        <span className="line-orange">un sistema de verdad</span>
      </h2>
      <p className="l-cta-sub">
        Regístrate gratis en 2 minutos. Sin tarjeta de crédito. Sin complicaciones.
      </p>

      <form className="l-cta-form" onSubmit={handleSubmit}>
        <input
          type="email"
          className="l-cta-input"
          placeholder="tucorreo@gmail.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitted}
        />
        <button
          type="submit"
          className="l-btn-primary"
          style={submitted ? { background: '#4CAF50', clipPath: 'none' } : {}}
        >
          {submitted ? '¡Listo! Te contactamos pronto 🎉' : 'Crear mi cuenta gratis'}
        </button>
      </form>

      <p className="l-cta-note">
        <span className="check">✓</span> Gratis para siempre en el plan básico &nbsp;·&nbsp;
        <span className="check">✓</span> Sin compromiso &nbsp;·&nbsp;
        <span className="check">✓</span> Soporte en español
      </p>
    </section>
  )
}
