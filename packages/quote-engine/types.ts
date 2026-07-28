/**
 * quote-engine/types.ts
 * Contratos del motor de cotización ZM Tech.
 * Sin lógica aquí — solo tipos. La lógica vive en logic/, la presentación en components/.
 */

export type ServiceTier = 0 | 1 | 2 | 3 | 4

export type PricingUnit =
  | 'unico' // pago único de desarrollo/setup
  | 'mensual' // retainer / mantenimiento single-tenant
  | 'mensual-tenant' // suscripción SaaS por tenant (Nivel 3)
  | 'proyecto' // proyecto por fases, precio se cotiza aparte (Nivel 4)

export interface PriceRange {
  min: number
  max: number
}

export interface CatalogService {
  id: string
  nivel: ServiceTier
  categoria: string
  nombre: string
  descripcion?: string
  /** Precio fijo o rango. En Nivel 3-4 casi siempre es PriceRange. */
  precio: number | PriceRange
  unidad: PricingUnit
  /**
   * Si es false, el cotizador público NO muestra el precio —
   * se reemplaza por CTA "Agendar diagnóstico" (uso: Nivel 4).
   */
  precioVisible: boolean
}

export interface Bundle {
  id: string
  nombre: string
  /** ids de CatalogService que agrupa este combo */
  servicios: string[]
  descuento: number
  tipoDescuento: 'monto' | 'porcentaje'
}

/**
 * NOTA IMPORTANTE — Tarifas "tenant-fundador":
 * Tenants como Vanessa (ZM Lash & Nails, $49/mes vs. $70-90/mes de mercado)
 * NUNCA se modelan aquí. Ese tipo de tarifa es una excepción interna,
 * no un producto del catálogo público. Se documenta como campo
 * `notas_internas` en la tabla `tenants` de Supabase, fuera de este engine.
 * Si necesitas ese dato, búscalo ahí — no lo agregues a `services.ts`.
 */
