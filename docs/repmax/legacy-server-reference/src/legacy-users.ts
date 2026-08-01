/**
 * Tabla local `users` solo para Express+JWT (fase 01–02).
 * No se migra a Supabase — fase 03 usa auth.users.
 */
import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    emailIdx: index("idx_users_email").on(t.email),
  }),
);
