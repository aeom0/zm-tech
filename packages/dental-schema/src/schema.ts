import { pgTable, uuid, text, timestamp, date, integer, numeric, jsonb } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { OdontogramState } from './odontogram'

/** Roles clínicos OdentalPro (JWT app_metadata.role / odental_employees.role) */
export const ODENTAL_ROLES = ['dev', 'dentist-owner', 'assistant', 'specialist'] as const

export type OdentalRole = (typeof ODENTAL_ROLES)[number]

export const odentalBusinessSubtypes = ['general', 'orthodontics', 'pediatric', 'implants'] as const

export type OdentalBusinessSubtype = (typeof odentalBusinessSubtypes)[number]

export const odentalTenantSettings = pgTable('odental_tenant_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  clinicName: text('clinic_name').notNull(),
  businessSubtype: text('business_subtype').default('general'),
  themeOverride: jsonb('theme_override').$type<Record<string, unknown>>().default({}),
  currencyCode: text('currency_code').default('USD'),
  timezone: text('timezone').default('America/Caracas'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const odentalEmployees = pgTable('odental_employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => odentalTenantSettings.id),
  role: text('role').$type<OdentalRole>().notNull(),
  specialty: text('specialty'),
  fullName: text('full_name').notNull(),
  authUserId: uuid('auth_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const odentalPatients = pgTable('odental_patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => odentalTenantSettings.id),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  birthDate: date('birth_date'),
  bloodType: text('blood_type'),
  allergies: text('allergies'),
  medicalNotes: text('medical_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const odentalAppointments = pgTable('odental_appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => odentalTenantSettings.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => odentalPatients.id),
  dentistId: uuid('dentist_id').references(() => odentalEmployees.id),
  clinicalRecordId: uuid('clinical_record_id'),
  treatmentPlanId: uuid('treatment_plan_id'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: text('status').default('scheduled'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const odentalClinicalRecords = pgTable('odental_clinical_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => odentalTenantSettings.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => odentalPatients.id),
  appointmentId: uuid('appointment_id').references(() => odentalAppointments.id),
  dentistId: uuid('dentist_id').references(() => odentalEmployees.id),
  visitDate: timestamp('visit_date', { withTimezone: true }).notNull().defaultNow(),
  chiefComplaint: text('chief_complaint'),
  diagnosis: text('diagnosis'),
  treatmentPerformed: text('treatment_performed'),
  treatmentPlan: text('treatment_plan'),
  observations: text('observations'),
  odontogram: jsonb('odontogram').$type<OdontogramState | null>(),
  attachments: jsonb('attachments').$type<unknown[]>().default([]),
  consentSignedAt: timestamp('consent_signed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const odentalTreatmentPlans = pgTable('odental_treatment_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => odentalTenantSettings.id),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => odentalPatients.id),
  dentistId: uuid('dentist_id').references(() => odentalEmployees.id),
  name: text('name').notNull(),
  totalSessions: integer('total_sessions'),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0'),
  status: text('status').default('active'),
  startDate: date('start_date'),
  estimatedEnd: date('estimated_end'),
  notes: text('notes'),
  sessions: jsonb('sessions').$type<unknown[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const odentalConsentTemplates = pgTable('odental_consent_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => odentalTenantSettings.id),
  procedureType: text('procedure_type').notNull(),
  bodyTemplate: text('body_template').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const insertOdentalTenantSettingsSchema = createInsertSchema(odentalTenantSettings)
export const selectOdentalTenantSettingsSchema = createSelectSchema(odentalTenantSettings)

export type OdentalTenantSettings = typeof odentalTenantSettings.$inferSelect
export type OdentalEmployee = typeof odentalEmployees.$inferSelect
export type OdentalPatient = typeof odentalPatients.$inferSelect
export type OdentalAppointment = typeof odentalAppointments.$inferSelect
export type OdentalClinicalRecord = typeof odentalClinicalRecords.$inferSelect
export type OdentalTreatmentPlan = typeof odentalTreatmentPlans.$inferSelect
export type OdentalConsentTemplate = typeof odentalConsentTemplates.$inferSelect
