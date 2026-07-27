import { guataparoQuote } from './guataparo'
import type { QuoteDefinition } from './types'

/**
 * Registro de propuestas. Agregar cliente nuevo =
 * 1) crear data/quotes/<slug>.ts
 * 2) importarlo aquí
 * Cero cambios en componentes o rutas.
 */
export const quotesRegistry: Record<string, QuoteDefinition> = {
  [guataparoQuote.slug]: guataparoQuote,
}

export function getQuote(slug: string): QuoteDefinition | undefined {
  return quotesRegistry[slug]
}

export type { QuoteDefinition }
