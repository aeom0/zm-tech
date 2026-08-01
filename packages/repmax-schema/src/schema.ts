import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  pgEnum,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// ENUMS
// ============================================================
export const vehicleTypeEnum = pgEnum("vehicle_type", ["CAR", "MOTO", "TRUCK", "SUV"]);
export const partConditionEnum = pgEnum("part_condition", ["NEW", "USED"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH_USD", "CASH_BS", "ZELLE", "PAGO_MOVIL", "TRANSFERENCIA", "MIXED",
]);
export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "CANCELLED", "REFUNDED"]);
export const cashSessionStatusEnum = pgEnum("cash_session_status", ["OPEN", "CLOSED"]);
export const storeUserRoleEnum = pgEnum("store_user_role", ["owner", "cashier", "inventory"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["basic", "pro", "enterprise"]);

// ============================================================
// STORES (raíz del tenant)
// ============================================================
export const stores = pgTable("stores", {
  id:           uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name:         varchar("name", { length: 255 }).notNull(),
  slug:         varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl:      text("logo_url"),
  phone:        varchar("phone", { length: 50 }),
  address:      text("address"),
  city:         varchar("city", { length: 100 }),
  customDomain: varchar("custom_domain", { length: 255 }),
  plan:         subscriptionPlanEnum("plan").default("basic"),
  isActive:     boolean("is_active").default(true),
  currencyUsd:  varchar("currency_usd", { length: 10 }).default("USD"),
  currencyBs:   varchar("currency_bs", { length: 10 }).default("BS"),
  usdBsRate:    decimal("usd_bs_rate", { precision: 10, scale: 2 }).default("36.50"),
  createdAt:    timestamp("created_at").defaultNow(),
  updatedAt:    timestamp("updated_at").defaultNow(),
});

// ============================================================
// USERS (credenciales locales para panel web / fallback JWT)
// userId en store_users puede coincidir con este id o con Supabase Auth
// ============================================================
export const users = pgTable("users", {
  id:           uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email:        varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt:    timestamp("created_at").defaultNow(),
}, (t) => ({
  emailIdx: index("idx_users_email").on(t.email),
}));

// ============================================================
// STORE_USERS (empleados con roles por tienda)
// userId referencia auth.users de Supabase o users.id local (sin FK)
// ============================================================
export const storeUsers = pgTable("store_users", {
  id:        uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId:   uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  userId:    uuid("user_id").notNull(),
  role:      storeUserRoleEnum("role").notNull().default("cashier"),
  fullName:  varchar("full_name", { length: 255 }),
  isActive:  boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqStoreUser: unique().on(t.storeId, t.userId),
  storeIdx:      index("idx_store_users_store").on(t.storeId),
  userIdx:       index("idx_store_users_user").on(t.userId),
}));

// ============================================================
// PRODUCTS (inventario de la tienda)
// ============================================================
export const products = pgTable("products", {
  id:          uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId:     uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  title:       varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  brand:       varchar("brand", { length: 100 }).notNull(),
  model:       varchar("model", { length: 100 }).notNull(),
  yearFrom:    integer("year_from"),
  yearTo:      integer("year_to"),
  vehicleType: vehicleTypeEnum("vehicle_type"),
  condition:   partConditionEnum("condition").default("NEW"),
  partNumber:  varchar("part_number", { length: 100 }),
  priceUsd:    decimal("price_usd", { precision: 12, scale: 2 }).notNull(),
  priceBs:     decimal("price_bs", { precision: 14, scale: 2 }),
  stock:       integer("stock").default(0),
  minStock:    integer("min_stock").default(1),
  photos:      text("photos").array(),
  isActive:    boolean("is_active").default(true),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
}, (t) => ({
  storeIdx:     index("idx_products_store").on(t.storeId),
  brandIdx:     index("idx_products_brand").on(t.storeId, t.brand),
  stockIdx:     index("idx_products_stock").on(t.storeId, t.stock),
  conditionIdx: index("idx_products_condition").on(t.storeId, t.condition),
}));

// ============================================================
// CUSTOMERS (mecánicos y clientes frecuentes)
// ============================================================
export const customers = pgTable("customers", {
  id:             uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId:        uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  fullName:       varchar("full_name", { length: 255 }).notNull(),
  phone:          varchar("phone", { length: 50 }),
  cedulaRif:      varchar("cedula_rif", { length: 20 }),
  email:          varchar("email", { length: 255 }),
  notes:          text("notes"),
  totalPurchases: integer("total_purchases").default(0),
  totalSpentUsd:  decimal("total_spent_usd", { precision: 12, scale: 2 }).default("0"),
  createdAt:      timestamp("created_at").defaultNow(),
}, (t) => ({
  storeIdx: index("idx_customers_store").on(t.storeId),
}));

// ============================================================
// CASH_SESSIONS (apertura/cierre de caja)
// ============================================================
export const cashSessions = pgTable("cash_sessions", {
  id:                   uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId:              uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  cashierId:            uuid("cashier_id").references(() => storeUsers.id, { onDelete: "set null" }),
  status:               cashSessionStatusEnum("status").default("OPEN"),
  openingAmountUsd:     decimal("opening_amount_usd", { precision: 12, scale: 2 }).default("0"),
  closingAmountUsd:     decimal("closing_amount_usd", { precision: 12, scale: 2 }),
  totalSalesUsd:        decimal("total_sales_usd", { precision: 12, scale: 2 }),
  totalByPaymentMethod: jsonb("total_by_payment_method").default({}),
  openedAt:             timestamp("opened_at").defaultNow(),
  closedAt:             timestamp("closed_at"),
  notes:                text("notes"),
}, (t) => ({
  storeIdx: index("idx_cash_sessions_store").on(t.storeId, t.openedAt),
}));

// ============================================================
// SALES (transacciones del POS)
// ============================================================
export const sales = pgTable("sales", {
  id:             uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId:        uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  sessionId:      uuid("session_id").references(() => cashSessions.id, { onDelete: "set null" }),
  customerId:     uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  cashierId:      uuid("cashier_id").references(() => storeUsers.id, { onDelete: "set null" }),
  invoiceNumber:  varchar("invoice_number", { length: 50 }),
  totalUsd:       decimal("total_usd", { precision: 12, scale: 2 }).notNull(),
  totalBs:        decimal("total_bs", { precision: 14, scale: 2 }),
  usdBsRate:      decimal("usd_bs_rate", { precision: 10, scale: 2 }),
  paymentMethod:  paymentMethodEnum("payment_method").notNull().default("CASH_USD"),
  paymentDetails: jsonb("payment_details").default({}),
  status:         saleStatusEnum("status").default("COMPLETED"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at").defaultNow(),
}, (t) => ({
  storeDateIdx: index("idx_sales_store_date").on(t.storeId, t.createdAt),
  sessionIdx:   index("idx_sales_session").on(t.sessionId),
}));

// ============================================================
// SALE_ITEMS (líneas de detalle de cada venta)
// ============================================================
export const saleItems = pgTable("sale_items", {
  id:              uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId:          uuid("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  productId:       uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productSnapshot: jsonb("product_snapshot").notNull(),
  quantity:        integer("quantity").notNull().default(1),
  unitPriceUsd:    decimal("unit_price_usd", { precision: 12, scale: 2 }).notNull(),
  subtotalUsd:     decimal("subtotal_usd", { precision: 12, scale: 2 }).notNull(),
}, (t) => ({
  saleIdx: index("idx_sale_items_sale").on(t.saleId),
}));

// ============================================================
// INSERT SCHEMAS (Zod)
// ============================================================
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStoreUserSchema = createInsertSchema(storeUsers).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertCashSessionSchema = createInsertSchema(cashSessions).omit({ id: true, openedAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });

// ============================================================
// TYPES
// ============================================================
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type StoreUser = typeof storeUsers.$inferSelect;
export type InsertStoreUser = z.infer<typeof insertStoreUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type CashSession = typeof cashSessions.$inferSelect;
export type InsertCashSession = z.infer<typeof insertCashSessionSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;

// ============================================================
// CONSTANTES
// ============================================================
export const POPULAR_BRANDS = [
  "Toyota", "Ford", "Chevrolet", "Hyundai", "Kia",
  "Volkswagen", "Nissan", "Honda", "Mitsubishi",
  "Empire", "Bera", "Loncin", "Dayang",
];

export const VEHICLE_TYPES = ["CAR", "MOTO", "TRUCK", "SUV"] as const;

export const PAYMENT_METHODS = [
  { value: "CASH_USD",      label: "Efectivo USD" },
  { value: "CASH_BS",       label: "Efectivo Bs" },
  { value: "ZELLE",         label: "Zelle" },
  { value: "PAGO_MOVIL",    label: "Pago Móvil" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "MIXED",         label: "Mixto" },
] as const;
