/**
 * Crea usuarios en Supabase Auth y filas en public.profiles.
 * Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env
 * Ejecutar una sola vez: node scripts/seed-auth-users.mjs
 *
 * Service role key: Supabase Dashboard → Settings → API → service_role (secret)
 */

import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env\n" +
      "Añade SUPABASE_SERVICE_ROLE_KEY desde Supabase Dashboard → Settings → API → service_role"
  );
  process.exit(1);
}

const PASSWORD_INICIAL = process.env.SEED_AUTH_PASSWORD || "Zmlash2025!";

const USUARIOS = [
  {
    email: "alberto@zmlashnails.com",
    full_name: "Alberto Orta",
    role: "dev",
    employee_id: null,
  },
  {
    email: "vanessa@zmlashnails.com",
    full_name: "Vanessa Douglas",
    role: "owner",
    employee_id: "emp-vanessa",
  },
  {
    email: "romina@zmlashnails.com",
    full_name: "Romina Melgar",
    role: "staff",
    employee_id: "emp-romina",
  },
  {
    email: "stephani@zmlashnails.com",
    full_name: "Stephani Manrique",
    role: "staff",
    employee_id: "emp-sthefani",
  },
  {
    email: "yosaida@zmlashnails.com",
    full_name: "Yosaida del Valle",
    role: "staff",
    employee_id: "emp-yosaida",
  },
];

async function crearUsuario(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.id;
}

async function insertarPerfil(id, role, employee_id, full_name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id,
      role,
      employee_id,
      full_name,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Profiles: ${res.status} ${err}`);
  }
}

async function main() {
  console.log("Creando usuarios en Supabase Auth y perfiles...\n");

  for (const u of USUARIOS) {
    try {
      const userId = await crearUsuario(u.email, PASSWORD_INICIAL);
      await insertarPerfil(userId, u.role, u.employee_id, u.full_name);
      console.log(`  OK ${u.email} (${u.role})`);
    } catch (e) {
      if (e.message.includes("already been registered") || e.message.includes("duplicate")) {
        console.log(`  SKIP ${u.email} (ya existe)`);
      } else {
        console.error(`  ERROR ${u.email}:`, e.message);
      }
    }
  }

  console.log("\nContraseña inicial para todos: " + PASSWORD_INICIAL);
  console.log("Recomendación: que cada uno cambie su contraseña desde la app o desde Supabase (Auth → Users).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
