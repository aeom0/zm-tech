import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  bigint,
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
import type { MlListingStatus } from "./mlListing";
import type { MlConnectionStatusDb } from "./mlConnection";

export {
  ML_LISTING_STATUSES,
  ML_REQUIRED_ATTRIBUTE_TAGS,
  type MlListingStatus,
  type MlAttributeTag,
  type MlAttribute,
  type MlCategoryPrediction,
  type RepmaxMlListing,
  type RepmaxProduct as RepmaxProductMlSource,
} from "./mlListing";

export {
  ML_CONNECTION_STATUSES,
  ML_SITE_BY_COUNTRY,
  type MlConnectionStatusDb,
  type MlCountryCode,
  type MlSiteId,
  type RepmaxMlConnection,
  type MlConnectionUiStatus,
} from "./mlConnection";

// ============================================================
// ENUMS (prefijo repmax_ — Postgres no namespacea enums por tabla)
// ============================================================
export const vehicleTypeEnum = pgEnum("repmax_vehicle_type", [
  "CAR",
  "MOTO",
  "TRUCK",
  "SUV",
]);
export const partConditionEnum = pgEnum("repmax_part_condition", ["NEW", "USED"]);
export const paymentMethodEnum = pgEnum("repmax_payment_method", [
  "CASH_USD",
  "CASH_BS",
  "ZELLE",
  "PAGO_MOVIL",
  "TRANSFERENCIA",
  "MIXED",
]);
export const saleStatusEnum = pgEnum("repmax_sale_status", [
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);
export const cashSessionStatusEnum = pgEnum("repmax_cash_session_status", [
  "OPEN",
  "CLOSED",
]);
export const storeUserRoleEnum = pgEnum("repmax_store_user_role", [
  "owner",
  "cashier",
  "inventory",
]);
export const subscriptionPlanEnum = pgEnum("repmax_subscription_plan", [
  "basic",
  "pro",
  "enterprise",
]);

// Elegidos durante el onboarding mobile. NOTA: estas 4 columnas de
// repmax_stores usan CHECK constraints en SQL (no pgEnum de Postgres)
// porque la migracion 20260808120000_repmax_store_onboarding_fields.sql
// las declara como `text` + CHECK, no como tipos ENUM nativos. Se
// documentan aqui como unions TS para mantener el contrato, pero no
// se usan con pgEnum() al declarar la tabla.
export const STORE_TYPES = ["repuesteria", "taller", "ambos"] as const;
export type StoreType = (typeof STORE_TYPES)[number];

export const VEHICLE_FOCUS_OPTIONS = ["CARS", "MOTOS", "BOTH"] as const;
export type VehicleFocus = (typeof VEHICLE_FOCUS_OPTIONS)[number];

export const THEME_KEYS = ["turbo", "acero", "terreno"] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

export const COUNTRY_CODES = ["VE", "CO", "PE", "EC", "DO"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

// ============================================================
// STORES (raiz del tenant)
// ============================================================
export const stores = pgTable("repmax_stores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logo_url"),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  customDomain: varchar("custom_domain", { length: 255 }),
  plan: subscriptionPlanEnum("plan").default("basic"),
  isActive: boolean("is_active").default(true),
  currencyUsd: varchar("currency_usd", { length: 10 }).default("USD"),
  currencyBs: varchar("currency_bs", { length: 10 }).default("BS"),
  usdBsRate: decimal("usd_bs_rate", { precision: 10, scale: 2 }).default("36.50"),
  // Preferencias capturadas en el onboarding mobile (ver migracion
  // 20260808120000_repmax_store_onboarding_fields.sql)
  storeType: text("store_type").$type<StoreType>().notNull().default("repuesteria"),
  vehicleFocus: text("vehicle_focus").$type<VehicleFocus>().notNull().default("BOTH"),
  themeKey: text("theme_key").$type<ThemeKey>().notNull().default("turbo"),
  countryCode: text("country_code").$type<CountryCode>().notNull().default("VE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// STORE_USERS — user_id → auth.users.id (sin tabla users local)
// ============================================================
export const storeUsers = pgTable(
  "repmax_store_users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    /** UUID de auth.users (FK se declara en la migracion SQL) */
    userId: uuid("user_id").notNull(),
    role: storeUserRoleEnum("role").notNull().default("cashier"),
    fullName: varchar("full_name", { length: 255 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqStoreUser: unique("uniq_repmax_store_user").on(t.storeId, t.userId),
    storeIdx: index("idx_repmax_store_users_store").on(t.storeId),
    userIdx: index("idx_repmax_store_users_user").on(t.userId),
  }),
);

// ============================================================
// PRODUCTS
// ============================================================
export const products = pgTable(
  "repmax_products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    brand: varchar("brand", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    yearFrom: integer("year_from"),
    yearTo: integer("year_to"),
    vehicleType: vehicleTypeEnum("vehicle_type"),
    condition: partConditionEnum("condition").default("NEW"),
    partNumber: varchar("part_number", { length: 100 }),
    color: varchar("color", { length: 80 }),
    priceUsd: decimal("price_usd", { precision: 12, scale: 2 }).notNull(),
    priceBs: decimal("price_bs", { precision: 14, scale: 2 }),
    stock: integer("stock").default(0),
    minStock: integer("min_stock").default(1),
    photos: text("photos").array(),
    mlPublishIntent: boolean("ml_publish_intent").notNull().default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    storeIdx: index("idx_repmax_products_store").on(t.storeId),
    brandIdx: index("idx_repmax_products_brand").on(t.storeId, t.brand),
    stockIdx: index("idx_repmax_products_stock").on(t.storeId, t.stock),
    conditionIdx: index("idx_repmax_products_condition").on(
      t.storeId,
      t.condition,
    ),
  }),
);

// ============================================================
// ML_LISTINGS — 1:1 opcional con products (fase 1: predicción; fase 2: ítem)
// Status es text + CHECK en SQL (no pgEnum), igual que store_type.
// ============================================================
export const mlListings = pgTable(
  "repmax_ml_listings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    mlDomainId: text("ml_domain_id"),
    mlCategoryId: text("ml_category_id"),
    mlCategoryName: text("ml_category_name"),
    mlAttributesSnapshot: jsonb("ml_attributes_snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    predictionConfidence: smallint("prediction_confidence"),
    status: text("status").$type<MlListingStatus>().notNull().default("draft"),
    mlItemId: text("ml_item_id"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqProduct: unique("uniq_repmax_ml_listings_product").on(t.productId),
    storeIdx: index("idx_repmax_ml_listings_store").on(t.storeId),
  }),
);

// ============================================================
// ML_CONNECTIONS — OAuth 1:1 por tienda (tokens solo service_role)
// Status es text + CHECK en SQL (no pgEnum).
// ============================================================
export const mlConnections = pgTable(
  "repmax_ml_connections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    mlUserId: bigint("ml_user_id", { mode: "number" }).notNull(),
    siteId: text("site_id").notNull().default("MLV"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: text("status").$type<MlConnectionStatusDb>().notNull().default("active"),
    connectedBy: uuid("connected_by").references(() => storeUsers.id),
    connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqStore: unique("uniq_repmax_ml_connections_store").on(t.storeId),
  }),
);

// ============================================================
// CUSTOMERS
// ============================================================
export const customers = pgTable(
  "repmax_customers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    cedulaRif: varchar("cedula_rif", { length: 20 }),
    email: varchar("email", { length: 255 }),
    notes: text("notes"),
    totalPurchases: integer("total_purchases").default(0),
    totalSpentUsd: decimal("total_spent_usd", {
      precision: 12,
      scale: 2,
    }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    storeIdx: index("idx_repmax_customers_store").on(t.storeId),
  }),
);

// ============================================================
// CASH_SESSIONS
// ============================================================
export const cashSessions = pgTable(
  "repmax_cash_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    cashierId: uuid("cashier_id").references(() => storeUsers.id, {
      onDelete: "set null",
    }),
    status: cashSessionStatusEnum("status").default("OPEN"),
    openingAmountUsd: decimal("opening_amount_usd", {
      precision: 12,
      scale: 2,
    }).default("0"),
    closingAmountUsd: decimal("closing_amount_usd", {
      precision: 12,
      scale: 2,
    }),
    totalSalesUsd: decimal("total_sales_usd", { precision: 12, scale: 2 }),
    totalByPaymentMethod: jsonb("total_by_payment_method").default({}),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (t) => ({
    storeIdx: index("idx_repmax_cash_sessions_store").on(t.storeId, t.openedAt),
  }),
);

// ============================================================
// SALES
// ============================================================
export const sales = pgTable(
  "repmax_sales",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => cashSessions.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    cashierId: uuid("cashier_id").references(() => storeUsers.id, {
      onDelete: "set null",
    }),
    invoiceNumber: varchar("invoice_number", { length: 50 }),
    totalUsd: decimal("total_usd", { precision: 12, scale: 2 }).notNull(),
    totalBs: decimal("total_bs", { precision: 14, scale: 2 }),
    usdBsRate: decimal("usd_bs_rate", { precision: 10, scale: 2 }),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("CASH_USD"),
    paymentDetails: jsonb("payment_details").default({}),
    status: saleStatusEnum("status").default("COMPLETED"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    storeDateIdx: index("idx_repmax_sales_store_date").on(
      t.storeId,
      t.createdAt,
    ),
    sessionIdx: index("idx_repmax_sales_session").on(t.sessionId),
  }),
);

// ============================================================
// SALE_ITEMS
// ============================================================
export const saleItems = pgTable(
  "repmax_sale_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productSnapshot: jsonb("product_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceUsd: decimal("unit_price_usd", {
      precision: 12,
      scale: 2,
    }).notNull(),
    subtotalUsd: decimal("subtotal_usd", {
      precision: 12,
      scale: 2,
    }).notNull(),
  },
  (t) => ({
    saleIdx: index("idx_repmax_sale_items_sale").on(t.saleId),
  }),
);

// ============================================================
// INSERT SCHEMAS (Zod)
// ============================================================
export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertStoreUserSchema = createInsertSchema(storeUsers).omit({
  id: true,
  createdAt: true,
});
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMlListingSchema = createInsertSchema(mlListings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMlConnectionSchema = createInsertSchema(mlConnections).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});
export const insertCashSessionSchema = createInsertSchema(cashSessions).omit({
  id: true,
  openedAt: true,
});
export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
});

// ============================================================
// TYPES
// ============================================================
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type StoreUser = typeof storeUsers.$inferSelect;
export type InsertStoreUser = z.infer<typeof insertStoreUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type MlListing = typeof mlListings.$inferSelect;
export type InsertMlListing = z.infer<typeof insertMlListingSchema>;

export type MlConnection = typeof mlConnections.$inferSelect;
export type InsertMlConnection = z.infer<typeof insertMlConnectionSchema>;

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
  "Toyota",
  "Ford",
  "Chevrolet",
  "Hyundai",
  "Kia",
  "Volkswagen",
  "Nissan",
  "Honda",
  "Mitsubishi",
  "Empire",
  "Bera",
  "Loncin",
  "Dayang",
];

export const VEHICLE_TYPES = ["CAR", "MOTO", "TRUCK", "SUV"] as const;

export const PAYMENT_METHODS = [
  { value: "CASH_USD", label: "Efectivo USD" },
  { value: "CASH_BS", label: "Efectivo Bs" },
  { value: "ZELLE", label: "Zelle" },
  { value: "PAGO_MOVIL", label: "Pago Móvil" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "MIXED", label: "Mixto" },
] as const;
