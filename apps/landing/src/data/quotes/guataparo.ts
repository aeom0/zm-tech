import type { QuoteDefinition } from './types'

/**
 * Propuesta Guataparo Bienes Raíces (Morelba Hernández).
 * Migrada 1:1 en contenido/jerarquía desde propuesta/guataparo/page.tsx.
 * Ids alineados al catálogo en @zmtech/quote-engine.
 */
export const guataparoQuote: QuoteDefinition = {
  slug: 'guataparo',
  clienteNombre: 'Morelba Hernández',
  clienteNombreCorto: 'Morelba',
  mensajeIntro:
    'Hola Morelba, preparamos esta propuesta pensando en lo que necesita Guataparo Bienes Raíces: una plataforma propia, sin alquilarle nada a nadie, que trabaje para ti todos los días.',
  // Catálogo: sitio $300 + migración min $60 + WA $40 + SEO $40 + dominio $0
  serviceIds: [
    'sitio-multiseccion',
    'migracion-datos',
    'whatsapp-boton',
    'seo-onpage',
    'dominio-1er-ano',
  ],
  waNumber: '584144940417',
  meta: {
    title: 'Propuesta — Guataparo Bienes Raíces',
    description: 'Propuesta personalizada de ZM Tech para Guataparo Bienes Raíces.',
  },
  fechaLabel: 'Propuesta personalizada · Abril 2026',
  lineCopy: {
    'migracion-datos': {
      nombre: 'Traspaso automático desde Wasi',
      descripcion:
        'Todas tus propiedades pasan al nuevo sitio sin recargar nada a mano.',
    },
    'whatsapp-boton': {
      nombre: 'Botón WhatsApp por propiedad',
      descripcion:
        'Cada inmueble conecta directo al asesor responsable. El cliente te escribe en un toque.',
    },
    'seo-onpage': {
      nombre: 'Visibilidad en Google',
      descripcion:
        'Configuramos el sitio para aparecer cuando busquen apartamentos en Venezuela. Más visitas sin pagar publicidad.',
    },
  },
  plataforma: {
    tituloSeccion: '01 · Tu plataforma web completa',
    label: 'Inversión inicial',
    servicioId: 'sitio-multiseccion',
    nota: 'Pago único para arrancar. El sitio es tuyo para siempre.',
    features: [
      'Página web profesional de tu agencia',
      'Catálogo de propiedades con fotos y filtros',
      'Panel privado para tus asesores',
      'Lista para publicar en internet',
    ],
  },
  dominioRegalo: {
    titulo: 'Dominio incluido el primer año',
    descripcion:
      'Tu dirección web propia — guataparobienesraices.com — incluida en este pago. Valor normal: $35 USD.',
  },
  extras: {
    tituloSeccion: '02 · Servicios adicionales',
    serviceIds: ['migracion-datos', 'whatsapp-boton', 'seo-onpage'],
    pricePrefix: '+',
  },
  soporteMensual: {
    tituloSeccion: '03 · Acompañamiento mensual',
    precio: 30,
    items: [
      'Actualizamos precios, fotos y descripciones',
      'Soporte técnico cuando lo necesites',
      'Copias de seguridad automáticas',
      'Una mejora al mes incluida',
    ],
  },
  roi: {
    tituloSeccion: '04 · Lo que cambia para tu agencia',
    nota: 'Referencia — Wasi con 4 o más asesores:',
    filas: [
      { label: 'Plan Pro Wasi (base)', valor: '$48/mes', variante: 'negativo' },
      { label: 'Cada asesor extra', valor: '+$5.50 c/u', variante: 'negativo' },
      { label: 'Con 4 asesores pagas aprox.', valor: '~$59/mes', variante: 'negativo' },
      { label: 'Eso al año son', valor: '~$700', variante: 'negativo' },
      { label: 'Con ZM Tech pagas al año', valor: '~$360', variante: 'positivo' },
      { label: 'El sitio es completamente tuyo', valor: '✓', variante: 'positivo' },
    ],
    resumenAntes: { valor: '$700', label: 'Wasi al año' },
    resumenDespues: { valor: '$360', label: 'Con nosotros al año' },
    payback: { valor: '~10 meses', label: 'Y ya recuperaste la inversión inicial' },
  },
  cronograma: {
    tituloSeccion: '05 · Cómo lo hacemos — 3 semanas',
    fases: [
      { week: 'Semana 1', title: 'Diseño', tags: ['Tu marca y colores', 'Estructura', 'Aprobación'] },
      {
        week: 'Semana 2',
        title: 'Desarrollo',
        tags: ['Catálogo', 'Buscador', 'Panel asesores', 'Extras'],
      },
      {
        week: 'Semana 3',
        title: 'Entrega',
        tags: ['Revisión contigo', 'Sitio publicado', 'Capacitación'],
      },
    ],
  },
  pago: {
    tituloSeccion: '06 · Forma de pago',
    porcentajeArranque: '50%',
    labelArranque: 'Al arrancar',
    porcentajeEntrega: '50%',
    labelEntrega: 'Al entregar',
    soporteTitulo: '30 días soporte incluido',
    soporteSub: 'Post-entrega sin costo adicional',
  },
  cta: {
    titulo: '¿Arrancamos, Morelba?',
    subtitulo:
      'Esta propuesta tiene validez de 15 días. Escríbenos cuando estés lista y empezamos esta semana.',
    contacto: 'albertoorta.1@gmail.com · +58 414 494 0417',
  },
  footer: 'Propuesta preparada por ZM Tech · zmtech-landing.vercel.app',
}
