// guia-ayuda.ts — Guía de uso de GeemaStudio (fuente única).
//
// La leen el Centro de Ayuda del panel web y el agente de soporte por WhatsApp
// (`support-webhook`, herramienta `ver_guia`). La Edge Function usa una copia
// idéntica en `apps/geemastudio-server/supabase/functions/_shared/guia-ayuda.ts`
// y un test falla si difieren: al editar este archivo, copiarlo allá.
// Todo cambio de producto que altere un flujo actualiza esta guía en el mismo PR.
// Sin imports: Deno y Next la compilan tal cual.

export type GuiaCategoria = 'agenda' | 'waba' | 'finanzas' | 'clientes' | 'configuracion'

export interface GuiaItem {
  id: string
  category: GuiaCategoria
  question: string
  answer: string
  link?: {
    href: string
    label: string
  }
}

export const GUIA_CATEGORIAS: { id: GuiaCategoria; label: string }[] = [
  { id: 'agenda', label: 'Agenda y Citas' },
  { id: 'waba', label: 'WhatsApp y asistente' },
  { id: 'finanzas', label: 'Finanzas y POS' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'configuracion', label: 'Configuración' },
]

export const GUIA_AYUDA: GuiaItem[] = [
  // Agenda y Citas
  {
    id: 'crear-cita',
    category: 'agenda',
    question: '¿Cómo creo o agendo una nueva cita?',
    answer:
      'Ve a la sección Agenda y pulsa sobre el horario deseado o el botón de agendar. Selecciona la clienta, el servicio o pack, la fecha, hora y el profesional que atenderá la cita.',
    link: { href: '/panel/agenda', label: 'Ir a Agenda' },
  },
  {
    id: 'cancelar-cita',
    category: 'agenda',
    question: '¿Cómo cancelo una cita y qué ocurre con el registro?',
    answer:
      'Al abrir el detalle de una cita, puedes pulsar «Cancelar cita». Se te pide un motivo y una observación opcional. La cita no se borra: queda cancelada para conservar el historial y las métricas.',
    link: { href: '/panel/agenda', label: 'Ver Agenda' },
  },
  {
    id: 'estados-cita',
    category: 'agenda',
    question: '¿Cuáles son los estados de una cita?',
    answer:
      'Una cita puede estar agendada, confirmada, completada, no asistió o cancelada. Cada estado actualiza los indicadores del día.',
  },

  // WhatsApp y asistente WABA
  {
    id: 'pausar-bot',
    category: 'waba',
    question: '¿Cómo atiendo a una clienta por WhatsApp sin que el asistente interfiera?',
    answer:
      'Entra a WhatsApp → Mensajes, abre la conversación con la clienta y pulsa el botón "Pausar asistente". A partir de ese momento, el asistente se detiene para ese número y tú puedes responder manualmente. Al terminar, pulsa "Reactivar asistente".',
    link: { href: '/panel/waba/mensajes', label: 'Ir a Mensajes de WhatsApp' },
  },
  {
    id: 'ventana-24h',
    category: 'waba',
    question: '¿Qué es la ventana de 24 horas de WhatsApp?',
    answer:
      'Por política oficial de Meta (WhatsApp Business), cuando una clienta escribe un mensaje se abre una ventana de atención de 24 horas en la que puedes enviar texto libre, fotos, audios y documentos sin costo adicional. Pasadas las 24 horas, solo se pueden enviar plantillas oficiales aprobadas por Meta.',
  },
  {
    id: 'respuestas-rapidas',
    category: 'waba',
    question: '¿Cómo utilizo las respuestas rápidas en el chat?',
    answer:
      'En la parte inferior de cualquier conversación tienes botones de acceso rápido: Saludo (con el nombre de la clienta), Agendar cita (con el enlace a tu web), Confirmar cita y Medios de pago (transferencias, efectivo y Yape/Plin). Al tocarlos, el texto se inserta en el editor para que puedas personalizarlo antes de enviar.',
  },

  // Finanzas y Pagos
  {
    id: 'recargo-pos',
    category: 'finanzas',
    question: '¿Cómo funciona el recargo del 5% del POS / tarjeta?',
    answer:
      'El recargo POS es configurable desde Configuración (por defecto 5%). Al registrar un cobro con tarjeta, el sistema desglosa automáticamente la comisión de la pasarela para que no infle tus ingresos netos reales en el reporte financiero.',
    link: { href: '/panel/configuracion', label: 'Ver Configuración' },
  },
  {
    id: 'comisiones-personal',
    category: 'finanzas',
    question: '¿Cómo se calculan las comisiones de los empleados?',
    answer:
      'Cada profesional tiene configurado su porcentaje de comisión en la sección Personal. En Finanzas puedes ver el desglose por período de lo ganado por cada uno y registrar los pagos realizados.',
    link: { href: '/finanzas', label: 'Ir a Finanzas' },
  },
  {
    id: 'venta-productos',
    category: 'finanzas',
    question: '¿Puedo registrar venta de productos además de servicios?',
    answer:
      'Sí. En Catálogo → Productos o directamente en Finanzas puedes registrar la venta de cualquier producto en inventario, seleccionando el método de pago.',
    link: { href: '/panel/servicios?tab=productos', label: 'Ver Productos' },
  },

  // Clientes
  {
    id: 'segmentos-clientes',
    category: 'clientes',
    question: '¿Qué significan los segmentos VIP, Nuevas y En riesgo?',
    answer:
      'VIP: clientas con 3 o más visitas acumuladas. Nuevas: registradas en los últimos 30 días. En riesgo: clientas que no te visitan desde hace más de 45 días, ideales para enviarles una promoción de reactivación.',
    link: { href: '/panel/clientes', label: 'Ir a Clientes' },
  },
  {
    id: 'whatsapp-desde-ficha',
    category: 'clientes',
    question: '¿Cómo abro el chat de WhatsApp de una clienta?',
    answer:
      'En la sección Clientes, abre la ficha de la persona y pulsa el botón de WhatsApp. El panel te llevará directamente al hilo de mensajes de ese contacto.',
  },

  // Configuración y Marca
  {
    id: 'cambiar-logo-colores',
    category: 'configuracion',
    question: '¿Cómo cambio el logo y los colores del negocio?',
    answer:
      'Ve a Configuración → General. Puedes subir una imagen para tu logo (se almacena de forma segura en la nube) y elegir el color primario y de acento de tu marca.',
    link: { href: '/panel/configuracion', label: 'Ir a Configuración' },
  },
  {
    id: 'configurar-horario',
    category: 'configuracion',
    question: '¿Cómo defino el horario de atención y los días de apertura?',
    answer:
      'En Configuración → Horarios puedes activar o desactivar cada día de la semana, definir la hora de apertura y cierre, y seleccionar el formato de hora (12 horas o 24 horas).',
    link: { href: '/panel/horarios', label: 'Ir a Horarios' },
  },
  {
    id: 'landing-publica',
    category: 'configuracion',
    question: '¿Cómo activo mi página web pública para que las clientas vean los servicios?',
    answer:
      'En Configuración → Presencia web elige «Página en Geema», escribe la dirección de tu página (por ejemplo «mi-salon») y guarda. La vista previa te muestra el enlace para tus clientas.',
    link: { href: '/panel/configuracion', label: 'Configurar Web' },
  },
]
