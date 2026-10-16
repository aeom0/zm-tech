/** Copy legal de la plataforma GeemaStudio (español LATAM neutro). */

export type LegalSection = {
  heading: string
  paragraphs: string[]
  /** Ancla opcional (p. ej. datos de usuario). */
  id?: string
}

export type LegalPage = {
  title: string
  lastUpdated: string
  backHome: string
  metaDescription: string
  sections: LegalSection[]
}

export const LEGAL_PRIVACY_LABEL = 'Privacidad'
export const LEGAL_TERMS_LABEL = 'Términos'

export const privacyPage: LegalPage = {
  title: 'Política de Privacidad',
  lastUpdated: 'Última actualización: 15 de octubre de 2026',
  backHome: 'Volver al inicio',
  metaDescription:
    'Cómo GeemaStudio (ZM Tech) trata datos personales de cuentas, negocios y clientas en la plataforma.',
  sections: [
    {
      heading: '1. Quiénes somos',
      paragraphs: [
        'GeemaStudio es un software como servicio (SaaS) operado por ZM Tech (“nosotros”). Sitio de la plataforma: https://geema.zmtechdev.com. Responsable del tratamiento de los datos de la cuenta de plataforma: Alberto Orta · soporte@zmtechdev.com · WhatsApp: +58 414 494 0417.',
        'Cada salón o negocio que usa GeemaStudio (el “tenant”) es responsable del tratamiento de los datos de sus clientas y de la información que carga en su cuenta. ZM Tech actúa como encargado o proveedor tecnológico respecto de esos datos, bajo las instrucciones del tenant y estas políticas.',
      ],
    },
    {
      id: 'datos',
      heading: '2. Datos de usuarios (categorías)',
      paragraphs: [
        'Dueño y personal del negocio: nombre, correo, contraseña (almacenada de forma segura por el proveedor de autenticación), rol, foto o avatar opcionales, tokens de notificación push y preferencias de la cuenta.',
        'Datos del negocio: nombre comercial, país, moneda, zona horaria, horarios, colores de marca, configuración de WhatsApp Business (WABA), planes y estado de prueba o suscripción.',
        'Clientas y operación del salón (cargados o generados por el tenant): nombre, teléfono, documento u otros identificadores que el negocio registre, citas, servicios, pagos o comprobantes, notas e imágenes de referencia asociadas a la atención.',
        'Mensajería WhatsApp: números, nombres de perfil, textos, medios e metadatos técnicos necesarios para operar el bot y las campañas que el tenant active. El procesamiento puede incluir modelos de lenguaje (por ejemplo Anthropic) para atender o clasificar mensajes, siempre en el contexto del servicio contratado.',
        'Visitantes de páginas públicas del tenant (por ejemplo /s/[slug]): datos técnicos habituales de navegación (IP, navegador, páginas) a través del hosting, y los datos que la persona envíe voluntariamente al reservar o contactar.',
      ],
    },
    {
      heading: '3. Para qué los usamos',
      paragraphs: [
        'Prestamos y mejoramos el servicio (agenda, panel, app, finanzas, inventario, presencia web y WhatsApp), autenticamos cuentas, enviamos códigos de verificación y avisos operativos, damos soporte y cumplimos obligaciones legales.',
        'No vendemos datos personales ni los usamos para publicidad de terceros ajenos a GeemaStudio.',
      ],
    },
    {
      heading: '4. Con quién los compartimos',
      paragraphs: [
        'Proveedores que nos ayudan a operar la plataforma bajo nuestras instrucciones: hosting y CDN (Vercel), base de datos y autenticación (Supabase), mensajería WhatsApp / Meta cuando el tenant conecta WABA, procesamiento de lenguaje (Anthropic) cuando aplica al bot, y correo transaccional si se usa para verificación o avisos.',
        'Podemos divulgar información si la ley o una autoridad competente lo exige. Los datos de clientas del salón también pueden estar sujetos a las políticas propias del negocio (por ejemplo en su dominio o libro de reclamaciones, cuando exista).',
      ],
    },
    {
      heading: '5. Conservación',
      paragraphs: [
        'Conservamos los datos mientras la cuenta esté activa y el tiempo adicional necesario para operar el servicio, resolver incidencias, cumplir la ley o atender solicitudes de eliminación. El tenant puede borrar o corregir datos de sus clientas desde el panel, según las funciones disponibles.',
      ],
    },
    {
      heading: '6. Tus derechos',
      paragraphs: [
        'Si eres dueño o personal con cuenta en GeemaStudio, puedes solicitar acceso, corrección o eliminación de tus datos de cuenta escribiendo a soporte@zmtechdev.com. Responderemos en un plazo razonable.',
        'Si eres clienta de un salón, dirige primero tu solicitud al negocio que te atiende (ellos son el responsable de tus datos de cita y contacto). Si necesitas ayuda para contactarlos a través de la plataforma, escríbenos al mismo correo.',
      ],
    },
    {
      heading: '7. Seguridad y menores',
      paragraphs: [
        'Aplicamos medidas técnicas y organizativas razonables (control de acceso, cifrado en tránsito, políticas de base de datos). Ningún sistema es 100 % seguro.',
        'La plataforma está dirigida a negocios y personas mayores de 18 años. No recolectamos datos de menores de forma consciente.',
      ],
    },
    {
      heading: '8. Cambios',
      paragraphs: [
        'Podemos actualizar esta política. La fecha de “Última actualización” indica la versión vigente. El uso continuado del servicio tras un cambio implica que tomaste nota de la nueva versión.',
      ],
    },
  ],
}

export const termsPage: LegalPage = {
  title: 'Términos y Condiciones',
  lastUpdated: 'Última actualización: 15 de octubre de 2026',
  backHome: 'Volver al inicio',
  metaDescription:
    'Condiciones de uso de GeemaStudio, el SaaS de gestión para salones y negocios de belleza en LATAM.',
  sections: [
    {
      heading: '1. Aceptación',
      paragraphs: [
        'Al crear una cuenta, completar el registro o usar GeemaStudio (web, panel, app o integraciones) aceptas estos términos. Si no estás de acuerdo, no uses el servicio.',
      ],
    },
    {
      heading: '2. El servicio',
      paragraphs: [
        'GeemaStudio es una plataforma multi-tenant para gestionar agenda, personal, servicios, clientas, finanzas, inventario, presencia web y, cuando esté habilitado, WhatsApp Business. Las funciones disponibles dependen del plan, la configuración del negocio y el estado de las integraciones.',
        'Los periodos de prueba, precios y características publicadas son referenciales y pueden cambiar; el alcance contratado se confirma en el flujo de alta o en el acuerdo comercial correspondiente.',
      ],
    },
    {
      heading: '3. Cuentas y uso aceptable',
      paragraphs: [
        'Debes proporcionar información veraz, mantener la confidencialidad de tu contraseña y ser responsable de la actividad en tu cuenta y en la de tu personal.',
        'No está permitido usar el servicio para spam, abuso de mensajería, acceso no autorizado, interferir con la plataforma, vulnerar políticas de Meta/WhatsApp u otras actividades ilegales o que perjudiquen a ZM Tech, a otros tenants o a terceros.',
      ],
    },
    {
      heading: '4. Contenido del negocio y clientas',
      paragraphs: [
        'El tenant conserva la titularidad de los datos y contenidos que carga (catálogo, clientas, mensajes, marca). Nos otorgas una licencia limitada para alojarlos y procesarlos solo con el fin de prestar el servicio.',
        'Eres responsable de contar con la base legal y los consentimientos necesarios frente a tus clientas (citas, WhatsApp, imágenes, marketing), y de cumplir la normativa de tu país (incluido, cuando aplique, el libro de reclamaciones u otras obligaciones locales).',
      ],
    },
    {
      heading: '5. WhatsApp e inteligencia artificial',
      paragraphs: [
        'Si conectas WhatsApp Business API, también aplican los términos y políticas de Meta. El uso indebido del canal puede causar suspensión por parte de Meta o de la plataforma.',
        'Algunas funciones pueden usar modelos de IA para redactar o clasificar mensajes. Esas salidas son asistencia operativa; el tenant sigue siendo responsable de la atención final a la clienta.',
      ],
    },
    {
      heading: '6. Limitación de responsabilidad',
      paragraphs: [
        'El servicio se ofrece “tal cual”, dentro de la disponibilidad razonable de internet y de terceros (Supabase, Vercel, Meta, etc.). En la medida permitida por la ley aplicable, ZM Tech no responde por daños indirectos, lucro cesante o interrupciones derivadas del uso o la imposibilidad de uso de la plataforma.',
        'Una relación comercial distinta (proyecto a medida, SLA especial) se rige por el acuerdo escrito entre las partes, no solo por estos términos.',
      ],
    },
    {
      heading: '7. Ley aplicable',
      paragraphs: [
        'Salvo pacto distinto por escrito, estos términos se interpretan de conformidad con las leyes de la República Bolivariana de Venezuela. Para controversias relacionadas con el uso de la plataforma, las partes procurarán primero una solución amistosa.',
      ],
    },
    {
      heading: '8. Contacto',
      paragraphs: [
        'Consultas sobre estos términos: soporte@zmtechdev.com · +58 414 494 0417 · https://geema.zmtechdev.com · https://zmtechdev.com',
      ],
    },
  ],
}
