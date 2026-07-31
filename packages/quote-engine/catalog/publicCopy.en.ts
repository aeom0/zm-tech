import type { PublicServiceCopy } from './publicCopy'

/** English public copy for self-service quote builder. Same service ids as ES. */
export const publicServiceCopyEn: Record<string, PublicServiceCopy> = {
  'gmaps-basico': {
    titulo: 'Show up on Google Maps',
    descripcion:
      'We create or claim your listing, verify it, and set category, hours, and location clearly.',
    terminoTecnico: 'Google Business Profile',
  },
  'gmaps-optimizado': {
    titulo: 'Google Maps ready to attract customers',
    descripcion:
      'The basics, plus local-friendly copy, photos, first post, and review replies configured.',
    terminoTecnico: 'Local SEO',
  },
  'redes-setup': {
    titulo: 'Facebook and Instagram Business accounts',
    descripcion: 'We set up your professional profiles ready to post and reply to messages.',
  },
  'landing-1pagina': {
    titulo: 'Single page to present your business',
    descripcion: 'One mobile-first page — clear and direct.',
    terminoTecnico: 'Landing',
  },
  'sitio-multiseccion': {
    titulo: 'Full brand website',
    descripcion: 'Multiple sections, your identity, ready to publish online.',
  },
  'form-envio-auto': {
    titulo: 'Form that emails you',
    descripcion: 'When someone writes from the site, you get it automatically — no lost leads.',
  },
  'seo-onpage': {
    titulo: 'Get found on Google',
    descripcion: 'We prepare the site so people find you when they search what you offer.',
    terminoTecnico: 'On-page SEO',
  },
  'whatsapp-boton': {
    titulo: 'WhatsApp button on your site',
    descripcion: 'Customers message you in one tap from the page or from each ad.',
  },
  'dominio-1er-ano': {
    titulo: 'Your web address for year one',
    descripcion: 'Included as a gift — normally around $35 USD.',
    terminoTecnico: 'Domain',
  },
  'migracion-datos': {
    titulo: 'Move your data to the new site',
    descripcion:
      'We migrate what you already have (Wasi, Excel, or another system) without rewriting everything by hand.',
    terminoTecnico: 'Migration',
  },
  'addon-whatsapp-automatizacion': {
    titulo: 'WhatsApp that replies or notifies on its own',
    descripcion: 'Reminders, confirmations, or automatic messages based on your flow.',
    terminoTecnico: 'Bot / automation',
  },
  'addon-ia': {
    titulo: 'AI assistance',
    descripcion: 'Reports or an assistant that saves you time day to day.',
    terminoTecnico: 'AI',
  },
  'addon-push-notifications': {
    titulo: 'Alerts on your customers’ phones',
    descripcion: 'Push notifications for reminders or news (mobile app).',
    terminoTecnico: 'Push',
  },
  'app-base': {
    titulo: 'App for scheduling, clients, and services',
    descripcion:
      'The foundation to manage appointments and your book without endless spreadsheets.',
  },
  'app-inventario': {
    titulo: 'Inventory control',
    descripcion: 'Know what you have, what is missing, and avoid stock surprises.',
  },
  'app-finanzas': {
    titulo: 'Finance and commissions',
    descripcion: 'Track accounts and team payouts without the mess.',
  },
  'app-whatsapp-bot': {
    titulo: 'WhatsApp bot for bookings',
    descripcion: 'Bookings and reminders by chat so you are not glued to the phone.',
  },
  'app-ia-asistente': {
    titulo: 'Smart helper inside the app',
    descripcion: 'Supports repetitive tasks inside the system.',
    terminoTecnico: 'AI',
  },
  'app-mantenimiento': {
    titulo: 'Month-to-month maintenance',
    descripcion: 'Support, tweaks, and keeping things running after delivery.',
  },
  'saas-onboarding': {
    titulo: 'Launch a new location',
    descripcion: 'Setup, data load, and training to go live.',
    terminoTecnico: 'Onboarding',
  },
  'saas-suscripcion': {
    titulo: 'System subscription (based on what you use)',
    descripcion: 'Recurring access fee; amount depends on active modules.',
    terminoTecnico: 'SaaS',
  },
  'saas-vertical-nueva': {
    titulo: 'Branded system for a new vertical',
    descripcion: 'A full platform for a salon, clinic, or other vertical, under your brand.',
    terminoTecnico: 'White-label',
  },
}
