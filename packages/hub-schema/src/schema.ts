import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'

// ============================================================
// ENUMS (prefijo hub_ — Postgres no namespacea enums por tabla)
// ============================================================

export const hubMemberRoleEnum = pgEnum('hub_member_role', ['founder', 'admin', 'viewer'])
export const hubClientStatusEnum = pgEnum('hub_client_status', [
  'lead',
  'activo',
  'pausado',
  'cerrado',
])
export const hubClientSourceEnum = pgEnum('hub_client_source', [
  'landing',
  'cotizador',
  'referido',
  'directo',
])
export const hubVerticalEnum = pgEnum('hub_vertical', [
  'beauty',
  'inmobiliaria',
  'wellness',
  'automotriz',
  'sports',
  'enterprise',
  'salud',
  'otro',
])
export const hubProjectTypeEnum = pgEnum('hub_project_type', [
  'web',
  'mobile',
  'fullstack',
  'bot',
  'otro',
])
export const hubProjectStatusEnum = pgEnum('hub_project_status', [
  'propuesta',
  'desarrollo',
  'produccion',
  'pausado',
  'archivado',
])
export const hubTicketStatusEnum = pgEnum('hub_ticket_status', [
  'abierto',
  'en_progreso',
  'esperando_cliente',
  'resuelto',
  'cerrado',
])
export const hubTicketPriorityEnum = pgEnum('hub_ticket_priority', [
  'baja',
  'media',
  'alta',
  'urgente',
])
export const hubTicketChannelEnum = pgEnum('hub_ticket_channel', [
  'whatsapp',
  'email',
  'directo',
  'hub',
])
export const hubReminderKindEnum = pgEnum('hub_reminder_kind', [
  'dominio',
  'token',
  'soporte',
  'certificado',
  'pago',
  'otro',
])
export const hubReminderRecurrenceEnum = pgEnum('hub_reminder_recurrence', [
  'ninguna',
  'mensual',
  'anual',
])
export const hubReminderStatusEnum = pgEnum('hub_reminder_status', [
  'pendiente',
  'hecho',
  'descartado',
])

// ============================================================
// HUB_MEMBERS
// ============================================================

export const hubMembers = pgTable('hub_members', {
  userId: uuid('user_id').primaryKey(),
  role: hubMemberRoleEnum('role').notNull().default('viewer'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// HUB_CLIENTS
// ============================================================

export const hubClients = pgTable(
  'hub_clients',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    contactName: text('contact_name'),
    email: text('email'),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    country: text('country'),
    city: text('city'),
    vertical: hubVerticalEnum('vertical').notNull().default('otro'),
    status: hubClientStatusEnum('status').notNull().default('lead'),
    source: hubClientSourceEnum('source').notNull().default('directo'),
    /** Ref suave a contacts.id (landing) — sin FK */
    sourceContactId: uuid('source_contact_id'),
    /** Ref suave a quote_leads.id (landing) — sin FK */
    sourceQuoteLeadId: uuid('source_quote_lead_id'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index('hub_clients_status_idx').on(t.status),
    sourceContactIdx: index('hub_clients_source_contact_idx').on(t.sourceContactId),
    sourceQuoteLeadIdx: index('hub_clients_source_quote_lead_idx').on(t.sourceQuoteLeadId),
  })
)

// ============================================================
// HUB_PROJECTS
// ============================================================

export const hubProjects = pgTable(
  'hub_projects',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /** Nullable: productos propios ZM Tech no tienen cliente */
    clientId: uuid('client_id').references(() => hubClients.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: hubProjectTypeEnum('type').notNull().default('web'),
    status: hubProjectStatusEnum('status').notNull().default('desarrollo'),
    repoUrl: text('repo_url'),
    stack: text('stack')
      .array()
      .notNull()
      .default(sql`'{}'`),
    productionUrl: text('production_url'),
    vercelProject: text('vercel_project'),
    easProject: text('eas_project'),
    supabaseRef: text('supabase_ref'),
    version: text('version'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clientIdx: index('hub_projects_client_idx').on(t.clientId),
    statusIdx: index('hub_projects_status_idx').on(t.status),
  })
)

// ============================================================
// HUB_CONTRACTS
// ============================================================

export const hubContracts = pgTable(
  'hub_contracts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: uuid('client_id')
      .notNull()
      .references(() => hubClients.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => hubProjects.id, {
      onDelete: 'set null',
    }),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }),
    paymentModel: text('payment_model').notNull().default('50/50'),
    monthlySupportUsd: numeric('monthly_support_usd', {
      precision: 10,
      scale: 2,
    }),
    supportActive: boolean('support_active').notNull().default(false),
    startDate: date('start_date'),
    deliveredAt: date('delivered_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clientIdx: index('hub_contracts_client_idx').on(t.clientId),
  })
)

// ============================================================
// HUB_TICKETS (Fase 2)
// ============================================================

export const hubTickets = pgTable(
  'hub_tickets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: uuid('client_id')
      .notNull()
      .references(() => hubClients.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => hubProjects.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    priority: hubTicketPriorityEnum('priority').notNull().default('media'),
    status: hubTicketStatusEnum('status').notNull().default('abierto'),
    channel: hubTicketChannelEnum('channel').notNull().default('directo'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clientIdx: index('hub_tickets_client_idx').on(t.clientId),
    statusIdx: index('hub_tickets_status_idx').on(t.status),
  })
)

// ============================================================
// HUB_REMINDERS (Fase 2)
// ============================================================

export const hubReminders = pgTable(
  'hub_reminders',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text('title').notNull(),
    kind: hubReminderKindEnum('kind').notNull(),
    clientId: uuid('client_id').references(() => hubClients.id, {
      onDelete: 'set null',
    }),
    projectId: uuid('project_id').references(() => hubProjects.id, {
      onDelete: 'set null',
    }),
    dueDate: date('due_date').notNull(),
    recurrence: hubReminderRecurrenceEnum('recurrence').notNull().default('ninguna'),
    status: hubReminderStatusEnum('status').notNull().default('pendiente'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dueIdx: index('hub_reminders_due_idx').on(t.dueDate),
  })
)

// ============================================================
// INSERT SCHEMAS (Zod)
// ============================================================

export const insertHubMemberSchema = createInsertSchema(hubMembers).omit({
  createdAt: true,
})
export const insertHubClientSchema = createInsertSchema(hubClients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertHubProjectSchema = createInsertSchema(hubProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertHubContractSchema = createInsertSchema(hubContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertHubTicketSchema = createInsertSchema(hubTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertHubReminderSchema = createInsertSchema(hubReminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// ============================================================
// TYPES
// ============================================================

export type HubMember = typeof hubMembers.$inferSelect
export type InsertHubMember = z.infer<typeof insertHubMemberSchema>

export type HubClient = typeof hubClients.$inferSelect
export type InsertHubClient = z.infer<typeof insertHubClientSchema>

export type HubProject = typeof hubProjects.$inferSelect
export type InsertHubProject = z.infer<typeof insertHubProjectSchema>

export type HubContract = typeof hubContracts.$inferSelect
export type InsertHubContract = z.infer<typeof insertHubContractSchema>

export type HubTicket = typeof hubTickets.$inferSelect
export type InsertHubTicket = z.infer<typeof insertHubTicketSchema>

export type HubReminder = typeof hubReminders.$inferSelect
export type InsertHubReminder = z.infer<typeof insertHubReminderSchema>
