import type { Bundle } from '../types'

/**
 * Bundles = el patrón "paquete completo con descuento" que ya validamos
 * con Morelba (3 servicios juntos por $130 en vez de $140).
 * calculatePrice.ts busca aquí antes de sumar servicios sueltos.
 */
export const bundles: Bundle[] = [
  {
    id: 'combo-presencia-local',
    nombre: 'Combo Presencia Local',
    servicios: ['gmaps-optimizado', 'redes-setup'],
    descuento: 10,
    tipoDescuento: 'monto',
  },
  {
    id: 'combo-landing-completo',
    nombre: 'Sitio Web Completo',
    servicios: ['sitio-multiseccion', 'form-envio-auto', 'seo-onpage', 'whatsapp-boton'],
    descuento: 10,
    tipoDescuento: 'monto',
  },
  {
    id: 'combo-app-full',
    nombre: 'App de Gestión Full',
    servicios: ['app-base', 'app-inventario', 'app-finanzas', 'app-whatsapp-bot'],
    descuento: 8,
    tipoDescuento: 'porcentaje',
  },
]
