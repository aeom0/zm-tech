import type { Messages } from './messages'

export const es: Messages = {
  nav: {
    links: [
      { label: 'VERTICALES', href: '#verticales' },
      { label: 'VENTAJAS', href: '#ventajas' },
      { label: 'COTIZADOR', href: '#cotizador' },
      { label: 'PROTOCOLOS', href: '#faq' },
    ],
    cta: 'Habla con nosotros',
    openMenu: 'Abrir menú',
  },
  hero: {
    badge: '¿Tu negocio se gestiona por WhatsApp y Excel?',
    h1Lines: ['Ingeniería de', 'Software a', 'Velocidad de IA'],
    paragraph:
      'Construimos el sistema que te saca de ahí. Real, en producción, funcionando hoy — no una promesa.',
    ctaPrimary: 'COTIZAR PROYECTO →',
    ctaSecondary: 'VER ECOSISTEMA',
    imageAlt: 'Sistemas ZM Tech en producción: panel gerencial, agenda y ventas',
    laptopAlts: [
      'Panel gerencial genérico — control de ventas e inventario',
      'Sitio web de salón genérico — servicios y reserva',
      'Panel de taller genérico — órdenes de servicio y técnicos',
    ],
    phoneAlts: [
      'App de ventas genérica — pedidos y comisiones del día',
      'Agenda móvil genérica — citas del salón',
      'App de técnico genérica — órdenes de servicio del día',
    ],
    statusLabel: 'Proyectos activos',
    statusValue: '3 verticales en producción',
  },
  trust: {
    label: 'Sistemas en producción',
    brands: ['ZetaEme', 'ZM Lash & Nails', 'ZM Tech Cotizador'],
  },
  proof: {
    eyebrow: 'CASO REAL',
    beforeLabel: 'Antes',
    beforeValue: 'WhatsApp + Excel',
    afterLabel: 'Ahora',
    afterValue: 'Sistema en producción',
    quote:
      'De chats y hojas sueltas a un panel gerencial con ventas, inventario y tasas BCV — corriendo hoy.',
    attribution: 'ZetaEme Cosméticos · vertical industrial',
  },
  verticals: {
    eyebrow: 'ECOSISTEMA',
    title: 'Verticales ZM',
    previewBadge: 'Vista previa',
    items: {
      industrial: {
        title: 'ZM Industrial Core',
        description:
          'Controla tu empresa desde una sola pantalla. Inventario, logística, producción y reportes en tiempo real — diseñado para negocios que no pueden darse el lujo de fallar.',
        cta: 'Cotizar esta vertical',
      },
      beauty: {
        title: 'ZM Beauty Engine',
        description:
          'Tu spa o estética merece tecnología de primera. Agenda online, historial de clientes, punto de venta y recordatorios automáticos — todo en una app que tu equipo va a querer usar.',
        cta: 'Cotizar esta vertical',
      },
      workshop: {
        title: 'ZM Workshop & Parts',
        description:
          'Vende repuestos, gestiona tu taller y atiende más clientes sin caos. Catálogo digital, órdenes de trabajo y seguimiento de inventario en un solo lugar.',
        cta: 'Cotizar esta vertical',
      },
    },
  },
  features: {
    eyebrow: 'MOTOR ZM',
    title: 'Por qué ZM Tech',
    intro:
      'No somos una agencia más. Somos el equipo técnico que tu negocio necesitaba — sin los costos de tener uno propio.',
    proof: [
      { value: '3', label: 'Verticales en producción' },
      { value: '<30d', label: 'Entregas típicas' },
      { value: '100%', label: 'Código tuyo' },
    ],
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
    title: 'Arma tu propuesta en minutos',
    subtitle:
      'Marca lo que necesitas, mira el estimado y escríbenos por WhatsApp cuando estés listo — sin formularios eternos.',
    trust: ['Sin compromiso', 'Respuesta en menos de 24h', 'Ajustable a tu presupuesto'],
    cta: 'ABRIR COTIZADOR →',
    secondaryNote: 'El cotizador completo abre en una página dedicada.',
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
    privacy: 'Privacidad',
    terms: 'Términos',
  },
  privacy: {
    title: 'Política de Privacidad',
    lastUpdated: 'Última actualización: 30 de julio de 2026',
    backHome: 'Volver al inicio',
    metaDescription: 'Cómo ZM Tech recolecta, usa y protege los datos personales en zmtechdev.com.',
    sections: [
      {
        heading: '1. Quiénes somos',
        paragraphs: [
          'ZM Tech (“nosotros”) opera el sitio zmtechdev.com y los servicios asociados de cotización y contacto. Responsable del tratamiento: Alberto Orta · contacto: albertoorta.1@gmail.com · WhatsApp: +58 414 494 0417.',
        ],
      },
      {
        heading: '2. Datos que recolectamos',
        paragraphs: [
          'Cuando usas el formulario de contacto o el cotizador público, podemos recibir: nombre, empresa u organización, número de WhatsApp, presupuesto estimado, servicios seleccionados y el mensaje que envíes.',
          'También pueden generarse datos técnicos habituales de navegación (dirección IP, tipo de navegador, páginas visitadas) a través del hosting (Vercel) con fines de seguridad, rendimiento y diagnóstico.',
        ],
      },
      {
        heading: '3. Para qué los usamos',
        paragraphs: [
          'Respondemos a tus solicitudes de información o cotización, damos seguimiento comercial por correo o WhatsApp, y mejoramos el sitio y nuestros procesos internos.',
          'No vendemos tus datos personales ni los usamos para publicidad de terceros.',
        ],
      },
      {
        heading: '4. Con quién los compartimos',
        paragraphs: [
          'Proveedores que nos ayudan a operar el sitio, bajo instrucciones nuestras: hosting y CDN (Vercel), base de datos y backend (Supabase, proyecto de leads de la landing), envío de correo transaccional (Resend) y mensajería cuando tú inicias el contacto (WhatsApp).',
          'Podemos divulgar información si la ley o una autoridad competente lo exige.',
        ],
      },
      {
        heading: '5. Conservación',
        paragraphs: [
          'Conservamos los leads el tiempo necesario para atender la solicitud y el seguimiento comercial razonable, o hasta que pidas su eliminación, salvo obligaciones legales de retención.',
        ],
      },
      {
        heading: '6. Tus derechos',
        paragraphs: [
          'Puedes solicitar acceso, corrección o eliminación de tus datos personales escribiendo a albertoorta.1@gmail.com. Responderemos en un plazo razonable.',
        ],
      },
      {
        heading: '7. Seguridad y menores',
        paragraphs: [
          'Aplicamos medidas técnicas y organizativas razonables; ningún sistema es 100 % seguro. El sitio no está dirigido a menores de 18 años; no recolectamos datos de menores de forma consciente.',
        ],
      },
      {
        heading: '8. Cambios',
        paragraphs: [
          'Podemos actualizar esta política. La fecha de “Última actualización” indica la versión vigente. El uso continuado del sitio tras un cambio implica que tomaste nota de la nueva versión.',
        ],
      },
    ],
  },
  terms: {
    title: 'Términos y Condiciones',
    lastUpdated: 'Última actualización: 30 de julio de 2026',
    backHome: 'Volver al inicio',
    metaDescription:
      'Condiciones de uso del sitio zmtechdev.com y de las cotizaciones orientativas de ZM Tech.',
    sections: [
      {
        heading: '1. Aceptación',
        paragraphs: [
          'Al acceder a zmtechdev.com aceptas estos términos. Si no estás de acuerdo, no uses el sitio. El idioma de referencia comercial puede ser español o inglés según la versión que visites; en caso de duda prevalece el sentido comercial razonable de ambas.',
        ],
      },
      {
        heading: '2. El sitio y su contenido',
        paragraphs: [
          'El sitio presenta información sobre ZM Tech, verticales de producto, integraciones y herramientas de cotización orientativa. Textos, precios y plazos mostrados son referenciales y pueden cambiar sin aviso previo.',
          'Marcas, tipografías, código de interfaz, textos e isotipo son propiedad de ZM Tech o de sus licenciantes. No puedes copiarlos ni usarlos sin autorización escrita.',
        ],
      },
      {
        heading: '3. Cotizaciones y propuestas',
        paragraphs: [
          'El cotizador público y los estimados del sitio no constituyen oferta vinculante ni contrato. Una propuesta comercial formal (por ejemplo en /propuesta/…) tampoco es contrato hasta que ambas partes acuerden por escrito alcance, precio y condiciones.',
          'Los precios en USD y los tiempos de entrega son estimados; el alcance final se define en la negociación y en el acuerdo de servicios correspondiente.',
        ],
      },
      {
        heading: '4. Contacto y uso aceptable',
        paragraphs: [
          'Al enviar un formulario o mensaje (correo, WhatsApp u otro canal) declaras que la información es veraz y que puedes ser contactado para fines comerciales relacionados con tu solicitud.',
          'No está permitido usar el sitio para spam, abuso, intento de acceso no autorizado, scraping agresivo u otras actividades ilegales o que perjudiquen a ZM Tech o a terceros.',
        ],
      },
      {
        heading: '5. Enlaces y servicios de terceros',
        paragraphs: [
          'El sitio puede enlazar o integrar servicios de terceros (por ejemplo WhatsApp, redes o proveedores de infraestructura). Esos servicios tienen sus propias políticas; no controlamos su contenido ni su disponibilidad.',
        ],
      },
      {
        heading: '6. Limitación de responsabilidad',
        paragraphs: [
          'El sitio se ofrece “tal cual”. En la medida permitida por la ley aplicable, ZM Tech no responde por daños indirectos, lucro cesante o interrupciones derivadas del uso o la imposibilidad de uso del sitio o de información meramente orientativa publicada en él.',
          'La relación contractual por un proyecto de software se regirá por el acuerdo específico firmado o aceptado entre las partes, no solo por estos términos del sitio.',
        ],
      },
      {
        heading: '7. Ley aplicable',
        paragraphs: [
          'Salvo pacto distinto por escrito, estos términos se interpretan de conformidad con las leyes de la República Bolivariana de Venezuela. Para controversias relacionadas solo con el uso del sitio, las partes procurarán primero una solución amistosa.',
        ],
      },
      {
        heading: '8. Contacto',
        paragraphs: [
          'Consultas sobre estos términos: albertoorta.1@gmail.com · +58 414 494 0417 · https://zmtechdev.com',
        ],
      },
    ],
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
    waSubtitle: 'Te mandamos el detalle por WhatsApp. Respondemos rápido en horario de Venezuela.',
    waButton: 'Confirmar propuesta por WhatsApp',
    emptyCta: 'Marca lo que necesitas para escribirnos por WhatsApp',
    footer: 'Cotizador ZM Tech · zmtechdev.com',
    perMonth: '/mes',
  },
}
