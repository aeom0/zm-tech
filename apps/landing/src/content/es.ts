import type { Messages } from './messages'

export const es: Messages = {
  nav: {
    links: [
      { label: 'VERTICALES', href: '#verticales' },
      { label: 'VENTAJAS', href: '#ventajas' },
      { label: 'INTEGRACIONES', href: '#integraciones' },
      { label: 'COTIZADOR', href: '#cotizador' },
      { label: 'PROTOCOLOS FRECUENTES', href: '#faq' },
    ],
    cta: 'Habla con nosotros',
    openMenu: 'Abrir menú',
  },
  hero: {
    badge: 'Tu próxima app empieza aquí',
    h1Lines: ['Ingeniería de', 'Software a', 'Velocidad de IA'],
    paragraph:
      'Convertimos tu idea en software real. Rápido, elegante y listo para crecer contigo desde el primer día.',
    ctaPrimary: 'COTIZAR PROYECTO →',
    ctaSecondary: 'VER ECOSISTEMA',
    imageAlt: 'Código de ingeniería de software',
    statusLabel: 'Proyectos activos',
    statusValue: '3 verticales en producción',
  },
  trust: {
    before: 'Tecnología probada en la industria',
    cosmetic: 'cosmética',
    and: 'y',
    sports: 'deportiva',
    after: '(',
    mlb: 'MLB Standards',
  },
  verticals: {
    eyebrow: 'ECOSISTEMA',
    title: 'Verticales ZM',
    items: {
      industrial: {
        title: 'ZM Industrial Core',
        description:
          'Controla tu empresa desde una sola pantalla. Inventario, logística, producción y reportes en tiempo real — diseñado para negocios que no pueden darse el lujo de fallar.',
      },
      beauty: {
        title: 'ZM Beauty Engine',
        description:
          'Tu spa o estética merece tecnología de primera. Agenda online, historial de clientes, punto de venta y recordatorios automáticos — todo en una app que tu equipo va a querer usar.',
      },
      workshop: {
        title: 'ZM Workshop & Parts',
        description:
          'Vende repuestos, gestiona tu taller y atiende más clientes sin caos. Catálogo digital, órdenes de trabajo y seguimiento de inventario en un solo lugar.',
      },
    },
  },
  features: {
    eyebrow: 'MOTOR ZM',
    title: 'Por qué ZM Tech',
    intro:
      'No somos una agencia más. Somos el equipo técnico que tu negocio necesitaba — sin los costos de tener uno propio.',
    items: {
      speed: {
        title: 'Tu equipo trabaja más rápido',
        description:
          'Eliminamos los procesos que frenan tu negocio. Interfaces limpias, flujos directos y cero pasos innecesarios para que tu gente se enfoque en lo que importa.',
      },
      support: {
        title: 'Soporte que no te abandona',
        description:
          'No desaparecemos después del lanzamiento. Monitoreamos tu sistema 24/7, resolvemos problemas antes de que los notes y mejoramos el software con el tiempo.',
      },
      scale: {
        title: 'Crece sin romper nada',
        description:
          'Construimos pensando en el futuro. Tu plataforma aguanta desde tus primeros clientes hasta miles de usuarios, sin necesidad de rehacer todo desde cero.',
      },
      ownership: {
        title: 'El código es tuyo, punto',
        description:
          'Transparencia total desde el día uno. El código fuente, los datos y la infraestructura te pertenecen a ti — sin licencias trampa ni dependencias de por vida.',
      },
    },
  },
  integrations: {
    eyebrow: 'Ecosistema Conectado',
    title: 'Tu negocio conectado con todo',
    subtitle:
      'Integramos tu software con las herramientas que ya usas — y las que necesitas para crecer en el mercado venezolano y latinoamericano.',
    items: {
      mercadolibre: {
        category: 'E-commerce',
        description:
          'Sincroniza tu catálogo, gestiona órdenes y actualiza stock en tiempo real desde tu sistema — sin abrir MercadoLibre manualmente.',
      },
      cashea: {
        category: 'Pagos en cuotas',
        description:
          'Muestra las cuotas Cashea en tu tienda o sistema. Tus clientes ven al instante cuánto pagan por semana — y eso cierra más ventas.',
      },
      whatsapp: {
        category: 'Comunicación',
        description:
          'Confirmaciones de cita, alertas de pedido, recordatorios automáticos y atención al cliente — todo desde WhatsApp sin intervención humana.',
      },
      stripe: {
        category: 'Pagos globales',
        description:
          'Cobra en dólares, euros o cualquier moneda con tarjeta o link de pago. Ideal para negocios con clientes internacionales o en la diáspora.',
      },
      bcv: {
        category: 'Finanzas Venezuela',
        description:
          'Tasa oficial del BCV actualizada automáticamente en tu sistema. Precios en bolívares siempre correctos, sin actualizarlos a mano cada día.',
      },
      seniat: {
        category: 'Fiscal',
        description:
          'Facturas y notas de entrega conformes con el Art. 177 del SENIAT. Tu negocio en regla sin perder tiempo llenando formularios a mano.',
      },
      calendar: {
        category: 'Agenda',
        description:
          'Citas y reservas sincronizadas con Google Calendar en tiempo real. Tu equipo ve su agenda actualizada sin usar otra app aparte.',
      },
      telegram: {
        category: 'Notificaciones',
        description:
          'Alertas instantáneas a tu equipo o clientes vía Telegram. Nuevas ventas, errores del sistema, recordatorios — todo llega al instante.',
      },
      meta: {
        category: 'Marketing',
        description:
          'Conecta tu catálogo de productos directamente con Instagram Shopping y Meta Ads. Más alcance, sin trabajo extra de tu parte.',
      },
      auth: {
        category: 'Seguridad',
        description:
          'Ingreso seguro con correo, Google o enlace mágico. Control de acceso por usuario para que cada quien vea solo lo que le corresponde.',
      },
    },
  },
  cotizadorHome: {
    eyebrow: 'Herramienta',
    title: 'Cotizador Instantáneo',
    subtitle: 'Obtén un estimado real en menos de 60 segundos',
    step1: '01 — ¿Qué necesitas?',
    step2: '02 — Nivel de diseño',
    step3: '03 — Plan de soporte mensual',
    tabPacks: 'Packs mensuales',
    tabExtras: 'Extras à la carte',
    cancelAnytime: 'Sin contrato mínimo · Cancela cuando quieras',
    extrasNote: 'Pago único · Se suman al precio del proyecto',
    estimateLabel: 'Tu estimado',
    initialInvestment: 'Inversión inicial (único)',
    planPrefix: 'Plan',
    perMonth: '/mes',
    extrasLabel: 'Extras',
    extrasUnique: 'USD único',
    typeLabel: 'Tipo',
    designLabel: 'Diseño',
    deliveryLabel: 'Entrega est.',
    trust: [
      '✓ 50% anticipo · 50% entrega',
      '✓ Código fuente 100% tuyo',
      '✓ Cancela el plan cuando quieras',
      '✓ Tecnología de primer nivel',
    ],
    cta: 'Quiero esta propuesta',
    emptyTitle: 'Elige el tipo de proyecto\npara ver tu estimado',
    emptyHints: ['→ Sin compromiso', '→ Respuesta en menos de 24h', '→ Ajustable a tu presupuesto'],
    tipos: {
      landing: {
        label: 'Landing Page',
        desc: 'Una página, orientada a conversión',
        dias: '3–5 días',
      },
      corporativa: {
        label: 'Sitio Corporativo',
        desc: 'Multi-sección, portafolio o empresa',
        dias: '7–14 días',
      },
      ecommerce: {
        label: 'E-commerce',
        desc: 'Tienda online con catálogo y pagos',
        dias: '14–21 días',
      },
      saas: {
        label: 'Aplicación Web',
        desc: 'Panel de control, acceso por usuario y lógica de negocio',
        dias: '21–45 días',
      },
    },
    disenios: {
      template: 'Plantilla adaptada',
      custom: 'Personalizado',
      premium: 'Diseño premium',
    },
    packs: {
      arranque: {
        label: 'Arranque',
        badge: null,
        tagline: 'Para el negocio que está arrancando en digital',
        includes: [
          'Hosting + dominio incluido',
          'Formulario de leads',
          'SEO on-page básico',
          'Soporte WhatsApp (48h)',
          '1 actualización de contenido/mes',
        ],
      },
      negocio: {
        label: 'Negocio',
        badge: 'MÁS POPULAR',
        tagline: 'Para la empresa que ya vende y quiere vender más',
        includes: [
          'Todo lo del Plan Arranque',
          'Tasa BCV actualizada a diario',
          'WhatsApp Business automatizado',
          'Telegram Bot de alertas',
          'Soporte prioritario (24h)',
          '2 actualizaciones de contenido/mes',
        ],
      },
      enterprise: {
        label: 'Enterprise',
        badge: null,
        tagline: 'Para operaciones serias que no pueden fallar',
        includes: [
          'Todo lo del Plan Negocio',
          'Facturación SENIAT automática',
          'Acceso seguro por usuario y roles',
          'Google Calendar sincronizado',
          'Monitoreo 24/7 + backups diarios',
          'Soporte dedicado (4h)',
          'Actualizaciones ilimitadas',
        ],
      },
    },
    extraGroups: [
      {
        category: 'Integraciones de pago',
        color: 'text-blue-400',
        items: [
          {
            id: 'stripe',
            label: 'Stripe',
            desc: 'Cobros en dólares o euros con tarjeta y link de pago. Ideal para la diáspora.',
            price: 45,
          },
          {
            id: 'cashea',
            label: 'Visor de cuotas Cashea',
            desc: 'Muestra las cuotas al instante en tu tienda — más claridad para el cliente, más ventas.',
            price: 30,
          },
        ],
      },
      {
        category: 'Ecosistema Venezuela',
        color: 'text-red-400',
        items: [
          {
            id: 'mercadolibre',
            label: 'MercadoLibre',
            desc: 'Catálogo, stock y órdenes sincronizados en tiempo real desde tu sistema.',
            price: 60,
          },
          {
            id: 'seniat',
            label: 'Facturación SENIAT',
            desc: 'Facturas Art. 177 generadas automáticamente. Requiere Plan Enterprise.',
            price: 65,
            requiresPack: 'enterprise',
          },
        ],
      },
      {
        category: 'Marketing & Ventas',
        color: 'text-pink-400',
        items: [
          {
            id: 'meta',
            label: 'Catálogo Meta / Instagram',
            desc: 'Productos sincronizados con Instagram Shopping y Meta Ads.',
            price: 40,
          },
          {
            id: 'seo',
            label: 'SEO on-page avanzado',
            desc: 'Auditoría completa, keywords, schema markup y optimización técnica.',
            price: 30,
          },
        ],
      },
      {
        category: 'Técnico',
        color: 'text-violet-400',
        items: [
          {
            id: 'auth',
            label: 'Acceso seguro + Roles',
            desc: 'Ingreso con correo o Google y control de acceso por usuario.',
            price: 50,
          },
          {
            id: 'form',
            label: 'Formulario de leads',
            desc: 'Captura de contactos con validación, email y guardado en BD.',
            price: 20,
          },
        ],
      },
    ],
  },
  contact: {
    title: '¿Tienes un proyecto en mente?',
    subtitle:
      'Cuéntanos qué necesitas. Te respondemos en menos de 24 horas con una propuesta concreta.',
    labelNombre: 'NOMBRE / OPERADOR',
    labelEmpresa: 'EMPRESA / ORGANIZACIÓN',
    labelWhatsapp: 'ENLACE COM (WHATSAPP)',
    labelPresupuesto: 'PRESUPUESTO ESTIMADO (USD)',
    placeholderNombre: 'John Doe',
    placeholderEmpresa: 'Acme Corp',
    placeholderWhatsapp: '+58 412 000 0000',
    placeholderPresupuesto: 'Ej: $150 - $400',
    submit: 'Quiero mi cotización →',
    submitting: 'PROCESANDO...',
    successTitle: '✓ PAYLOAD RECIBIDO — CONEXIÓN ESTABLECIDA',
    successSubtitle: '¡Listo! Te escribimos en menos de 24h',
    errorSend: 'Hubo un error al enviar. Intenta de nuevo o escríbenos directamente por WhatsApp.',
    validationNombre: 'El nombre debe tener al menos 2 caracteres',
    validationEmpresa: 'La empresa debe tener al menos 2 caracteres',
    validationWhatsapp: 'Ingresa un número válido',
    validationPresupuesto: 'Selecciona un presupuesto estimado',
  },
  faq: {
    eyebrow: 'BASE DE CONOCIMIENTO',
    title: 'Protocolos Frecuentes',
    subtitle: 'Todo lo que necesitas saber antes de empezar',
    items: [
      {
        question: '¿El código me pertenece a mí o a ZM Tech?',
        answer:
          'Tuyo 100%. Al cerrar el proyecto, te entregamos el código completo, las claves de acceso al servidor y la documentación. No hay letras chiquitas, no hay dependencia de nosotros para que tu sistema funcione.',
      },
      {
        question: '¿Qué pasa después de que lancen mi app?',
        answer:
          'No desaparecemos. Ofrecemos planes de mantenimiento donde monitoreamos tu sistema, resolvemos errores y vamos mejorando el software con el tiempo — con soporte de IA que detecta problemas antes de que tú los notes.',
      },
      {
        question: '¿Cuánto tarda en estar lista mi aplicación?',
        answer:
          'Depende del proyecto, pero gracias a nuestra metodología de trabajo, una primera versión funcional puede estar lista en 4 a 6 semanas. Mucho menos que el promedio del mercado, sin sacrificar calidad.',
      },
      {
        question: '¿Solo trabajan con ciertas industrias?',
        answer:
          'Tenemos verticales especializadas en Industria, Belleza y Automotriz, pero nos adaptamos a cualquier negocio que necesite software serio. Si tienes un problema real, nosotros tenemos la solución.',
      },
    ],
  },
  footer: {
    blurb:
      'Hacemos realidad las ideas de negocios que necesitan software a medida. Rápido, robusto y con soporte real.',
    solutionsTitle: 'Nuestras soluciones',
    followTitle: 'Síguenos',
    rights: 'Todos los derechos reservados.',
    madeIn: 'Hecho con cuidado en Venezuela',
    homeAria: 'Ir al inicio',
  },
  metadata: {
    title: 'ZM Tech | Ingeniería de Software a Velocidad de IA',
    description:
      'Desarrollamos tu App/Web con precisión industrial y soporte inteligente 24/7. De la idea al mercado en tiempo récord.',
    keywords:
      'desarrollo de software Venezuela, IA aplicada a negocios, ingeniería industrial software, LATAM SaaS',
  },
  metadataCotizador: {
    title: 'Cotizador — ZM Tech',
    description:
      'Elige lo que necesita tu negocio, mira el precio al momento y confírmanos por WhatsApp.',
    keywords: 'cotizador software, presupuesto web, ZM Tech',
  },
  cotizadorPage: {
    title: 'Cotizador — ZM Tech',
    description:
      'Elige lo que necesita tu negocio, mira el precio al momento y confírmanos por WhatsApp.',
    heading: 'Arma tu propuesta',
    subheading:
      'Marca lo que necesitas, mira cuánto sale y escríbenos por WhatsApp cuando estés listo.',
    niveles: {
      0: { titulo: 'Para que te encuentren', tecnico: 'Presencia digital' },
      1: { titulo: 'Tu página o sitio web', tecnico: 'Web' },
      2: { titulo: 'App para manejar tu negocio', tecnico: 'Gestión' },
      3: { titulo: 'Sistema para varios locales o marcas', tecnico: 'SaaS' },
    },
    enterpriseTitle: 'Sistema completo a la medida',
    enterpriseTecnico: 'Empresa / varias áreas',
    enterpriseHeading: '¿Necesitas algo más grande?',
    enterpriseBody:
      'Si necesitas un sistema completo a la medida (varias áreas de la empresa), agenda una llamada y lo vemos juntos. Eso no se arma con checkboxes.',
    enterpriseCta: 'Agendar una llamada',
    enterpriseWaMsg: [
      'Hola, quiero agendar una llamada.',
      '',
      'Necesito un sistema completo a la medida para varias áreas de la empresa.',
    ],
    totalLabel: 'Tu total',
    emptyTotal: 'Marca lo que necesitas arriba para ver el precio.',
    subtotal: 'Suma',
    comboSavings: 'Ahorro del combo',
    total: 'Total',
    nameLabel: 'Tu nombre (opcional)',
    namePlaceholder: '¿Cómo te llamas?',
    waTitle: '¿Listo para arrancar?',
    waSubtitle:
      'Te mandamos el detalle por WhatsApp. Respondemos rápido en horario de Venezuela.',
    waButton: 'Confirmar propuesta por WhatsApp',
    emptyCta: 'Marca lo que necesitas para escribirnos por WhatsApp',
    footer: 'Cotizador ZM Tech · zmtechdev.com',
    perMonth: '/mes',
  },
}
