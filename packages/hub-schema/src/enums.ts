/** Valores de enums Postgres `hub_*` (espejo de docs/hub/supabase/migrations). */

export const HUB_MEMBER_ROLES = ['founder', 'admin', 'viewer'] as const
export type HubMemberRole = (typeof HUB_MEMBER_ROLES)[number]

export const HUB_CLIENT_STATUSES = ['lead', 'activo', 'pausado', 'cerrado'] as const
export type HubClientStatus = (typeof HUB_CLIENT_STATUSES)[number]

export const HUB_CLIENT_SOURCES = ['landing', 'cotizador', 'referido', 'directo'] as const
export type HubClientSource = (typeof HUB_CLIENT_SOURCES)[number]

export const HUB_VERTICALS = [
  'beauty',
  'inmobiliaria',
  'wellness',
  'automotriz',
  'sports',
  'enterprise',
  'salud',
  'otro',
] as const
export type HubVertical = (typeof HUB_VERTICALS)[number]

export const HUB_PROJECT_TYPES = ['web', 'mobile', 'fullstack', 'bot', 'otro'] as const
export type HubProjectType = (typeof HUB_PROJECT_TYPES)[number]

export const HUB_PROJECT_STATUSES = [
  'propuesta',
  'desarrollo',
  'produccion',
  'pausado',
  'archivado',
] as const
export type HubProjectStatus = (typeof HUB_PROJECT_STATUSES)[number]

export const HUB_TICKET_STATUSES = [
  'abierto',
  'en_progreso',
  'esperando_cliente',
  'resuelto',
  'cerrado',
] as const
export type HubTicketStatus = (typeof HUB_TICKET_STATUSES)[number]

export const HUB_TICKET_PRIORITIES = ['baja', 'media', 'alta', 'urgente'] as const
export type HubTicketPriority = (typeof HUB_TICKET_PRIORITIES)[number]

export const HUB_TICKET_CHANNELS = ['whatsapp', 'email', 'directo', 'hub'] as const
export type HubTicketChannel = (typeof HUB_TICKET_CHANNELS)[number]

export const HUB_REMINDER_KINDS = [
  'dominio',
  'token',
  'soporte',
  'certificado',
  'pago',
  'otro',
] as const
export type HubReminderKind = (typeof HUB_REMINDER_KINDS)[number]

export const HUB_REMINDER_RECURRENCES = ['ninguna', 'mensual', 'anual'] as const
export type HubReminderRecurrence = (typeof HUB_REMINDER_RECURRENCES)[number]

export const HUB_REMINDER_STATUSES = ['pendiente', 'hecho', 'descartado'] as const
export type HubReminderStatus = (typeof HUB_REMINDER_STATUSES)[number]
