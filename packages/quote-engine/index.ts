/**
 * @zmtech/quote-engine
 * Motor de cotización data-driven para propuestas ZM Tech.
 */

export type {
  Bundle,
  CatalogService,
  PriceRange,
  PricingUnit,
  ServiceTier,
} from './types'

export { services } from './catalog/services'
export { bundles } from './catalog/bundles'

export {
  calculatePrice,
  resolveCalculoPrecio,
  type CalculatePriceInput,
  type CalculatePriceResult,
  type LineItem,
} from './logic/calculatePrice'

export {
  generateWhatsAppMsg,
  type GenerateWhatsAppMsgInput,
} from './logic/generateWhatsAppMsg'

export { QuoteHero } from './components/QuoteHero'
export { ServiceLineItem } from './components/ServiceLineItem'
export { SelectableServiceLineItem } from './components/SelectableServiceLineItem'
export { ComboBanner } from './components/ComboBanner'
export { ROIComparison, type ROIComparisonRow, type ROIComparisonProps } from './components/ROIComparison'
export { WhatsAppCTA, type LeadPayload } from './components/WhatsAppCTA'
export { WhatsAppIcon } from './components/WhatsAppIcon'
