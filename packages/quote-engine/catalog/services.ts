import type { CatalogService } from '../types'

/**
 * Catálogo maestro ZM Tech.
 * Agregar un servicio nuevo = agregar un objeto aquí. No se toca JSX en ningún lado.
 */
export const services: CatalogService[] = [
  // ─────────────────────────────────────────────
  // NIVEL 0 — Presencia Digital (el anzuelo)
  // ─────────────────────────────────────────────
  {
    id: 'gmaps-basico',
    nivel: 0,
    categoria: 'presencia-local',
    nombre: 'Marcación Google Maps básica',
    descripcion: 'Creación/reclamación de ficha, verificación, categoría, horario y ubicación exacta.',
    precio: 20,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'gmaps-optimizado',
    nivel: 0,
    categoria: 'presencia-local',
    nombre: 'Google Maps optimizado',
    descripcion: 'Básico + descripción SEO local, 8-10 fotos, primer post y respuesta a reseñas configurada.',
    precio: 45,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'redes-setup',
    nivel: 0,
    categoria: 'presencia-local',
    nombre: 'Setup redes sociales (FB/IG Business)',
    precio: 25,
    unidad: 'unico',
    precioVisible: true,
  },

  // ─────────────────────────────────────────────
  // NIVEL 1 — Landing / Sitio Web
  // ─────────────────────────────────────────────
  {
    id: 'landing-1pagina',
    nivel: 1,
    categoria: 'web',
    nombre: 'Landing 1 página',
    descripcion: 'Estilo YLA-MVP — una sola página, mobile-first.',
    precio: 150,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'sitio-multiseccion',
    nivel: 1,
    categoria: 'web',
    nombre: 'Sitio multi-sección',
    descripcion: 'Estilo ZM Tech Landing — varias secciones, identidad de marca completa.',
    precio: 300,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'form-envio-auto',
    nivel: 1,
    categoria: 'web',
    nombre: 'Formulario con envío automático (Resend)',
    precio: 30,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'seo-onpage',
    nivel: 1,
    categoria: 'web',
    nombre: 'SEO on-page',
    precio: 40,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'whatsapp-boton',
    nivel: 1,
    categoria: 'web',
    nombre: 'Botón WhatsApp integrado',
    precio: 40,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'dominio-1er-ano',
    nivel: 1,
    categoria: 'web',
    nombre: 'Dominio primer año',
    precio: 0,
    unidad: 'unico',
    precioVisible: true,
    descripcion: 'Incluido como regalo — valor de mercado ~$35 USD.',
  },

  // ─────────────────────────────────────────────
  // NIVEL 2 — App / Sistema de Gestión (single-tenant)
  // ─────────────────────────────────────────────
  {
    id: 'app-base',
    nivel: 2,
    categoria: 'app-gestion',
    nombre: 'App base (agenda + clientes + servicios)',
    precio: { min: 500, max: 700 },
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'app-inventario',
    nivel: 2,
    categoria: 'app-gestion',
    nombre: 'Módulo de inventario',
    precio: 100,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'app-finanzas',
    nivel: 2,
    categoria: 'app-gestion',
    nombre: 'Módulo de finanzas / comisiones',
    precio: 100,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'app-whatsapp-bot',
    nivel: 2,
    categoria: 'automatizacion',
    nombre: 'Bot WhatsApp (reservas/recordatorios)',
    precio: 150,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'app-ia-asistente',
    nivel: 2,
    categoria: 'ia',
    nombre: 'Asistente IA integrado (Claude Haiku)',
    precio: 120,
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'app-mantenimiento',
    nivel: 2,
    categoria: 'retainer',
    nombre: 'Mantenimiento mensual',
    precio: { min: 40, max: 60 },
    unidad: 'mensual',
    precioVisible: true,
  },

  // ─────────────────────────────────────────────
  // NIVEL 3 — SaaS Multi-Tenant Vertical (GeemaStudio, OdentalPro, RepMAX)
  // ─────────────────────────────────────────────
  {
    id: 'saas-onboarding',
    nivel: 3,
    categoria: 'saas',
    nombre: 'Onboarding tenant nuevo',
    descripcion: 'Configuración + carga de datos + capacitación.',
    precio: { min: 150, max: 300 },
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'saas-suscripcion',
    nivel: 3,
    categoria: 'saas',
    nombre: 'Suscripción SaaS (según módulos activos)',
    precio: { min: 25, max: 60 },
    unidad: 'mensual-tenant',
    precioVisible: true,
  },
  {
    id: 'saas-vertical-nueva',
    nivel: 3,
    categoria: 'saas',
    nombre: 'Vertical white-label desde cero',
    descripcion: 'Nueva vertical SaaS completa para un tercero, tipo GeemaStudio/OdentalPro.',
    precio: { min: 2000, max: 4000 },
    unidad: 'proyecto',
    precioVisible: true,
  },

  // ─────────────────────────────────────────────
  // NIVEL 4 — Suite Empresarial Completa (ZetaEme-level)
  // Precio NO visible — CTA "Agendar diagnóstico"
  // ─────────────────────────────────────────────
  {
    id: 'suite-completa',
    nivel: 4,
    categoria: 'enterprise',
    nombre: 'Suite empresarial completa',
    descripcion: '3-5 apps: admin, inventario, producción, compras, ventas móvil. Fases 30/30/30/10.',
    precio: { min: 3000, max: 8000 },
    unidad: 'proyecto',
    precioVisible: false,
  },
  {
    id: 'suite-normativa',
    nivel: 4,
    categoria: 'enterprise',
    nombre: 'Integración normativa (SENIAT, tasa BCV)',
    precio: { min: 400, max: 800 },
    unidad: 'unico',
    precioVisible: false,
  },
  {
    id: 'suite-app-movil-ventas',
    nivel: 4,
    categoria: 'enterprise',
    nombre: 'App móvil de ventas/representantes',
    precio: { min: 600, max: 1000 },
    unidad: 'unico',
    precioVisible: false,
  },
  {
    id: 'suite-retainer-enterprise',
    nivel: 4,
    categoria: 'enterprise',
    nombre: 'Retainer soporte enterprise (SLA)',
    precio: { min: 150, max: 400 },
    unidad: 'mensual',
    precioVisible: false,
  },

  // ─────────────────────────────────────────────
  // ADD-ONS TRANSVERSALES (aplican a cualquier nivel)
  // ─────────────────────────────────────────────
  {
    id: 'migracion-datos',
    nivel: 1,
    categoria: 'addon',
    nombre: 'Migración de datos (Wasi, Excel, otro CRM)',
    precio: { min: 60, max: 150 },
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'addon-whatsapp-automatizacion',
    nivel: 1,
    categoria: 'addon',
    nombre: 'Automatización WhatsApp (bot/notificaciones)',
    precio: { min: 40, max: 200 },
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'addon-ia',
    nivel: 1,
    categoria: 'addon',
    nombre: 'IA integrada (reportes, asistente)',
    precio: { min: 100, max: 300 },
    unidad: 'unico',
    precioVisible: true,
  },
  {
    id: 'addon-push-notifications',
    nivel: 1,
    categoria: 'addon',
    nombre: 'Push notifications (Expo)',
    precio: 50,
    unidad: 'unico',
    precioVisible: true,
  },
]
