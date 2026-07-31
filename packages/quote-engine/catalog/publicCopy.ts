import type { CatalogService } from '../types'
import { publicServiceCopyEn } from './publicCopy.en'

/**
 * Copy público del cotizador: lenguaje cotidiano + término técnico opcional.
 * No reemplaza el catálogo (ids/precios); solo la presentación al visitante.
 */
export type PublicServiceCopy = {
  titulo: string
  descripcion: string
  /** Etiqueta técnica discreta (SEO, SaaS, IA…). Omitir si no aporta. */
  terminoTecnico?: string
}

export type QuoteLocale = 'es' | 'en'

export const publicServiceCopy: Record<string, PublicServiceCopy> = {
  // Nivel 0
  'gmaps-basico': {
    titulo: 'Aparecer en Google Maps',
    descripcion:
      'Creamos o reclamamos tu ficha, la verificamos y dejamos categoría, horario y ubicación claros.',
    terminoTecnico: 'Google Business Profile',
  },
  'gmaps-optimizado': {
    titulo: 'Google Maps listo para atraer clientes',
    descripcion:
      'Lo básico, más texto que te encuentren cerca, fotos, primer aviso y respuestas a reseñas configuradas.',
    terminoTecnico: 'SEO local',
  },
  'redes-setup': {
    titulo: 'Cuentas de Facebook e Instagram Business',
    descripcion: 'Dejamos tus redes profesionales listas para publicar y atender mensajes.',
  },

  // Nivel 1
  'landing-1pagina': {
    titulo: 'Página única para presentar tu negocio',
    descripcion: 'Una sola página, pensada para el celular, clara y directa.',
    terminoTecnico: 'Landing',
  },
  'sitio-multiseccion': {
    titulo: 'Sitio web completo de tu marca',
    descripcion: 'Varias secciones, tu identidad y listo para publicar en internet.',
  },
  'form-envio-auto': {
    titulo: 'Formulario que te llega al correo',
    descripcion:
      'Cuando alguien te escribe desde la web, te llega automático sin perder el mensaje.',
  },
  'seo-onpage': {
    titulo: 'Que te encuentren en Google',
    descripcion: 'Preparamos el sitio para aparecer cuando busquen lo que ofreces.',
    terminoTecnico: 'SEO on-page',
  },
  'whatsapp-boton': {
    titulo: 'Botón de WhatsApp en tu web',
    descripcion: 'El cliente te escribe en un toque desde la página o desde cada anuncio.',
  },
  'dominio-1er-ano': {
    titulo: 'Tu dirección web el primer año',
    descripcion: 'Incluida como regalo — valor normal cerca de $35 USD.',
    terminoTecnico: 'Dominio',
  },
  'migracion-datos': {
    titulo: 'Pasar tus datos al sitio nuevo',
    descripcion:
      'Trasladamos lo que ya tienes (Wasi, Excel u otro sistema) sin reescribir todo a mano.',
    terminoTecnico: 'Migración',
  },
  'addon-whatsapp-automatizacion': {
    titulo: 'WhatsApp que responde o avisa solo',
    descripcion: 'Recordatorios, confirmaciones o mensajes automáticos según tu flujo.',
    terminoTecnico: 'Bot / automatización',
  },
  'addon-ia': {
    titulo: 'Ayuda con inteligencia artificial',
    descripcion: 'Reportes o asistente que te ahorra tiempo en el día a día.',
    terminoTecnico: 'IA',
  },
  'addon-push-notifications': {
    titulo: 'Avisos en el celular de tus clientes',
    descripcion: 'Notificaciones push para recordatorios o novedades (app móvil).',
    terminoTecnico: 'Push',
  },

  // Nivel 2
  'app-base': {
    titulo: 'App para agenda, clientes y servicios',
    descripcion: 'La base para manejar citas y tu cartera sin Excel eterno.',
  },
  'app-inventario': {
    titulo: 'Control de inventario',
    descripcion: 'Sabes qué tienes, qué falta y evitas sorpresas en el stock.',
  },
  'app-finanzas': {
    titulo: 'Finanzas y comisiones',
    descripcion: 'Llevas cuentas y pagos del equipo sin enredarte.',
  },
  'app-whatsapp-bot': {
    titulo: 'Bot de WhatsApp para reservas',
    descripcion: 'Reserva y recordatorios por chat, sin que estés pegado al teléfono.',
  },
  'app-ia-asistente': {
    titulo: 'Ayudante inteligente en la app',
    descripcion: 'Te apoya con tareas repetidas dentro del sistema.',
    terminoTecnico: 'IA',
  },
  'app-mantenimiento': {
    titulo: 'Mantenimiento mes a mes',
    descripcion: 'Soporte, ajustes y que todo siga andando después de la entrega.',
  },

  // Nivel 3
  'saas-onboarding': {
    titulo: 'Puesta en marcha de un local nuevo',
    descripcion: 'Configuración, carga de datos y capacitación para arrancar.',
    terminoTecnico: 'Onboarding',
  },
  'saas-suscripcion': {
    titulo: 'Mensualidad del sistema (según lo que uses)',
    descripcion: 'Pago recurrente por el acceso; el monto depende de los módulos activos.',
    terminoTecnico: 'SaaS',
  },
  'saas-vertical-nueva': {
    titulo: 'Sistema a tu marca para un rubro nuevo',
    descripcion: 'Una plataforma completa tipo salón, clínica u otro vertical, con tu marca.',
    terminoTecnico: 'White-label',
  },
}

/**
 * Resuelve copy público. Si no hay entry, usa nombre/descripcion del catálogo.
 */
export function getPublicServiceCopy(
  service: CatalogService,
  locale: QuoteLocale = 'es'
): PublicServiceCopy {
  const map = locale === 'en' ? publicServiceCopyEn : publicServiceCopy
  const override = map[service.id]
  if (override) return override
  return {
    titulo: service.nombre,
    descripcion: service.descripcion ?? '',
  }
}
