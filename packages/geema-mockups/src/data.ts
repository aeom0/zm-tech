// Negocio ficticio único para todos los mocks (landing y videos).
// Ningún dato pertenece a un tenant real.

export const BUSINESS = {
  name: 'Estudio Aria',
  initial: 'A',
  owner: 'Valeria',
  currency: '$',
  dateLong: 'jueves, 16 de octubre',
  monthLabel: 'Octubre 2026',
} as const

export type Employee = {
  id: string
  name: string
  role: string
  color: string
  appointmentsToday: number
  revenueToday: number
  payMode: string
}

export const EMPLOYEES: Employee[] = [
  {
    id: 'valeria',
    name: 'Valeria Ríos',
    role: 'Lashista',
    color: '#40E0D0',
    appointmentsToday: 3,
    revenueToday: 180,
    payMode: 'Dueña',
  },
  {
    id: 'camila',
    name: 'Camila Soto',
    role: 'Manicurista',
    color: '#F48FB1',
    appointmentsToday: 3,
    revenueToday: 135,
    payMode: 'Comisión 40%',
  },
  {
    id: 'daniela',
    name: 'Daniela Paz',
    role: 'Estilista',
    color: '#B39DDB',
    appointmentsToday: 2,
    revenueToday: 95,
    payMode: 'Comisión 35%',
  },
  {
    id: 'lucia',
    name: 'Lucía Mena',
    role: 'Cejas y pestañas',
    color: '#FFB74D',
    appointmentsToday: 1,
    revenueToday: 45,
    payMode: 'Sueldo fijo',
  },
]

export function employeeById(id: string): Employee {
  return EMPLOYEES.find((e) => e.id === id) ?? EMPLOYEES[0]
}

export type Appointment = {
  id: string
  /** Hora en formato 12 h, como la muestra la app */
  time: string
  /** Hora decimal para ubicar el bloque en la grilla de agenda */
  start: number
  duration: number
  client: string
  service: string
  employeeId: string
  price: number
  status: 'completed' | 'scheduled'
}

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    time: '9:00 a. m.',
    start: 9,
    duration: 90,
    client: 'María González',
    service: 'Extensiones volumen ruso',
    employeeId: 'valeria',
    price: 85,
    status: 'completed',
  },
  {
    id: 'a2',
    time: '9:30 a. m.',
    start: 9.5,
    duration: 60,
    client: 'Carla Méndez',
    service: 'Manicure en gel',
    employeeId: 'camila',
    price: 35,
    status: 'completed',
  },
  {
    id: 'a3',
    time: '10:00 a. m.',
    start: 10,
    duration: 60,
    client: 'Paula Torres',
    service: 'Corte y brushing',
    employeeId: 'daniela',
    price: 40,
    status: 'completed',
  },
  {
    id: 'a4',
    time: '11:00 a. m.',
    start: 11,
    duration: 120,
    client: 'Andrea Pérez',
    service: 'Uñas acrílicas',
    employeeId: 'camila',
    price: 60,
    status: 'completed',
  },
  {
    id: 'a5',
    time: '11:00 a. m.',
    start: 11,
    duration: 45,
    client: 'Gabriela Luna',
    service: 'Diseño de cejas',
    employeeId: 'lucia',
    price: 45,
    status: 'completed',
  },
  {
    id: 'a6',
    time: '12:30 p. m.',
    start: 12.5,
    duration: 60,
    client: 'Sofía Ramírez',
    service: 'Lifting de pestañas',
    employeeId: 'valeria',
    price: 50,
    status: 'scheduled',
  },
  {
    id: 'a7',
    time: '2:00 p. m.',
    start: 14,
    duration: 90,
    client: 'Natalia Cruz',
    service: 'Color y tratamiento',
    employeeId: 'daniela',
    price: 55,
    status: 'scheduled',
  },
  {
    id: 'a8',
    time: '3:00 p. m.',
    start: 15,
    duration: 60,
    client: 'Renata Silva',
    service: 'Pedicure spa',
    employeeId: 'camila',
    price: 40,
    status: 'scheduled',
  },
  {
    id: 'a9',
    time: '4:00 p. m.',
    start: 16,
    duration: 90,
    client: 'Isabel Vargas',
    service: 'Extensiones clásicas',
    employeeId: 'valeria',
    price: 45,
    status: 'scheduled',
  },
]

export const TODAY = {
  revenue: 265,
  payments: 5,
  completed: 5,
  pending: 4,
  lowStock: 2,
}

export const FINANCE = {
  monthTotal: 6240,
  rangeLabel: '1-16 oct · 16 días',
  trendPct: 15,
  payments: 148,
  /** Ingreso diario de los últimos 14 días */
  daily: [310, 420, 380, 0, 460, 520, 610, 350, 440, 410, 0, 480, 560, 265],
  dailyLabels: ['3/10', '', '', '', '7/10', '', '', '', '11/10', '', '', '', '15/10', ''],
  byEmployee: [
    { id: 'valeria', total: 2480, services: 52 },
    { id: 'camila', total: 1860, services: 49 },
    { id: 'daniela', total: 1250, services: 31 },
    { id: 'lucia', total: 650, services: 16 },
  ],
}

export type InventoryItem = {
  name: string
  unit: string
  quantity: number
  min: number
}

export const INVENTORY_TABS = ['Pestañas', 'Uñas', 'Cabello', 'Insumos'] as const

export const INVENTORY: InventoryItem[] = [
  { name: 'Pestañas volumen 0.07 C', unit: 'bandejas', quantity: 2, min: 4 },
  { name: 'Pegamento ultra rápido', unit: 'frascos', quantity: 6, min: 2 },
  { name: 'Parches de gel', unit: 'pares', quantity: 40, min: 20 },
  { name: 'Removedor en crema', unit: 'frascos', quantity: 1, min: 2 },
  { name: 'Microbrush', unit: 'paquetes', quantity: 9, min: 3 },
  { name: 'Shampoo para pestañas', unit: 'frascos', quantity: 4, min: 2 },
]

export type ChatMessage = {
  from: 'client' | 'business'
  /** Admite *negritas* al estilo WhatsApp. */
  text: string
  time: string
  /** Botones de respuesta rápida debajo de la burbuja. */
  buttons?: string[]
  /** Botón de llamada a la acción (enlace) debajo de la burbuja. */
  cta?: string
  /** Mensaje citado (respuesta a un botón o a un mensaje anterior). */
  quote?: { author: string; text: string }
}

// Copy WABA: aquí sí se permiten emojis (excepción de AGENTS.md).
export const CHAT: ChatMessage[] = [
  {
    from: 'client',
    text: 'Hola! Tienen espacio hoy para lifting de pestañas? Cuánto cuesta?',
    time: '9:12 a. m.',
  },
  {
    from: 'business',
    text: '¡Hola! ✨ Soy el asistente de Estudio Aria.\n\nEl *Lifting de pestañas* cuesta *$\u00a050* e incluye tinte. Tu mirada se ve despierta y natural por 6 a 8 semanas, sin rímel 💖\n\n¿Te agendo para hoy?',
    time: '9:12 a. m.',
  },
  { from: 'client', text: 'Sí porfa!', time: '9:13 a. m.' },
  {
    from: 'business',
    text: 'Hoy *jueves 16* Valeria tiene libre:',
    buttons: ['12:30 p. m.', '2:00 p. m.', '3:00 p. m.'],
    time: '9:13 a. m.',
  },
  {
    from: 'client',
    text: '12:30 p. m.',
    quote: { author: 'Estudio Aria', text: 'Hoy jueves 16 Valeria tiene libre:' },
    time: '9:13 a. m.',
  },
  {
    from: 'business',
    text: '¡Listo, Sofía! Tu cita quedó confirmada ✅\n\n*Lifting de pestañas*\n📅 Hoy jueves 16 · 12:30 p. m.\n👩🏻 Con Valeria · $\u00a050\n\nTe escribo 2 horas antes para recordártela 💖',
    cta: 'Ver ubicación',
    time: '9:13 a. m.',
  },
]

export function money(n: number): string {
  return `${BUSINESS.currency} ${n.toLocaleString('en-US')}`
}
