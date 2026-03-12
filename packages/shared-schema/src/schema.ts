import { sql, relations } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  color: text("color").notNull().default("#D4AF37"),
  role: text("role").notNull().default("employee"),
  commissionPercentage: integer("commission_percentage").notNull().default(0),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceCategories = pgTable("service_categories", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

export const services = pgTable("services", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  clientDocument: text("client_document"),
  employeeId: varchar("employee_id").references(() => employees.id),
  serviceId: varchar("service_id").references(() => services.id),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("countable"),
  category: text("category").notNull().default("insumos"), // unas | pestanas_cejas | insumos
  quantity: integer("quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  unit: text("unit").notNull().default("unidad"),
  price: decimal("price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const whatsappSessions = pgTable("whatsapp_sessions", {
  phone: text("phone").primaryKey(),
  cartServiceIds: text("cart_service_ids").notNull().default("[]"),
  step: text("step").default("browsing"),
  parsedDatetime: timestamp("parsed_datetime"),
  employeeAssignments: text("employee_assignments").default("{}"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabla de perfiles vinculada a Supabase Auth (auth.users)
// y opcionalmente a una chica en employees.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: text("role").notNull(), // dev | owner | staff
  employeeId: varchar("employee_id").references(() => employees.id),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull().default("cash"),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  isAbono: boolean("is_abono").notNull().default(false),
  serviceTotal: decimal("service_total", { precision: 10, scale: 2 }),
});

export const employeesRelations = relations(employees, ({ many }) => ({
  appointments: many(appointments),
}));

export const serviceCategoriesRelations = relations(
  serviceCategories,
  ({ many }) => ({
    services: many(services),
  }),
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  appointments: many(appointments),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
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
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  employee: one(employees, {
    fields: [profiles.employeeId],
    references: [employees.id],
  }),
}));

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});
export const insertServiceCategorySchema = createInsertSchema(
  serviceCategories,
).omit({ id: true });
export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});
export const insertInventoryItemSchema = createInsertSchema(
  inventoryItems,
).omit({ id: true, createdAt: true });
export const insertWhatsappSessionSchema = createInsertSchema(
  whatsappSessions,
).omit({ updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
});

export const tenantSettings = pgTable("tenant_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  primaryColor: text("primary_color").notNull().default("#7B2D8E"),
  accentColor: text("accent_color").notNull().default("#D4AF37"),
  currencyCode: text("currency_code").notNull().default("USD"),
  currencySymbol: text("currency_symbol").notNull().default("$"),
  country: text("country").notNull().default(""),
  language: text("language").notNull().default("es"),
  staffTerminology: text("staff_terminology").notNull().default("especialistas"),
  staffSingularTerminology: text("staff_singular_terminology").notNull().default("especialista"),
  appointmentTerminology: text("appointment_terminology").notNull().default("cita"),
  businessHours: jsonb("business_hours"),
  contactInfo: jsonb("contact_info"),
  commissionStaff: integer("commission_staff").notNull().default(60),
  commissionHouse: integer("commission_house").notNull().default(40),
  isConfigured: boolean("is_configured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTenantSettingsSchema = createInsertSchema(tenantSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Profile = typeof profiles.$inferSelect;
export type TenantSettings = typeof tenantSettings.$inferSelect;
export type InsertTenantSettings = z.infer<typeof insertTenantSettingsSchema>;
