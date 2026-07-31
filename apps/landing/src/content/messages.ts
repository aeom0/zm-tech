export type NavMessages = {
  links: Array<{ label: string; href: string }>
  cta: string
  openMenu: string
}

export type HeroMessages = {
  badge: string
  h1Lines: [string, string, string]
  paragraph: string
  ctaPrimary: string
  ctaSecondary: string
  imageAlt: string
  statusLabel: string
  statusValue: string
}

export type TrustMessages = {
  before: string
  cosmetic: string
  and: string
  sports: string
  after: string
  mlb: string
}

export type VerticalItemMessages = {
  title: string
  description: string
}

export type VerticalsMessages = {
  eyebrow: string
  title: string
  items: {
    industrial: VerticalItemMessages
    beauty: VerticalItemMessages
    workshop: VerticalItemMessages
  }
}

export type FeatureItemMessages = {
  title: string
  description: string
}

export type FeaturesMessages = {
  eyebrow: string
  title: string
  intro: string
  items: {
    speed: FeatureItemMessages
    support: FeatureItemMessages
    scale: FeatureItemMessages
    ownership: FeatureItemMessages
  }
}

export type IntegrationItemMessages = {
  category: string
  description: string
}

export type IntegrationsMessages = {
  eyebrow: string
  title: string
  subtitle: string
  items: {
    mercadolibre: IntegrationItemMessages
    cashea: IntegrationItemMessages
    whatsapp: IntegrationItemMessages
    stripe: IntegrationItemMessages
    bcv: IntegrationItemMessages
    seniat: IntegrationItemMessages
    calendar: IntegrationItemMessages
    telegram: IntegrationItemMessages
    meta: IntegrationItemMessages
    auth: IntegrationItemMessages
  }
}

export type CotizadorTipoMessages = {
  label: string
  desc: string
  dias: string
}

export type CotizadorPackMessages = {
  label: string
  badge: string | null
  tagline: string
  includes: string[]
}

export type CotizadorExtraMessages = {
  label: string
  desc: string
}

export type CotizadorHomeMessages = {
  eyebrow: string
  title: string
  subtitle: string
  step1: string
  step2: string
  step3: string
  tabPacks: string
  tabExtras: string
  cancelAnytime: string
  extrasNote: string
  estimateLabel: string
  initialInvestment: string
  planPrefix: string
  perMonth: string
  extrasLabel: string
  extrasUnique: string
  typeLabel: string
  designLabel: string
  deliveryLabel: string
  trust: [string, string, string, string]
  cta: string
  emptyTitle: string
  emptyHints: [string, string, string]
  tipos: {
    landing: CotizadorTipoMessages
    corporativa: CotizadorTipoMessages
    ecommerce: CotizadorTipoMessages
    saas: CotizadorTipoMessages
  }
  disenios: {
    template: string
    custom: string
    premium: string
  }
  packs: {
    arranque: CotizadorPackMessages
    negocio: CotizadorPackMessages
    enterprise: CotizadorPackMessages
  }
  extraGroups: Array<{
    category: string
    color: string
    items: Array<{
      id: string
      label: string
      desc: string
      price: number
      requiresPack?: string
    }>
  }>
}

export type ContactMessages = {
  title: string
  subtitle: string
  labelNombre: string
  labelEmpresa: string
  labelWhatsapp: string
  labelPresupuesto: string
  placeholderNombre: string
  placeholderEmpresa: string
  placeholderWhatsapp: string
  placeholderPresupuesto: string
  submit: string
  submitting: string
  successTitle: string
  successSubtitle: string
  errorSend: string
  validationNombre: string
  validationEmpresa: string
  validationWhatsapp: string
  validationPresupuesto: string
}

export type FaqItemMessages = {
  question: string
  answer: string
}

export type FaqMessages = {
  eyebrow: string
  title: string
  subtitle: string
  items: FaqItemMessages[]
}

export type FooterMessages = {
  blurb: string
  solutionsTitle: string
  followTitle: string
  rights: string
  madeIn: string
  homeAria: string
}

export type MetadataMessages = {
  title: string
  description: string
  keywords: string
}

export type CotizadorPageMessages = {
  title: string
  description: string
  heading: string
  subheading: string
  niveles: Record<0 | 1 | 2 | 3, { titulo: string; tecnico?: string }>
  enterpriseTitle: string
  enterpriseTecnico: string
  enterpriseHeading: string
  enterpriseBody: string
  enterpriseCta: string
  enterpriseWaMsg: string[]
  totalLabel: string
  emptyTotal: string
  subtotal: string
  comboSavings: string
  total: string
  nameLabel: string
  namePlaceholder: string
  waTitle: string
  waSubtitle: string
  waButton: string
  emptyCta: string
  footer: string
  perMonth: string
}

export type Messages = {
  nav: NavMessages
  hero: HeroMessages
  trust: TrustMessages
  verticals: VerticalsMessages
  features: FeaturesMessages
  integrations: IntegrationsMessages
  cotizadorHome: CotizadorHomeMessages
  contact: ContactMessages
  faq: FaqMessages
  footer: FooterMessages
  metadata: MetadataMessages
  cotizadorPage: CotizadorPageMessages
  metadataCotizador: MetadataMessages
}
