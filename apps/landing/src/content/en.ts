import type { Messages } from './messages'

export const en: Messages = {
  nav: {
    links: [
      { label: 'VERTICALS', href: '#verticales' },
      { label: 'ADVANTAGES', href: '#ventajas' },
      { label: 'QUOTE', href: '#cotizador' },
      { label: 'FAQ', href: '#faq' },
    ],
    cta: 'Talk to us',
    openMenu: 'Open menu',
  },
  hero: {
    badge: 'Still running your business on WhatsApp and spreadsheets?',
    h1Lines: ['Software', 'Engineering at', 'AI Speed'],
    paragraph:
      'We build the system that gets you out of there. Real, in production, running today — not a promise.',
    ctaPrimary: 'GET A QUOTE →',
    ctaSecondary: 'SEE THE STACK',
    imageAlt: 'ZM Tech systems in production: management panel, schedule and sales',
    statusLabel: 'Active projects',
    statusValue: '3 verticals in production',
  },
  trust: {
    before: 'Technology proven in the',
    cosmetic: 'cosmetics',
    and: 'and',
    sports: 'sports',
    after: 'industry (',
    mlb: 'MLB Standards',
  },
  verticals: {
    eyebrow: 'ECOSYSTEM',
    title: 'ZM Verticals',
    previewBadge: 'Preview',
    items: {
      industrial: {
        title: 'ZM Industrial Core',
        description:
          'Run your company from one screen. Inventory, logistics, production, and real-time reports — built for businesses that cannot afford to fail.',
        cta: 'Quote this vertical',
      },
      beauty: {
        title: 'ZM Beauty Engine',
        description:
          'Your spa or salon deserves first-class tech. Online booking, client history, POS, and automatic reminders — in an app your team will actually want to use.',
        cta: 'Quote this vertical',
      },
      workshop: {
        title: 'ZM Workshop & Parts',
        description:
          'Sell parts, run your shop, and serve more customers without the chaos. Digital catalog, work orders, and inventory tracking in one place.',
        cta: 'Quote this vertical',
      },
    },
  },
  features: {
    eyebrow: 'ZM ENGINE',
    title: 'Why ZM Tech',
    intro:
      'We are not just another agency. We are the technical team your business needed — without the cost of hiring one in-house.',
    items: {
      speed: {
        title: 'Your team moves faster',
        description:
          'We remove the processes that slow you down. Clean interfaces, direct flows, and zero busywork so your people focus on what matters.',
      },
      support: {
        title: 'Support that stays',
        description:
          'We do not disappear after launch. We monitor your system 24/7, fix issues before you notice them, and keep improving the software over time.',
      },
      scale: {
        title: 'Grow without breaking',
        description:
          'We build for the future. Your platform holds from your first customers to thousands of users — without rebuilding from scratch.',
      },
      ownership: {
        title: 'The code is yours. Period.',
        description:
          'Full transparency from day one. Source code, data, and infrastructure belong to you — no trap licenses or forever lock-in.',
      },
    },
  },
  integrations: {
    eyebrow: 'Connected Ecosystem',
    title: 'Your business, connected to everything',
    subtitle:
      'We integrate your software with the tools you already use — and the ones you need to grow across Venezuela and Latin America.',
    items: {
      mercadolibre: {
        category: 'E-commerce',
        description:
          'Sync your catalog, manage orders, and update stock in real time from your system — without opening MercadoLibre manually.',
      },
      cashea: {
        category: 'Installment payments',
        description:
          'Show Cashea installments in your store or system. Customers see weekly payments instantly — and that closes more sales.',
      },
      whatsapp: {
        category: 'Communication',
        description:
          'Appointment confirmations, order alerts, automatic reminders, and customer support — all via WhatsApp without manual work.',
      },
      stripe: {
        category: 'Global payments',
        description:
          'Charge in dollars, euros, or any currency with card or payment links. Ideal for international clients or the diaspora.',
      },
      bcv: {
        category: 'Venezuela finance',
        description:
          'Official BCV rate updated automatically in your system. Bolívar prices stay correct without daily manual updates.',
      },
      seniat: {
        category: 'Tax / fiscal',
        description:
          'Invoices and delivery notes compliant with SENIAT Art. 177. Stay compliant without filling forms by hand.',
      },
      calendar: {
        category: 'Scheduling',
        description:
          'Appointments and bookings synced with Google Calendar in real time. Your team sees an updated schedule without another app.',
      },
      telegram: {
        category: 'Notifications',
        description:
          'Instant alerts to your team or customers via Telegram. New sales, system errors, reminders — delivered immediately.',
      },
      meta: {
        category: 'Marketing',
        description:
          'Connect your product catalog to Instagram Shopping and Meta Ads. More reach, no extra work on your side.',
      },
      auth: {
        category: 'Security',
        description:
          'Secure sign-in with email, Google, or magic link. Per-user access control so everyone sees only what they should.',
      },
    },
  },
  cotizadorHome: {
    eyebrow: 'Tool',
    title: 'Instant Quote',
    subtitle: 'Get a real estimate in under 60 seconds',
    step1: '01 — What do you need?',
    step2: '02 — Design level',
    step3: '03 — Monthly support plan',
    tabPacks: 'Monthly packs',
    tabExtras: 'À la carte extras',
    cancelAnytime: 'No minimum contract · Cancel anytime',
    extrasNote: 'One-time payment · Added to the project price',
    estimateLabel: 'Your estimate',
    initialInvestment: 'Initial investment (one-time)',
    planPrefix: 'Plan',
    perMonth: '/mo',
    extrasLabel: 'Extras',
    extrasUnique: 'USD one-time',
    typeLabel: 'Type',
    designLabel: 'Design',
    deliveryLabel: 'Est. delivery',
    trust: [
      '✓ 50% deposit · 50% on delivery',
      '✓ Source code 100% yours',
      '✓ Cancel the plan anytime',
      '✓ Top-tier technology',
    ],
    cta: 'I want this proposal',
    emptyTitle: 'Pick a project type\nto see your estimate',
    emptyHints: ['→ No commitment', '→ Reply within 24h', '→ Adjustable to your budget'],
    tipos: {
      landing: {
        label: 'Landing Page',
        desc: 'One page, conversion-focused',
        dias: '3–5 days',
      },
      corporativa: {
        label: 'Corporate Site',
        desc: 'Multi-section, portfolio or company',
        dias: '7–14 days',
      },
      ecommerce: {
        label: 'E-commerce',
        desc: 'Online store with catalog and payments',
        dias: '14–21 days',
      },
      saas: {
        label: 'Web Application',
        desc: 'Control panel, user access, and business logic',
        dias: '21–45 days',
      },
    },
    disenios: {
      template: 'Adapted template',
      custom: 'Custom',
      premium: 'Premium design',
    },
    packs: {
      arranque: {
        label: 'Starter',
        badge: null,
        tagline: 'For businesses just going digital',
        includes: [
          'Hosting + domain included',
          'Lead form',
          'Basic on-page SEO',
          'WhatsApp support (48h)',
          '1 content update / month',
        ],
      },
      negocio: {
        label: 'Business',
        badge: 'MOST POPULAR',
        tagline: 'For companies already selling that want to sell more',
        includes: [
          'Everything in Starter',
          'Daily BCV rate updates',
          'Automated WhatsApp Business',
          'Telegram alert bot',
          'Priority support (24h)',
          '2 content updates / month',
        ],
      },
      enterprise: {
        label: 'Enterprise',
        badge: null,
        tagline: 'For serious operations that cannot fail',
        includes: [
          'Everything in Business',
          'Automatic SENIAT invoicing',
          'Secure access by user and roles',
          'Synced Google Calendar',
          '24/7 monitoring + daily backups',
          'Dedicated support (4h)',
          'Unlimited updates',
        ],
      },
    },
    extraGroups: [
      {
        category: 'Payment integrations',
        color: 'text-blue-400',
        items: [
          {
            id: 'stripe',
            label: 'Stripe',
            desc: 'Charge in USD or EUR with card and payment links. Ideal for the diaspora.',
            price: 45,
          },
          {
            id: 'cashea',
            label: 'Cashea installment viewer',
            desc: 'Show installments instantly in your store — clearer for customers, more sales.',
            price: 30,
          },
        ],
      },
      {
        category: 'Venezuela ecosystem',
        color: 'text-red-400',
        items: [
          {
            id: 'mercadolibre',
            label: 'MercadoLibre',
            desc: 'Catalog, stock, and orders synced in real time from your system.',
            price: 60,
          },
          {
            id: 'seniat',
            label: 'SENIAT invoicing',
            desc: 'Art. 177 invoices generated automatically. Requires Enterprise plan.',
            price: 65,
            requiresPack: 'enterprise',
          },
        ],
      },
      {
        category: 'Marketing & Sales',
        color: 'text-pink-400',
        items: [
          {
            id: 'meta',
            label: 'Meta / Instagram catalog',
            desc: 'Products synced with Instagram Shopping and Meta Ads.',
            price: 40,
          },
          {
            id: 'seo',
            label: 'Advanced on-page SEO',
            desc: 'Full audit, keywords, schema markup, and technical optimization.',
            price: 30,
          },
        ],
      },
      {
        category: 'Technical',
        color: 'text-violet-400',
        items: [
          {
            id: 'auth',
            label: 'Secure access + Roles',
            desc: 'Sign-in with email or Google and per-user access control.',
            price: 50,
          },
          {
            id: 'form',
            label: 'Lead form',
            desc: 'Contact capture with validation, email, and database storage.',
            price: 20,
          },
        ],
      },
    ],
  },
  contact: {
    title: 'Have a project in mind?',
    subtitle: 'Tell us what you need. We reply within 24 hours with a concrete proposal.',
    labelNombre: 'NAME / OPERATOR',
    labelEmpresa: 'COMPANY / ORGANIZATION',
    labelWhatsapp: 'COM LINK (WHATSAPP)',
    labelPresupuesto: 'ESTIMATED BUDGET (USD)',
    placeholderNombre: 'John Doe',
    placeholderEmpresa: 'Acme Corp',
    placeholderWhatsapp: '+1 555 000 0000',
    placeholderPresupuesto: 'e.g. $150 - $400',
    submit: 'I want my quote →',
    submitting: 'PROCESSING...',
    successTitle: '✓ PAYLOAD RECEIVED — CONNECTION ESTABLISHED',
    successSubtitle: 'Done! We will write you within 24h',
    errorSend: 'Something went wrong. Try again or message us directly on WhatsApp.',
    validationNombre: 'Name must be at least 2 characters',
    validationEmpresa: 'Company must be at least 2 characters',
    validationWhatsapp: 'Enter a valid number',
    validationPresupuesto: 'Enter an estimated budget',
  },
  faq: {
    eyebrow: 'KNOWLEDGE BASE',
    title: 'Frequent Protocols',
    subtitle: 'Everything you need to know before we start',
    items: [
      {
        question: 'Does the code belong to me or to ZM Tech?',
        answer:
          '100% yours. When the project closes, we deliver the full source code, server credentials, and documentation. No fine print, no dependency on us for your system to keep running.',
      },
      {
        question: 'What happens after you launch my app?',
        answer:
          'We do not disappear. We offer maintenance plans where we monitor your system, fix bugs, and keep improving the software — with AI-assisted support that catches issues before you notice them.',
      },
      {
        question: 'How long until my application is ready?',
        answer:
          'It depends on the project, but with our methodology a first working version can be ready in 4 to 6 weeks. Much faster than the market average, without sacrificing quality.',
      },
      {
        question: 'Do you only work with certain industries?',
        answer:
          'We have specialized verticals in Industry, Beauty, and Automotive, but we adapt to any business that needs serious software. If you have a real problem, we have a solution.',
      },
    ],
  },
  footer: {
    blurb:
      'We turn business ideas into custom software. Fast, robust, and with real support.',
    solutionsTitle: 'Our solutions',
    followTitle: 'Follow us',
    rights: 'All rights reserved.',
    madeIn: 'Crafted with care in Venezuela',
    homeAria: 'Go to home',
    privacy: 'Privacy',
    terms: 'Terms',
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: July 30, 2026',
    backHome: 'Back to home',
    metaDescription:
      'How ZM Tech collects, uses, and protects personal data on zmtechdev.com.',
    sections: [
      {
        heading: '1. Who we are',
        paragraphs: [
          'ZM Tech (“we”) operates zmtechdev.com and related quote and contact services. Data controller: Alberto Orta · contact: albertoorta.1@gmail.com · WhatsApp: +58 414 494 0417.',
        ],
      },
      {
        heading: '2. Data we collect',
        paragraphs: [
          'When you use the contact form or the public quote builder, we may receive: name, company or organization, WhatsApp number, estimated budget, selected services, and any message you send.',
          'Standard technical browsing data (IP address, browser type, pages visited) may also be processed by our hosting provider (Vercel) for security, performance, and diagnostics.',
        ],
      },
      {
        heading: '3. How we use it',
        paragraphs: [
          'We reply to your information or quote requests, follow up commercially by email or WhatsApp, and improve the site and our internal processes.',
          'We do not sell your personal data or use it for third-party advertising.',
        ],
      },
      {
        heading: '4. Who we share it with',
        paragraphs: [
          'Vendors that help us run the site under our instructions: hosting and CDN (Vercel), database and backend (Supabase, landing leads project), transactional email (Resend), and messaging when you initiate contact (WhatsApp).',
          'We may disclose information if required by law or a competent authority.',
        ],
      },
      {
        heading: '5. Retention',
        paragraphs: [
          'We keep leads as long as needed to handle your request and reasonable commercial follow-up, or until you ask for deletion, except where the law requires longer retention.',
        ],
      },
      {
        heading: '6. Your rights',
        paragraphs: [
          'You may request access, correction, or deletion of your personal data by emailing albertoorta.1@gmail.com. We will respond within a reasonable time.',
        ],
      },
      {
        heading: '7. Security and minors',
        paragraphs: [
          'We apply reasonable technical and organizational measures; no system is 100% secure. This site is not directed at people under 18; we do not knowingly collect children’s data.',
        ],
      },
      {
        heading: '8. Changes',
        paragraphs: [
          'We may update this policy. The “Last updated” date shows the current version. Continued use of the site after a change means you have noted the new version.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    lastUpdated: 'Last updated: July 30, 2026',
    backHome: 'Back to home',
    metaDescription:
      'Terms of use for zmtechdev.com and ZM Tech’s indicative quotes.',
    sections: [
      {
        heading: '1. Acceptance',
        paragraphs: [
          'By accessing zmtechdev.com you accept these terms. If you disagree, do not use the site. Commercial language may be Spanish or English depending on the version you visit; in case of doubt, the reasonable commercial meaning of both versions applies.',
        ],
      },
      {
        heading: '2. The site and its content',
        paragraphs: [
          'The site presents information about ZM Tech, product verticals, integrations, and indicative quote tools. Texts, prices, and timelines shown are referential and may change without prior notice.',
          'Marks, typography, UI code, copy, and isotype are owned by ZM Tech or its licensors. You may not copy or use them without written permission.',
        ],
      },
      {
        heading: '3. Quotes and proposals',
        paragraphs: [
          'The public quote builder and on-site estimates are not a binding offer or contract. A formal commercial proposal (for example under /propuesta/…) is also not a contract until both parties agree in writing on scope, price, and terms.',
          'USD prices and delivery times are estimates; final scope is set in negotiation and the corresponding services agreement.',
        ],
      },
      {
        heading: '4. Contact and acceptable use',
        paragraphs: [
          'By submitting a form or message (email, WhatsApp, or other channel) you state that the information is accurate and that you may be contacted for commercial purposes related to your request.',
          'You may not use the site for spam, abuse, unauthorized access attempts, aggressive scraping, or other illegal activity that harms ZM Tech or third parties.',
        ],
      },
      {
        heading: '5. Third-party links and services',
        paragraphs: [
          'The site may link to or integrate third-party services (for example WhatsApp, social networks, or infrastructure providers). Those services have their own policies; we do not control their content or availability.',
        ],
      },
      {
        heading: '6. Limitation of liability',
        paragraphs: [
          'The site is provided “as is.” To the extent permitted by applicable law, ZM Tech is not liable for indirect damages, lost profits, or interruptions arising from use of—or inability to use—the site or merely indicative information published on it.',
          'A contractual relationship for a software project is governed by the specific agreement signed or accepted by the parties, not solely by these website terms.',
        ],
      },
      {
        heading: '7. Governing law',
        paragraphs: [
          'Unless otherwise agreed in writing, these terms are interpreted under the laws of the Bolivarian Republic of Venezuela. For disputes related only to use of the site, the parties will first seek an amicable resolution.',
        ],
      },
      {
        heading: '8. Contact',
        paragraphs: [
          'Questions about these terms: albertoorta.1@gmail.com · +58 414 494 0417 · https://zmtechdev.com',
        ],
      },
    ],
  },
  metadata: {
    title: 'ZM Tech | Software Engineering at AI Speed',
    description:
      'We build your App/Web with industrial precision and smart 24/7 support. From idea to market in record time.',
    keywords:
      'software development Latin America, AI for business, industrial software engineering, LATAM SaaS',
  },
  metadataCotizador: {
    title: 'Quote Builder — ZM Tech',
    description:
      'Pick what your business needs, see the price instantly, and confirm with us on WhatsApp.',
    keywords: 'software quote, web budget, ZM Tech',
  },
  cotizadorPage: {
    title: 'Quote Builder — ZM Tech',
    description:
      'Pick what your business needs, see the price instantly, and confirm with us on WhatsApp.',
    heading: 'Build your proposal',
    subheading: 'Check what you need, see the price, and message us on WhatsApp when you are ready.',
    niveles: {
      0: { titulo: 'So people can find you', tecnico: 'Digital presence' },
      1: { titulo: 'Your page or website', tecnico: 'Web' },
      2: { titulo: 'App to run your business', tecnico: 'Operations' },
      3: { titulo: 'System for multiple locations or brands', tecnico: 'SaaS' },
    },
    enterpriseTitle: 'Full custom system',
    enterpriseTecnico: 'Company / multiple areas',
    enterpriseHeading: 'Need something bigger?',
    enterpriseBody:
      'If you need a full custom system (multiple areas of the company), book a call and we will scope it together. That is not a checkbox flow.',
    enterpriseCta: 'Book a call',
    enterpriseWaMsg: [
      'Hi, I want to book a call.',
      '',
      'I need a full custom system for several areas of the company.',
    ],
    totalLabel: 'Your total',
    emptyTotal: 'Check what you need above to see the price.',
    subtotal: 'Subtotal',
    comboSavings: 'Combo savings',
    total: 'Total',
    nameLabel: 'Your name (optional)',
    namePlaceholder: 'What should we call you?',
    waTitle: 'Ready to start?',
    waSubtitle: 'We send the details on WhatsApp. Fast replies during Venezuela business hours.',
    waButton: 'Confirm proposal on WhatsApp',
    emptyCta: 'Check what you need to message us on WhatsApp',
    footer: 'ZM Tech Quote Builder · zmtechdev.com',
    perMonth: '/mo',
  },
}
