import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Propuesta — Guataparo Bienes Raíces',
  description: 'Propuesta personalizada de ZM Tech para Guataparo Bienes Raíces.',
  robots: { index: false, follow: false },
}

// Tu número — quien recibe las consultas de Morelba
const WA_ZM = 'https://wa.me/584144940417'

export default function PropuestaGuataparo() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', background: '#f5f5f5', minHeight: '100vh', padding: '1rem' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', paddingBottom: '3rem' }}>

        {/* Header ZM Tech */}
        <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
          <div style={{ display: 'inline-block', background: '#050505', borderRadius: 12, padding: '8px 18px' }}>
            <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 15, letterSpacing: '.05em' }}>ZM</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}> Tech</span>
          </div>
          <p style={{ color: '#888', fontSize: 12, marginTop: 6 }}>Propuesta personalizada · Abril 2026</p>
        </div>

        {/* Intro */}
        <div style={{ background: '#e8f0f7', border: '1px solid #b5cfe4', borderRadius: 12, padding: '1rem 1.1rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#0c447c', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Para Morelba Hernández</p>
          <p style={{ fontSize: 14, color: '#1a3c5e', lineHeight: 1.6 }}>
            Hola <strong>Morelba</strong>, preparamos esta propuesta pensando en lo que necesita <strong>Guataparo Bienes Raíces</strong>: una plataforma propia, sin alquilarle nada a nadie, que trabaje para ti todos los días.
          </p>
          <p style={{ fontSize: 12, color: '#378add', marginTop: 8, fontWeight: 500 }}>— Equipo ZM Tech</p>
        </div>

        {/* Precio base */}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', margin: '1.1rem 0 .5rem' }}>01 · Tu plataforma web completa</p>
        <div style={{ background: '#1a3c5e', borderRadius: 12, padding: '1.25rem', marginBottom: '.5rem' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Inversión inicial</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 600, color: '#fff', lineHeight: 1, marginBottom: 4 }}><sup style={{ fontSize: '1rem', verticalAlign: 'top', marginTop: 8, display: 'inline-block' }}>$</sup>300 <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,.5)', fontWeight: 400 }}>USD</span></p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginBottom: '1rem' }}>Pago único para arrancar. El sitio es tuyo para siempre.</p>
          {[
            'Página web profesional de tu agencia',
            'Catálogo de propiedades con fotos y filtros',
            'Panel privado para tus asesores',
            'Lista para publicar en internet',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#27500a', border: '1px solid #639922', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <svg width="8" height="8" viewBox="0 0 10 8" fill="none"><polyline points="1,4 4,7 9,1" stroke="#97c459" strokeWidth="2.5"/></svg>
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.9)' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Dominio regalo */}
        <div style={{ background: '#faf3e0', border: '1px solid #d4a843', borderRadius: 10, padding: '.875rem 1rem', display: 'flex', gap: 10, marginBottom: '1rem' }}>
          <span style={{ fontSize: 22 }}>🎁</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#633806', marginBottom: 2 }}>Dominio incluido el primer año</p>
            <p style={{ fontSize: 12, color: '#854f0b', lineHeight: 1.5 }}>Tu dirección web propia — guataparobienesraices.com — incluida en este pago. Valor normal: $35 USD.</p>
          </div>
        </div>

        {/* Extras */}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', margin: '1.1rem 0 .5rem' }}>02 · Servicios adicionales</p>
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '.75rem 1rem', marginBottom: '.5rem' }}>
          {[
            { name: 'Traspaso automático desde Wasi', desc: 'Todas tus propiedades pasan al nuevo sitio sin recargar nada a mano.', price: '+$60' },
            { name: 'Botón WhatsApp por propiedad', desc: 'Cada inmueble conecta directo al asesor responsable. El cliente te escribe en un toque.', price: '+$40' },
            { name: 'Visibilidad en Google', desc: 'Configuramos el sitio para aparecer cuando busquen apartamentos en Venezuela. Más visitas sin pagar publicidad.', price: '+$40' },
          ].map((item, i, arr) => (
            <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '.6rem 0', borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 2 }}>{item.name}</p>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>{item.desc}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a3c5e', whiteSpace: 'nowrap' }}>{item.price}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#e8f0f7', border: '1px solid #b5cfe4', borderRadius: 8, padding: '.75rem 1rem', marginBottom: '1rem' }}>
          <span style={{ background: '#1d9e75', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, marginBottom: 6, display: 'inline-block' }}>Paquete completo</span>
          <p style={{ fontSize: 13, color: '#0c447c', lineHeight: 1.5 }}>Los 3 servicios juntos: <strong>$130 USD</strong> en lugar de $140. Ahorro de $10 al cerrar todo desde el inicio.</p>
        </div>

        {/* Soporte mensual */}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', margin: '1.1rem 0 .5rem' }}>03 · Acompañamiento mensual</p>
        <div style={{ background: '#e8f9ef', border: '1px solid #97c459', borderRadius: 12, padding: '1.1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '.75rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 600, color: '#0f6e56' }}>$30</span>
            <span style={{ fontSize: 13, color: '#1d9e75' }}>/ mes</span>
          </div>
          {[
            'Actualizamos precios, fotos y descripciones',
            'Soporte técnico cuando lo necesites',
            'Copias de seguridad automáticas',
            'Una mejora al mes incluida',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
              <span style={{ color: '#1d9e75', fontSize: 11, marginTop: 2 }}>→</span>
              <span style={{ fontSize: 13, color: '#085041' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Comparativa Wasi */}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', margin: '1.1rem 0 .5rem' }}>04 · Lo que cambia para tu agencia</p>
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '.75rem 1rem', marginBottom: '.75rem' }}>
          <p style={{ fontSize: 12, color: '#999', marginBottom: '.5rem' }}>Referencia — Wasi con 4 o más asesores:</p>
          {[
            { label: 'Plan Pro Wasi (base)', val: '$48/mes', red: true },
            { label: 'Cada asesor extra', val: '+$5.50 c/u', red: true },
            { label: 'Con 4 asesores pagas aprox.', val: '~$59/mes', red: true },
            { label: 'Eso al año son', val: '~$700', red: true },
            { label: 'Con ZM Tech pagas al año', val: '~$360', red: false },
            { label: 'El sitio es completamente tuyo', val: '✓', red: false },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.4rem 0', borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <span style={{ fontSize: 12, color: '#555' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: row.red ? '#a32d2d' : '#0f6e56' }}>{row.val}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div style={{ background: '#fef2f2', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, color: '#e24b4a' }}>$700</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Wasi al año</p>
          </div>
          <div style={{ background: '#f0faf4', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1d9e75' }}>$360</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Con nosotros al año</p>
          </div>
        </div>
        <div style={{ background: '#e8f0f7', borderRadius: 10, padding: '.75rem', textAlign: 'center', marginBottom: '1rem' }}>
          <p style={{ fontSize: '1.3rem', fontWeight: 600, color: '#1a3c5e' }}>~10 meses</p>
          <p style={{ fontSize: 11, color: '#666', marginTop: 3 }}>Y ya recuperaste la inversión inicial</p>
        </div>

        {/* Cronograma */}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', margin: '1.1rem 0 .5rem' }}>05 · Cómo lo hacemos — 3 semanas</p>
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '.75rem 1rem', marginBottom: '1rem' }}>
          {[
            { week: 'Semana 1', title: 'Diseño', tags: ['Tu marca y colores', 'Estructura', 'Aprobación'] },
            { week: 'Semana 2', title: 'Desarrollo', tags: ['Catálogo', 'Buscador', 'Panel asesores', 'Extras'] },
            { week: 'Semana 3', title: 'Entrega', tags: ['Revisión contigo', 'Sitio publicado', 'Capacitación'] },
          ].map((phase, i, arr) => (
            <div key={phase.week} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '.75rem', padding: '.6rem 0', borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1a3c5e' }}>{phase.week}</p>
                <p style={{ fontSize: 11, color: '#999' }}>{phase.title}</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {phase.tags.map(tag => <span key={tag} style={{ fontSize: 11, background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: 4, padding: '2px 7px', color: '#666' }}>{tag}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* Pago */}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', margin: '1.1rem 0 .5rem' }}>06 · Forma de pago</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a3c5e' }}>50%</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Al arrancar</p>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a3c5e' }}>50%</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Al entregar</p>
          </div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '.75rem', textAlign: 'center', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1a3c5e' }}>30 días soporte incluido</p>
          <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Post-entrega sin costo adicional</p>
        </div>

        {/* CTA */}
        <div style={{ background: '#1a3c5e', borderRadius: 14, padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: '.4rem' }}>¿Arrancamos, Morelba?</p>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.65)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Esta propuesta tiene validez de 15 días. Escríbenos cuando estés lista y empezamos esta semana.
          </p>
          <a href={WA_ZM} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 600,
            padding: '.75rem 1.25rem', borderRadius: 10, textDecoration: 'none', marginBottom: '.75rem'
          }}>
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Confirmar propuesta por WhatsApp
          </a>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>albertoorta.1@gmail.com · +58 414 494 0417</p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: '1.5rem' }}>
          Propuesta preparada por ZM Tech · zmtech-landing.vercel.app
        </p>

      </div>
    </main>
  )
}
