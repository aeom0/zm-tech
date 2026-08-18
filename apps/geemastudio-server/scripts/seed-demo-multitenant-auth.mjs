/**
 * PASO 1–2: Borra usuarios Auth viejos y crea los 13 usuarios demo (Admin API).
 * Requiere SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en .env
 * Imprime JSON { "email": "uuid" } en stdout para pegar en SQL (MCP).
 */
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = process.env.SEED_AUTH_PASSWORD || 'Geema2025!'

const EMAILS_BORRAR = [
  'dev@ejemplo.com',
  'propietario@ejemplo.com',
  'empleado1@ejemplo.com',
  'empleado2@ejemplo.com',
  'empleado3@ejemplo.com',
]

const USUARIOS_CREAR = [
  { email: 'dev@ejemplo.com', full_name: 'Administrador' },
  { email: 'demo.salon@ejemplo.com', full_name: 'Gabriela Torres' },
  { email: 'demo.nails@ejemplo.com', full_name: 'Valentina Ríos' },
  { email: 'demo.barberia@ejemplo.com', full_name: 'Carlos Mendoza' },
  { email: 'demo.estetica@ejemplo.com', full_name: 'Sofía Navarro' },
  { email: 'staff.salon1@ejemplo.com', full_name: 'Camila Vega' },
  { email: 'staff.salon2@ejemplo.com', full_name: 'Daniela Cruz' },
  { email: 'staff.nails1@ejemplo.com', full_name: 'Isabella Mora' },
  { email: 'staff.nails2@ejemplo.com', full_name: 'Luciana Pérez' },
  { email: 'staff.barber1@ejemplo.com', full_name: 'Miguel Ángel Ruiz' },
  { email: 'staff.barber2@ejemplo.com', full_name: 'Andrés Gómez' },
  { email: 'staff.estetica1@ejemplo.com', full_name: 'Natalia Vargas' },
  { email: 'staff.estetica2@ejemplo.com', full_name: 'Paola Ramos' },
]

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  apikey: SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
}

async function listUsersPage(page = 1) {
  const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', '200')
  const res = await fetch(url, {
    headers: { Authorization: headers.Authorization, apikey: headers.apikey },
  })
  if (!res.ok) throw new Error(`list users ${res.status}: ${await res.text()}`)
  return res.json()
}

async function deleteUser(userId) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: headers.Authorization, apikey: headers.apikey },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete ${userId}: ${res.status} ${await res.text()}`)
  }
}

async function borrarPorEmails(emailsSet) {
  let page = 1
  const toDelete = []
  for (;;) {
    const data = await listUsersPage(page)
    const users = data.users ?? []
    for (const u of users) {
      if (u.email && emailsSet.has(u.email.toLowerCase())) {
        toDelete.push({ id: u.id, email: u.email })
      }
    }
    if (users.length < 200) break
    page += 1
  }
  for (const { id, email } of toDelete) {
    await deleteUser(id)
    console.error(`[auth] eliminado: ${email}`)
  }
}

async function crearUsuario(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`create ${email}: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.id
}

async function main() {
  // Borrar viejos + cualquier email del lote nuevo (re-ejecución idempotente).
  const set = new Set(
    [...EMAILS_BORRAR, ...USUARIOS_CREAR.map((u) => u.email)].map((e) => e.toLowerCase())
  )
  console.error('[auth] borrando usuarios existentes (emails del seed)...')
  await borrarPorEmails(set)

  /** @type {Record<string, string>} */
  const ids = {}
  console.error('[auth] creando 13 usuarios...')
  for (const u of USUARIOS_CREAR) {
    const id = await crearUsuario(u.email)
    ids[u.email] = id
    console.error(`[auth] OK ${u.email} → ${id}`)
  }

  console.log(JSON.stringify(ids, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
