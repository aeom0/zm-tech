// ============================================================
// Conexión Drizzle + PostgreSQL para el servidor Express
// ============================================================

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as repmaxSchema from "@repmax/repmax-schema";
import { users } from "./legacy-users";

/** Schema Drizzle: tablas repmax_* + users legacy (Express JWT hasta fase 03) */
const schema = { ...repmaxSchema, users };

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
