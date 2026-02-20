/**
 * Crea usuarios en Supabase Auth y filas en public.profiles.
 * Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env
 * Ejecutar una sola vez: node scripts/seed-auth-users.mjs
 *
 * Service role key: Supabase Dashboard → Settings → API → service_role (secret)
 *
 * INSTRUCCIONES:
 * Reemplaza los emails y nombres ficticios de abajo con los datos reales
 * de tu equipo antes de ejecutar este script.
 * Los employee_id deben coincidir con los IDs del seed-employees-template.sql.
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

// Cambia esta contraseña antes de ejecutar en producción
const PASSWORD_INICIAL = process.env.SEED_AUTH_PASSWORD || "SalonPro2025!";

// ─── Reemplaza estos datos con los de tu equipo ───────────────────────────────
const USUARIOS = [
  {
    // Desarrollador / administrador técnico (acceso total, sin employee_id)
    email: "dev@ejemplo.com",
    full_name: "Administrador",
    role: "dev",
    employee_id: null,
  },
  {
    // Dueño/a del negocio (acceso total + perfil de empleado)
    email: "propietario@ejemplo.com",
    full_name: "Propietario/a",
    role: "owner",
    employee_id: "emp-propietario",
  },
  {
    // Personal 1 (acceso limitado: Agenda + Mis ganancias)
    email: "empleado1@ejemplo.com",
    full_name: "Empleado/a 1",
    role: "staff",
    employee_id: "emp-uno",
  },
  {
    // Personal 2
    email: "empleado2@ejemplo.com",
    full_name: "Empleado/a 2",
    role: "staff",
    employee_id: "emp-dos",
  },
  {
    // Personal 3
    email: "empleado3@ejemplo.com",
    full_name: "Empleado/a 3",
    role: "staff",
    employee_id: "emp-tres",
  },
];
// ─────────────────────────────────────────────────────────────────────────────

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
