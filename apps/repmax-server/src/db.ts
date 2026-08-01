// ============================================================
// Conexión Drizzle + PostgreSQL para el servidor Express
// ============================================================

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@repmax/repmax-schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
