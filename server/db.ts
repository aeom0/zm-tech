import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@geemastudio/shared-schema/schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://alber:salonpro@localhost:5432/salonpro",
});

export const db = drizzle(pool, { schema });
