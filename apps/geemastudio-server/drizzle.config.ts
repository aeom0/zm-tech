import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL, ensure the database is provisioned')
}

export default defineConfig({
  // Salida de `pnpm db:generate` (migraciones versionadas). `pnpm db:push` usa solo el schema.
  // RLS, funciones y políticas consolidadas ya aplicadas en Supabase — ver apps/geemastudio-server/supabase/migrations/00000000000000_baseline_full_schema.sql
  out: './migrations',
  schema: '../../packages/shared-schema/src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
