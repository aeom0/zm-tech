import type {
  HubClientSource,
  HubClientStatus,
  HubMemberRole,
  HubProjectStatus,
  HubProjectType,
  HubReminderKind,
  HubTicketChannel,
  HubTicketPriority,
  HubTicketStatus,
  HubVertical,
} from './enums'

/** Etiquetas UI en español LATAM. */

export const HUB_MEMBER_ROLE_LABELS: Record<HubMemberRole, string> = {
  founder: 'Fundador',
  admin: 'Admin',
  viewer: 'Viewer',
}

export const HUB_CLIENT_STATUS_LABELS: Record<HubClientStatus, string> = {
  lead: 'Lead',
  activo: 'Activo',
  pausado: 'Pausado',
  cerrado: 'Cerrado',
}

export const HUB_CLIENT_SOURCE_LABELS: Record<HubClientSource, string> = {
  landing: 'Landing',
  cotizador: 'Cotizador',
  referido: 'Referido',
  directo: 'Directo',
}

export const HUB_VERTICAL_LABELS: Record<HubVertical, string> = {
  beauty: 'Beauty',
  inmobiliaria: 'Inmobiliaria',
  wellness: 'Wellness',
  automotriz: 'Automotriz',
  sports: 'Sports',
  enterprise: 'Enterprise',
  salud: 'Salud',
  otro: 'Otro',
}

export const HUB_PROJECT_TYPE_LABELS: Record<HubProjectType, string> = {
  web: 'Web',
  mobile: 'Mobile',
  fullstack: 'Fullstack',
  bot: 'Bot',
  otro: 'Otro',
}

export const HUB_PROJECT_STATUS_LABELS: Record<HubProjectStatus, string> = {
  propuesta: 'Propuesta',
  desarrollo: 'Desarrollo',
  produccion: 'Producción',
  pausado: 'Pausado',
  archivado: 'Archivado',
}

export const HUB_TICKET_STATUS_LABELS: Record<HubTicketStatus, string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  esperando_cliente: 'Esperando cliente',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

export const HUB_TICKET_PRIORITY_LABELS: Record<HubTicketPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const HUB_TICKET_CHANNEL_LABELS: Record<HubTicketChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Correo',
  directo: 'Directo',
  hub: 'Hub',
}

export const HUB_REMINDER_KIND_LABELS: Record<HubReminderKind, string> = {
  dominio: 'Dominio',
  token: 'Token',
  soporte: 'Soporte',
  certificado: 'Certificado',
  pago: 'Pago',
  otro: 'Otro',
}

export const DEFAULT_PAYMENT_MODEL = '50/50'
export const DEFAULT_MONTHLY_SUPPORT_USD = 30
