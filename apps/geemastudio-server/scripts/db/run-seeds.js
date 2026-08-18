/**
 * Ejecuta los scripts SQL de datos iniciales usando DATABASE_URL (.env).
 * Compatible con Supabase y PostgreSQL local; no crea ni modifica roles.
 *
 * Uso (desde la raíz del proyecto): node scripts/db/run-seeds.js
 */
require('dotenv/config')
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const dir = __dirname

function runSql(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  return pool.query(sql)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Error: DATABASE_URL no está definida. Revisa tu .env')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url })

  try {
    console.log('Ejecutando seed-services-template.sql...')
    await runSql(pool, path.join(dir, 'seed-services-template.sql'))
    console.log('seed-services-template.sql listo.\n')

    console.log('Ejecutando seed-employees-template.sql...')
    await runSql(pool, path.join(dir, 'seed-employees-template.sql'))
    console.log('seed-employees-template.sql listo.\n')

    console.log('Seeds ejecutados correctamente.')
  } catch (err) {
    console.error('Error ejecutando seeds:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
