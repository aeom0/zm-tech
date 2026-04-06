export const BUSINESS_TYPES = [
  { id: "barbershop", label: "Barbería", icon: "Scissors" },
  { id: "spa-nails", label: "Spa & Nails", icon: "Sparkles" },
  { id: "hair-salon", label: "Peluquería", icon: "Zap" },
  { id: "aesthetic", label: "Estética", icon: "Leaf" },
];

export const FEATURES = [
  {
    icon: "MessageCircle",
    title: "WhatsApp 24/7 con asistente IA",
    description:
      "Tus clientes agendan solos por WhatsApp. Con IA integrada que responde preguntas libres sobre servicios, precios y disponibilidad.",
  },
  {
    icon: "Calendar",
    title: "Agenda Visual",
    description:
      "Citas sin conflictos con vista por empleado. Reprogramar es arrastrar y soltar.",
  },
  {
    icon: "Users",
    title: "Gestión de Personal",
    description:
      "Comisiones automáticas, horarios y rendimiento de cada miembro del equipo.",
  },
  {
    icon: "DollarSign",
    title: "Control de Finanzas",
    description:
      "Ingresos diarios, semanales y mensuales. Cierra el mes en segundos.",
  },
  {
    icon: "Package",
    title: "Inventario Inteligente",
    description:
      "Alertas de stock bajo automáticas. Nunca más te quedes sin insumos.",
  },
  {
    icon: "Bell",
    title: "Notificaciones Push",
    description:
      "Recordatorios automáticos a clientes. Reduce las ausencias hasta un 40%.",
  },
  {
    icon: "BarChart2",
    title: "Reportes de Crecimiento",
    description:
      "Métricas claras que te dicen qué servicios son más rentables y cuándo crecer.",
  },
];

export const TESTIMONIALS = [
  {
    name: "Carlos Mendoza",
    role: "Propietario de barbería",
    country: "Venezuela",
    avatar: "CM",
    color: "#1A237E",
    text: "Estamos en la beta desde hace unas semanas y ya no puedo imaginar volver al cuaderno. Las citas organizadas, las comisiones calculadas solas y mis clientes llegando puntuales. Va por buen camino.",
    stars: 5,
  },
  {
    name: "Valeria Torres",
    role: "Directora de Spa & Nails",
    country: "Perú",
    avatar: "VT",
    color: "#40E0D0",
    text: "Lo probamos antes del lanzamiento oficial y nos convenció. Tengo 3 especialistas y antes calculaba las comisiones a mano cada fin de mes. Ahora SalonPro lo hace solo. El equipo está encantado.",
    stars: 5,
  },
  {
    name: "Andrea Gómez",
    role: "Estilista y Emprendedora",
    country: "Colombia",
    avatar: "AG",
    color: "#6A1B9A",
    text: "Entré al acceso anticipado y fue la mejor decisión. Funciona perfecto en el celular y me da el control que necesitaba. Todavía están puliendo detalles pero el producto tiene mucho potencial.",
    stars: 5,
  },
];

export type Plan = {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  wabaFeatures: string[];
  wabaConversations: number | "unlimited";
  highlighted: boolean;
  cta: string;
  ctaSecondary?: boolean;
};

export const PLANS: Plan[] = [
  {
    name: "Basic",
    monthlyPrice: 19,
    annualPrice: 15,
    description: "Para empezar a organizarte",
    features: [
      "1 sede",
      "Hasta 3 empleados",
      "Agenda de citas",
      "Catálogo de servicios",
      "App móvil (iOS + Android)",
      "Soporte por email",
    ],
    wabaFeatures: [
      "WhatsApp 24/7 con asistente IA",
      "50 conversaciones/mes incluidas",
      "Add-on: +50 conv. por $4",
    ],
    wabaConversations: 50,
    highlighted: false,
    cta: "Empezar gratis",
  },
  {
    name: "Pro",
    monthlyPrice: 45,
    annualPrice: 36,
    description: "El más popular para negocios en crecimiento",
    features: [
      "3 sedes",
      "Hasta 15 empleados",
      "Todo lo de Basic",
      "Control de inventario",
      "Finanzas y reportes",
      "Notificaciones push a clientes",
      "Comisiones automáticas",
      "Soporte prioritario",
    ],
    wabaFeatures: [
      "WhatsApp 24/7 con asistente IA",
      "300 conversaciones/mes incluidas",
      "Envío de promos masivas por WA",
    ],
    wabaConversations: 300,
    highlighted: true,
    cta: "Empezar gratis",
  },
  {
    name: "Elite",
    monthlyPrice: 89,
    annualPrice: 71,
    description: "Para cadenas y franquicias",
    features: [
      "Sedes ilimitadas",
      "Empleados ilimitados",
      "Todo lo de Pro",
      "Reportes avanzados",
      "Branding personalizado",
      "Integraciones API",
      "Manager dedicado",
      "SLA garantizado",
    ],
    wabaFeatures: [
      "WhatsApp 24/7 con asistente IA avanzada",
      "Conversaciones ilimitadas",
      "Flujo de pago por captura WA",
      "Foto previa al servicio por WA",
    ],
    wabaConversations: "unlimited",
    highlighted: false,
    cta: "Contactar ventas",
    ctaSecondary: true,
  },
];

export const WABA_ADDON_TIERS = [
  { conversations: 50, price: 4, label: "Pack básico" },
  { conversations: 200, price: 12, label: "Pack estándar · −25%" },
  { conversations: 500, price: 24, label: "Pack pro · −40%" },
] as const;

export const FAQS = [
  {
    question: "¿Necesito conocimientos técnicos para configurarlo?",
    answer:
      "No. SalonPro está diseñado para que cualquier propietario de negocio lo configure en menos de 10 minutos. El onboarding te guía paso a paso: tipo de negocio, servicios, equipo y listo.",
  },
  {
    question: "¿Funciona en iOS y Android?",
    answer:
      "Sí. SalonPro tiene app nativa para iOS y Android, además de acceso web desde cualquier navegador. Tu equipo puede usar el dispositivo que ya tiene.",
  },
  {
    question: "¿Puedo cambiar de plan cuando quiera?",
    answer:
      "Absolutamente. Puedes subir o bajar de plan en cualquier momento desde Configuración. El cobro se ajusta de forma proporcional al tiempo restante del ciclo.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Sí. Usamos Supabase con cifrado en reposo y en tránsito. Cada negocio tiene su propia base de datos aislada. Cumplimos con estándares de seguridad de nivel empresarial.",
  },
  {
    question: "¿Hay contrato de permanencia?",
    answer:
      "No. SalonPro es mes a mes (o anual con descuento). Puedes cancelar cuando quieras sin penalizaciones. Tus datos son tuyos y puedes exportarlos en cualquier momento.",
  },
  {
    question: "¿Cómo es el soporte?",
    answer:
      "Todos los planes incluyen soporte por email con respuesta en menos de 24 horas. El plan Pro tiene soporte prioritario (menos de 4 horas). Elite incluye un manager dedicado con WhatsApp directo.",
  },
  {
    question: "¿Necesito WhatsApp Business API para usar el bot?",
    answer:
      "Sí. El bot funciona con WhatsApp Business API (WABA) de Meta — diferente a la app WhatsApp Business normal. Desde SalonPro te guiamos paso a paso para conectar tu número. El proceso toma menos de 15 minutos y Meta lo aprueba en 1-2 días hábiles.",
  },
  {
    question: "¿Qué pasa cuando se agotan las conversaciones del mes?",
    answer:
      "El bot notifica al propietario del negocio por la app antes de llegar al límite. Puedes comprar packs adicionales desde Configuración (50 conv/$4, 200/$12, 500/$24) o activar la compra automática para que nunca se interrumpa el servicio.",
  },
];

export const COMPARISON_FEATURES: {
  label: string;
  basic: boolean | string;
  pro: boolean | string;
  elite: boolean | string;
}[] = [
  { label: "App móvil (iOS + Android)", basic: true, pro: true, elite: true },
  { label: "Agenda de citas", basic: true, pro: true, elite: true },
  { label: "Catálogo de servicios", basic: true, pro: true, elite: true },
  { label: "Gestión de clientes", basic: true, pro: true, elite: true },
  { label: "Control de inventario", basic: false, pro: true, elite: true },
  { label: "Finanzas y reportes", basic: false, pro: true, elite: true },
  { label: "Notificaciones push", basic: false, pro: true, elite: true },
  { label: "Comisiones automáticas", basic: false, pro: true, elite: true },
  { label: "Múltiples sedes", basic: false, pro: true, elite: true },
  { label: "Reportes avanzados", basic: false, pro: false, elite: true },
  { label: "Branding personalizado", basic: false, pro: false, elite: true },
  { label: "API + Integraciones", basic: false, pro: false, elite: true },
  { label: "Manager dedicado", basic: false, pro: false, elite: true },
  {
    label: "WhatsApp y asistente IA 24/7",
    basic: true,
    pro: true,
    elite: true,
  },
  {
    label: "Conversaciones incluidas/mes",
    basic: "50",
    pro: "300",
    elite: "∞",
  },
  {
    label: "Add-on conversaciones extra",
    basic: true,
    pro: true,
    elite: false,
  },
  {
    label: "IA (Claude) para preguntas libres",
    basic: true,
    pro: true,
    elite: true,
  },
  {
    label: "Envío de promos por WhatsApp",
    basic: false,
    pro: true,
    elite: true,
  },
];
