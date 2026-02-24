export const BUSINESS_TYPES = [
  { id: "barbershop", label: "Barbería", emoji: "✂️" },
  { id: "spa-nails", label: "Spa & Nails", emoji: "💅" },
  { id: "hair-salon", label: "Peluquería", emoji: "💇" },
  { id: "aesthetic", label: "Estética", emoji: "🌿" },
];

export const FEATURES = [
  {
    emoji: "📅",
    title: "Agenda Visual",
    description:
      "Citas sin conflictos con vista por empleado. Reprogramar es arrastrar y soltar.",
  },
  {
    emoji: "👥",
    title: "Gestión de Personal",
    description:
      "Comisiones automáticas, horarios y rendimiento de cada miembro del equipo.",
  },
  {
    emoji: "💰",
    title: "Control de Finanzas",
    description:
      "Ingresos diarios, semanales y mensuales. Cierra el mes en segundos.",
  },
  {
    emoji: "📦",
    title: "Inventario Inteligente",
    description:
      "Alertas de stock bajo automáticas. Nunca más te quedes sin insumos.",
  },
  {
    emoji: "🔔",
    title: "Notificaciones Push",
    description:
      "Recordatorios automáticos a clientes. Reduce las ausencias hasta un 40%.",
  },
  {
    emoji: "📊",
    title: "Reportes de Crecimiento",
    description:
      "Métricas claras que te dicen qué servicios son más rentables y cuándo crecer.",
  },
];

export const TESTIMONIALS = [
  {
    name: "Carlos Mendoza",
    role: "Dueño de Barbería",
    country: "Venezuela 🇻🇪",
    avatar: "CM",
    color: "#1A237E",
    text: "Estamos en la beta desde hace unas semanas y ya no puedo imaginar volver al cuaderno. Las citas organizadas, las comisiones calculadas solas y mis clientes llegando puntuales. Va por buen camino.",
    stars: 5,
  },
  {
    name: "Valeria Torres",
    role: "Directora de Spa & Nails",
    country: "Perú 🇵🇪",
    avatar: "VT",
    color: "#E91E8C",
    text: "Lo probamos antes del lanzamiento oficial y nos enganchó. Tengo 3 especialistas y antes calculaba las comisiones a mano cada fin de mes. Ahora SalonPro lo hace solo. El equipo está encantado.",
    stars: 5,
  },
  {
    name: "Andrea Gómez",
    role: "Estilista y Emprendedora",
    country: "Colombia 🇨🇴",
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
    highlighted: false,
    cta: "Contactar ventas",
    ctaSecondary: true,
  },
];

export const FAQS = [
  {
    question: "¿Necesito conocimientos técnicos para configurarlo?",
    answer:
      "No. SalonPro está diseñado para que cualquier dueño de negocio lo configure en menos de 10 minutos. El onboarding te guía paso a paso: tipo de negocio, servicios, equipo y listo.",
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
];

export const COMPARISON_FEATURES = [
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
];
