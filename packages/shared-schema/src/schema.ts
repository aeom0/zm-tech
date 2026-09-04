import { sql, relations } from 'drizzle-orm'
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  decimal,
  uuid,
  jsonb,
  check,
  index,
  date,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'

export const employees = pgTable('employees', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  color: text('color').notNull().default('#FFD700'),
  role: text('role').notNull().default('employee'),
  commissionPercentage: integer('commission_percentage').default(0),
  paymentMode: text('payment_mode')
    .$type<'commission' | 'salary' | 'mixed'>()
    .default('commission')
    .notNull(),
  salaryAmount: decimal('salary_amount', { precision: 10, scale: 2 }),
  notes: text('notes'),
  /** URL pública en Storage (bucket `employee-avatars`) o enlace externo. */
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const serviceCategories = pgTable('service_categories', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  color: text('color').default('#6B7280'),
  icon: text('icon').default('scissors'),
  order: integer('order').notNull().default(0),
})

export const services = pgTable(
  'services',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    categoryId: varchar('category_id').references(() => serviceCategories.id),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    duration: integer('duration').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Alineado con índices FK en Supabase (Database Advisor)
    categoryIdIdx: index('idx_services_category_id').on(table.categoryId),
  })
)

export const clients = pgTable('clients', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const appointments = pgTable(
  'appointments',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: varchar('client_id').references(() => clients.id),
    clientName: text('client_name').notNull(),
    clientPhone: text('client_phone'),
    clientDocument: text('client_document'),
    employeeId: varchar('employee_id').references(() => employees.id),
    serviceId: varchar('service_id').references(() => services.id),
    date: timestamp('date').notNull(),
    duration: integer('duration').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    status: text('status').notNull().default('scheduled'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    /**
     * IDs de todos los servicios de la cita cuando hay más de una línea en
     * `appointment_services`. `service_id`/`price`/`duration` arriba se
     * mantienen denormalizados (primera línea / suma) para no romper
     * lecturas existentes (Dashboard, Finanzas, grids).
     */
    serviceIds: text('service_ids').array(),
    referenceImagePaths: text('reference_image_paths').array(),
    referenceReceivedAt: timestamp('reference_received_at'),
    /** null = referencias sin revisar por el staff */
    referenceReviewedAt: timestamp('reference_reviewed_at'),
  },
  (table) => ({
    clientIdIdx: index('idx_appointments_client_id').on(table.clientId),
    employeeIdIdx: index('idx_appointments_employee_id').on(table.employeeId),
    serviceIdIdx: index('idx_appointments_service_id').on(table.serviceId),
  })
)

/** Líneas de servicio de una cita multi-servicio (una fila por servicio+profesional) */
export const appointmentServices = pgTable(
  'appointment_services',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appointmentId: varchar('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    serviceId: varchar('service_id').references(() => services.id),
    employeeId: varchar('employee_id').references(() => employees.id),
    packId: varchar('pack_id').references(() => packs.id),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    duration: integer('duration').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    tenantId: text('tenant_id').notNull().default('zm-lash-nails'),
  },
  (table) => ({
    appointmentIdIdx: index('idx_appointment_services_appointment_id').on(table.appointmentId),
    serviceIdIdx: index('idx_appointment_services_service_id').on(table.serviceId),
    employeeIdIdx: index('idx_appointment_services_employee_id').on(table.employeeId),
    tenantIdIdx: index('idx_appointment_services_tenant_id').on(table.tenantId),
  })
)

export const inventoryItems = pgTable('inventory_items', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  type: text('type').notNull().default('countable'),
  category: text('category').notNull().default('insumos'), // unas | pestanas_cejas | insumos
  quantity: integer('quantity').notNull().default(0),
  minStock: integer('min_stock').notNull().default(5),
  unit: text('unit').notNull().default('unidad'),
  price: decimal('price', { precision: 10, scale: 2 }),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const whatsappSessions = pgTable('whatsapp_sessions', {
  phone: text('phone').primaryKey(),
  cartServiceIds: text('cart_service_ids').notNull().default('[]'),
  step: text('step').default('browsing'),
  parsedDatetime: timestamp('parsed_datetime'),
  employeeAssignments: text('employee_assignments').default('{}'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const wabaInboundMessages = pgTable(
  'waba_inbound_messages',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    waMessageId: text('wa_message_id'),
    fromPhone: text('from_phone').notNull(),
    profileName: text('profile_name'),
    messageType: text('message_type').notNull().default('unknown'),
    messageText: text('message_text'),
    messageTimestamp: timestamp('message_timestamp', { withTimezone: true }),
    rawPayload: jsonb('raw_payload').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    waMessageIdIdx: index('waba_inbound_messages_wa_message_id_idx').on(table.waMessageId),
    fromPhoneIdx: index('waba_inbound_messages_from_phone_idx').on(table.fromPhone),
    createdAtIdx: index('waba_inbound_messages_created_at_idx').on(table.createdAt),
  })
)

// Tabla de perfiles vinculada a Supabase Auth (auth.users)
// y opcionalmente a una chica en employees.
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    role: text('role').notNull(), // dev | owner | staff
    employeeId: varchar('employee_id').references(() => employees.id),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    employeeIdIdx: index('idx_profiles_employee_id').on(table.employeeId),
  })
)

/**
 * Pagos registrados en caja. En Postgres (GeemaStudio) no existe `employee_id` aquí:
 * el profesional se obtiene de `appointments.employee_id` usando `appointment_id`.
 */
export const payments = pgTable(
  'payments',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appointmentId: varchar('appointment_id').references(() => appointments.id),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    method: text('method').notNull().default('cash'),
    date: timestamp('date').defaultNow().notNull(),
    notes: text('notes'),
    isAbono: boolean('is_abono').notNull().default(false),
    serviceTotal: decimal('service_total', { precision: 10, scale: 2 }),
  },
  (table) => ({
    appointmentIdIdx: index('idx_payments_appointment_id').on(table.appointmentId),
  })
)

/** Registro de aprobación/rechazo de pago (validación admin); RLS en Supabase */
export const appointmentVerifications = pgTable(
  'appointment_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: text('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    // En BD: FK a auth.users; aquí sin .references para no duplicar constraint al hacer push
    verifiedBy: uuid('verified_by').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).defaultNow().notNull(),
    action: text('action').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    appointmentIdx: index('idx_appt_verif_appointment').on(table.appointmentId),
    verifiedByIdx: index('idx_appt_verif_verified_by').on(table.verifiedBy),
    actionCheck: check(
      'appointment_verifications_action_check',
      sql`${table.action} IN ('approved', 'rejected')`
    ),
  })
)

/** Bundles de servicios (IDs en service_ids; sin FK compuesta en PG) */
export const packs = pgTable('packs', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  serviceIds: text('service_ids')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  isActive: boolean('is_active').notNull().default(true),
})

/** Promociones con precio total calculado y vigencia opcional */
export const promotions = pgTable('promotions', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  description: text('description'),
  badge: text('badge'),
  accentColor: text('accent_color'),
  promoPrice: decimal('promo_price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})

/** Líneas de promo: ítem de catálogo (servicio o pack) con precio descontado por unidad */
export const promotionItems = pgTable(
  'promotion_items',
  {
    id: varchar('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    promoId: varchar('promo_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    itemType: text('item_type').notNull(),
    itemId: varchar('item_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    discountedPrice: decimal('discounted_price', {
      precision: 10,
      scale: 2,
    }).notNull(),
  },
  (table) => ({
    promoIdIdx: index('promotion_items_promo_id_idx').on(table.promoId),
    itemTypeCheck: check(
      'promotion_items_item_type_check',
      sql`${table.itemType} IN ('service', 'pack')`
    ),
  })
)

export const employeesRelations = relations(employees, ({ many }) => ({
  appointments: many(appointments),
}))

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}))

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  appointments: many(appointments),
}))

export const clientsRelations = relations(clients, ({ many }) => ({
  appointments: many(appointments),
}))

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  employee: one(employees, {
    fields: [appointments.employeeId],
    references: [employees.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  verifications: many(appointmentVerifications),
  serviceLines: many(appointmentServices),
}))

export const appointmentServicesRelations = relations(appointmentServices, ({ one }) => ({
  appointment: one(appointments, {
    fields: [appointmentServices.appointmentId],
    references: [appointments.id],
  }),
  service: one(services, {
    fields: [appointmentServices.serviceId],
    references: [services.id],
  }),
  employee: one(employees, {
    fields: [appointmentServices.employeeId],
    references: [employees.id],
  }),
  pack: one(packs, {
    fields: [appointmentServices.packId],
    references: [packs.id],
  }),
}))

export const appointmentVerificationsRelations = relations(appointmentVerifications, ({ one }) => ({
  appointment: one(appointments, {
    fields: [appointmentVerifications.appointmentId],
    references: [appointments.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  employee: one(employees, {
    fields: [profiles.employeeId],
    references: [employees.id],
  }),
}))

export const promotionsRelations = relations(promotions, ({ many }) => ({
  items: many(promotionItems),
}))

export const promotionItemsRelations = relations(promotionItems, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionItems.promoId],
    references: [promotions.id],
  }),
}))

const paymentModeEnum = z.enum(['commission', 'salary', 'mixed'])

export const insertEmployeeSchema = createInsertSchema(employees)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // `drizzle-zod` infiere `payment_mode` como `string`. Sobrescribimos
    // para que TS/Drizzle queden alineados con el union de negocio.
    paymentMode: paymentModeEnum.default('commission'),
  })
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true })
export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
})
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
})
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
})
export const insertAppointmentServiceSchema = createInsertSchema(appointmentServices).omit({
  id: true,
  createdAt: true,
})
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
})
export const insertWhatsappSessionSchema = createInsertSchema(whatsappSessions).omit({
  updatedAt: true,
})
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
})
export const insertAppointmentVerificationSchema = createInsertSchema(
  appointmentVerifications
).omit({
  id: true,
  verifiedAt: true,
  createdAt: true,
})
export const insertWabaInboundMessageSchema = createInsertSchema(wabaInboundMessages).omit({
  id: true,
  createdAt: true,
})

export const insertPackSchema = createInsertSchema(packs).omit({
  id: true,
})
export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
})
export const insertPromotionItemSchema = createInsertSchema(promotionItems).omit({ id: true })

export const tenantSettings = pgTable(
  'tenant_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessName: text('business_name').notNull(),
    businessType: text('business_type').notNull(),
    businessSubtype: text('business_subtype'),
    serviceCategories: jsonb('service_categories').$type<string[]>().default([]),
    primaryColor: text('primary_color').notNull().default('#E91E8C'),
    accentColor: text('accent_color').notNull().default('#FFD700'),
    currencyCode: text('currency_code').notNull().default('USD'),
    currencySymbol: text('currency_symbol').notNull().default('$'),
    country: text('country').notNull().default(''),
    language: text('language').notNull().default('es'),
    /** IANA, ej. America/Caracas — migración manual si la columna aún no existe en un proyecto */
    timezone: text('timezone').notNull().default('America/Caracas'),
    /** `12` | `24` — cómo mostrar horas en agenda / UI */
    timeFormat: text('time_format').notNull().default('24'),
    clientTerminology: text('client_terminology').notNull().default('cliente'),
    tagline: text('tagline').notNull().default(''),
    featuresWhatsapp: boolean('features_whatsapp').notNull().default(false),
    logoUrl: text('logo_url').notNull().default(''),
    staffTerminology: text('staff_terminology').notNull().default('especialistas'),
    staffSingularTerminology: text('staff_singular_terminology').notNull().default('especialista'),
    appointmentTerminology: text('appointment_terminology').notNull().default('cita'),
    businessHours: jsonb('business_hours'),
    contactInfo: jsonb('contact_info'),
    commissionStaff: integer('commission_staff').notNull().default(60),
    commissionHouse: integer('commission_house').notNull().default(40),
    isConfigured: boolean('is_configured').notNull().default(false),
    /** Cuenta demo (reset al logout vía Edge reset-demo-tenant) */
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    /** Slug para URL pública /s/[slug] */
    slug: text('slug').unique(),
    webEnabled: boolean('web_enabled').notNull().default(false),
    webTemplate: text('web_template').notNull().default('elegant'),
    customDomain: text('custom_domain').unique(),
    webServices: jsonb('web_services').default(sql`'[]'::jsonb`),
    webReviews: jsonb('web_reviews').default(sql`'[]'::jsonb`),
    webHeroTagline: text('web_hero_tagline'),
    webAbout: text('web_about'),
    webInstagram: text('web_instagram'),
    webWhatsapp: text('web_whatsapp'),
    webAddress: text('web_address'),
    webCity: text('web_city'),
    webStatClients: text('web_stat_clients').notNull().default('500+'),
    webStatRating: text('web_stat_rating').notNull().default('4.9'),
    webStatYears: text('web_stat_years').notNull().default('3+'),
  },
  (table) => ({
    webEnabledIdx: index('idx_tenant_settings_web_enabled').on(table.webEnabled),
  })
)

export const insertTenantSettingsSchema = createInsertSchema(tenantSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/** Feriados / no laborables por tenant (horario reducido o cerrado). */
export const salonHolidays = pgTable(
  'salon_holidays',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: text('tenant_id').notNull().default('zm-lash-nails'),
    date: date('date').notNull(),
    name: text('name').notNull(),
    isClosed: boolean('is_closed').notNull().default(false),
    /** Última hora de inicio de cita (10–18). Default 12. */
    openUntilHour: integer('open_until_hour').notNull().default(12),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqTenantDate: uniqueIndex('salon_holidays_tenant_date_unique').on(t.tenantId, t.date),
    idxDate: index('idx_salon_holidays_date').on(t.date),
    idxTenant: index('idx_salon_holidays_tenant_id').on(t.tenantId),
  })
)

export const insertSalonHolidaySchema = createInsertSchema(salonHolidays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type Employee = typeof employees.$inferSelect
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>
export type ServiceCategory = typeof serviceCategories.$inferSelect
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>
export type Service = typeof services.$inferSelect
export type InsertService = z.infer<typeof insertServiceSchema>
export type Client = typeof clients.$inferSelect
export type InsertClient = z.infer<typeof insertClientSchema>
export type Appointment = typeof appointments.$inferSelect
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>
export type AppointmentService = typeof appointmentServices.$inferSelect
export type InsertAppointmentService = z.infer<typeof insertAppointmentServiceSchema>
export type InventoryItem = typeof inventoryItems.$inferSelect
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>
export type WhatsappSession = typeof whatsappSessions.$inferSelect
export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>
export type Payment = typeof payments.$inferSelect
export type InsertPayment = z.infer<typeof insertPaymentSchema>
export type AppointmentVerification = typeof appointmentVerifications.$inferSelect
export type InsertAppointmentVerification = z.infer<typeof insertAppointmentVerificationSchema>
export type WabaInboundMessage = typeof wabaInboundMessages.$inferSelect
export type InsertWabaInboundMessage = z.infer<typeof insertWabaInboundMessageSchema>
export type Pack = typeof packs.$inferSelect
export type InsertPack = z.infer<typeof insertPackSchema>
export type Promotion = typeof promotions.$inferSelect
export type InsertPromotion = z.infer<typeof insertPromotionSchema>
export type PromotionItem = typeof promotionItems.$inferSelect
export type InsertPromotionItem = z.infer<typeof insertPromotionItemSchema>
export type Profile = typeof profiles.$inferSelect
export type TenantSettings = typeof tenantSettings.$inferSelect
export type InsertTenantSettings = z.infer<typeof insertTenantSettingsSchema>
export type SalonHolidayRow = typeof salonHolidays.$inferSelect
export type InsertSalonHoliday = z.infer<typeof insertSalonHolidaySchema>
