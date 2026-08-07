/**
 * Seed del inventario real ZM Tech — agosto 2026.
 * Idempotente por slug (proyectos) o name (clientes).
 *
 * Uso:
 *   pnpm --filter hub seed
 *   # o directamente:
 *   npx tsx apps/hub/scripts/seed-hub.ts
 *
 * Variables requeridas:
 *   NEXT_PUBLIC_SUPABASE_URL  (o SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Leer de apps/landing/.env.local o apps/hub/.env.local si no están en entorno.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Cargar .env.local manualmente (simple, sin dependencia dotenv) ───────────

function cargarEnvLocal(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const vars: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      vars[key] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

// Buscar vars en orden: env actual → landing → hub
const monorepoRoot = path.resolve(__dirname, "../../..");
const landingEnv = cargarEnvLocal(path.join(monorepoRoot, "apps/landing/.env.local"));
const hubEnv = cargarEnvLocal(path.join(monorepoRoot, "apps/hub/.env.local"));

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  landingEnv.NEXT_PUBLIC_SUPABASE_URL ??
  hubEnv.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  landingEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌  Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.\n" +
      "    Asegurate que exista apps/landing/.env.local con esas variables.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Tipos básicos (sin depender del paquete compilado) ───────────────────────

type ClienteStatus = "lead" | "activo" | "pausado" | "cerrado";
type ClienteSource = "landing" | "cotizador" | "referido" | "directo";
type Vertical = "beauty" | "inmobiliaria" | "wellness" | "automotriz" | "sports" | "enterprise" | "salud" | "otro";
type ProyectoType = "web" | "mobile" | "fullstack" | "bot" | "otro";
type ProyectoStatus = "propuesta" | "desarrollo" | "produccion" | "pausado" | "archivado";

interface SeedCliente {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  vertical: Vertical;
  status: ClienteStatus;
  source: ClienteSource;
  notes?: string;
}

interface SeedProyecto {
  clienteSlug?: string; // nombre del cliente para buscar su ID
  name: string;
  slug: string;
  type: ProyectoType;
  status: ProyectoStatus;
  repo_url?: string;
  stack?: string[];
  production_url?: string;
  vercel_project?: string;
  eas_project?: string;
  supabase_ref?: string;
  version?: string;
  notes?: string;
}

interface SeedContrato {
  clienteNombre: string;
  projectSlug?: string;
  amount_usd?: string;
  payment_model?: string;
  monthly_support_usd?: string;
  support_active?: boolean;
  start_date?: string;
  notes?: string;
}

// ── Datos del inventario real ─────────────────────────────────────────────────

const CLIENTES: SeedCliente[] = [
  {
    name: "ZM Lash and Nails Beauty",
    contact_name: "Vanessa",
    country: "Perú",
    city: "Lima",
    vertical: "beauty",
    status: "activo",
    source: "directo",
    notes:
      "Primer cliente de ZM Tech. Hermana de Alberto. SaaS GeemaStudio (seed real del producto). Stack: Expo SDK 54 + RN + Next.js 15 + Supabase.",
  },
  {
    name: "Guataparo Bienes Raíces",
    contact_name: "Morelba Hernández",
    country: "Venezuela",
    city: "Valencia",
    vertical: "inmobiliaria",
    status: "activo",
    source: "directo",
    notes:
      "Portal inmobiliario. Stack: Next.js 16.2 + Supabase + Cloudinary + Tailwind v4. Propuesta $435 (50/50) + $30/mes soporte.",
  },
  {
    name: "YLA — Yoga con Lógica y Alma",
    contact_name: "Yube Karina",
    vertical: "wellness",
    status: "activo",
    source: "directo",
    notes:
      "Landing 100% completa. Próximo: Fase 1 PWA. Stack: Next.js 15 + React 19 + Tailwind v4.",
  },
  {
    name: "ZetaEme Cosméticos",
    vertical: "enterprise",
    country: "Venezuela",
    status: "activo",
    source: "directo",
    notes:
      "Sistema empresarial cosméticos. Versión 2.23.1 en producción. Múltiples paneles (admin, inventario, producción, compras).",
  },
];

const PROYECTOS: SeedProyecto[] = [
  // Proyectos de clientes
  {
    clienteSlug: "ZM Lash and Nails Beauty",
    name: "ZM Lash & Nails Beauty",
    slug: "zm-lash-nails",
    type: "fullstack",
    status: "produccion",
    repo_url: "https://github.com/aeom0/ZM-Lash-and-Nails-Beauty",
    stack: ["Expo SDK 54", "React Native 0.81", "Next.js 15", "Supabase", "Drizzle ORM", "EAS", "WABA"],
    production_url: "https://zmlashnails.com",
    supabase_ref: "udelxwwnyivknslueerr",
    notes: "Web: zmlashnails.com · App: EAS producción · WABA bot +51 981 444 430",
  },
  {
    clienteSlug: "Guataparo Bienes Raíces",
    name: "Guataparo Bienes Raíces",
    slug: "guataparobr",
    type: "web",
    status: "desarrollo",
    repo_url: "https://github.com/aeom0/guataparobr",
    stack: ["Next.js 16.2", "Supabase", "Cloudinary", "Tailwind v4", "Turborepo"],
    production_url: "https://guataparobr.com",
    vercel_project: "guataparo",
    notes: "Fase 0 completa. Fase 1 en progreso (Supabase + Auth).",
  },
  {
    clienteSlug: "YLA — Yoga con Lógica y Alma",
    name: "YLA MVP",
    slug: "yla-mvp",
    type: "web",
    status: "produccion",
    repo_url: "https://github.com/aeom0/yla-mvp",
    stack: ["Next.js 15", "React 19", "Tailwind v4", "Supabase"],
    notes: "Landing 100% completa. Próximo: Fase 1 PWA con Stripe.",
  },
  {
    clienteSlug: "ZetaEme Cosméticos",
    name: "ZetaEme Enterprise Suite",
    slug: "zetaeme-enterprise-suite",
    type: "fullstack",
    status: "produccion",
    repo_url: "https://github.com/aeom0/zetaeme-enterprise-suite",
    stack: ["Next.js 15.5", "React 19", "Expo SDK 54", "Supabase", "Turborepo"],
    production_url: "https://admin.zetaemecosmeticos.com",
    version: "2.23.1",
    notes: "Múltiples paneles. 161/161 tests. FEFO + BOM + Art. 177 SENIAT.",
  },

  // Productos propios ZM Tech (sin cliente)
  {
    name: "Landing ZM Tech",
    slug: "landing-zmtechdev",
    type: "web",
    status: "produccion",
    repo_url: "https://github.com/aeom0/zm-tech",
    stack: ["Next.js 16", "Tailwind v4", "Supabase", "pnpm"],
    production_url: "https://zmtechdev.com",
    vercel_project: "zmtech",
    supabase_ref: "llacowjutjfefboqgfnj",
    notes: "App /es · /en. Cotizador integrado.",
  },
  {
    name: "GeemaStudio",
    slug: "geemastudio",
    type: "fullstack",
    status: "desarrollo",
    repo_url: "https://github.com/aeom0/zm-tech",
    stack: ["Expo SDK 56", "React Native 0.85", "Next.js 15", "Supabase", "Drizzle ORM"],
    supabase_ref: "udelxwwnyivknslueerr",
    notes: "SaaS multi-tenant para salones de belleza en LATAM. En monorepo zm-tech.",
  },
  {
    name: "OdentalPro",
    slug: "odentalpro",
    type: "fullstack",
    status: "desarrollo",
    repo_url: "https://github.com/aeom0/zm-tech",
    stack: ["Next.js 16", "Expo SDK 56", "Supabase", "Tailwind v4"],
    supabase_ref: "llacowjutjfefboqgfnj",
    notes: "SaaS para clínicas odontológicas. En monorepo zm-tech.",
  },
  {
    name: "RepMAX Business Suite",
    slug: "repmax",
    type: "fullstack",
    status: "desarrollo",
    repo_url: "https://github.com/aeom0/zm-tech",
    stack: ["Next.js 16", "Expo SDK 56", "Supabase", "Drizzle ORM"],
    supabase_ref: "llacowjutjfefboqgfnj",
    notes: "SaaS B2B para tiendas de autopartes Venezuela. En monorepo zm-tech.",
  },
  {
    name: "CondoApp",
    slug: "condoapp",
    type: "fullstack",
    status: "desarrollo",
    repo_url: "https://github.com/aeom0/condoapp",
    stack: ["Next.js 15", "Expo", "Express", "Drizzle ORM", "Supabase"],
    notes: "SaaS para gestión de condominios LATAM.",
  },
  {
    name: "IA Scout360",
    slug: "ia-scout360",
    type: "fullstack",
    status: "desarrollo",
    repo_url: "https://github.com/aeom0/ia-scout360",
    stack: ["Next.js 15", "React Native 0.81", "Expo SDK 54", "Supabase"],
    notes: "Plataforma de scouting deportivo con análisis IA.",
  },
];

const CONTRATOS: SeedContrato[] = [
  {
    clienteNombre: "Guataparo Bienes Raíces",
    projectSlug: "guataparobr",
    amount_usd: "435.00",
    payment_model: "50/50",
    monthly_support_usd: "30.00",
    support_active: true,
    start_date: "2026-06-01",
    notes: "Propuesta original: $435 USD en dos cuotas (50% inicio / 50% entrega). Soporte mensual $30/mes.",
  },
  {
    clienteNombre: "ZM Lash and Nails Beauty",
    projectSlug: "zm-lash-nails",
    amount_usd: "0.00",
    payment_model: "proyecto",
    monthly_support_usd: "30.00",
    support_active: true,
    notes: "Cliente fundacional — proyecto semilla de GeemaStudio.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function upsertCliente(data: SeedCliente): Promise<string | null> {
  const { data: existente } = await supabase
    .from("hub_clients")
    .select("id")
    .eq("name", data.name)
    .single();

  if (existente) {
    console.log(`  ✓ Cliente ya existe: ${data.name}`);
    return existente.id as string;
  }

  const { data: nuevo, error } = await supabase
    .from("hub_clients")
    .insert(data)
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Error insertando cliente ${data.name}: ${error.message}`);
    return null;
  }

  console.log(`  + Cliente creado: ${data.name}`);
  return nuevo.id as string;
}

async function upsertProyecto(
  data: SeedProyecto,
  clienteIdMap: Map<string, string>,
): Promise<string | null> {
  const { data: existente } = await supabase
    .from("hub_projects")
    .select("id")
    .eq("slug", data.slug)
    .single();

  const client_id = data.clienteSlug
    ? (clienteIdMap.get(data.clienteSlug) ?? null)
    : null;

  const payload = {
    client_id,
    name: data.name,
    slug: data.slug,
    type: data.type,
    status: data.status,
    repo_url: data.repo_url ?? null,
    stack: data.stack ?? [],
    production_url: data.production_url ?? null,
    vercel_project: data.vercel_project ?? null,
    eas_project: data.eas_project ?? null,
    supabase_ref: data.supabase_ref ?? null,
    version: data.version ?? null,
    notes: data.notes ?? null,
  };

  if (existente) {
    const { error } = await supabase
      .from("hub_projects")
      .update(payload)
      .eq("id", existente.id);
    if (error) {
      console.error(`  ✗ Error actualizando proyecto ${data.slug}: ${error.message}`);
      return null;
    }
    console.log(`  ✓ Proyecto actualizado: ${data.name}`);
    return existente.id as string;
  }

  const { data: nuevo, error } = await supabase
    .from("hub_projects")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Error insertando proyecto ${data.slug}: ${error.message}`);
    return null;
  }

  console.log(`  + Proyecto creado: ${data.name}`);
  return nuevo.id as string;
}

async function upsertContrato(
  data: SeedContrato,
  clienteIdMap: Map<string, string>,
  proyectoIdMap: Map<string, string>,
): Promise<void> {
  const client_id = clienteIdMap.get(data.clienteNombre);
  if (!client_id) {
    console.error(`  ✗ Cliente no encontrado para contrato: ${data.clienteNombre}`);
    return;
  }

  const project_id = data.projectSlug
    ? (proyectoIdMap.get(data.projectSlug) ?? null)
    : null;

  // Chequear si ya existe un contrato para este cliente+proyecto
  const { data: existente } = await supabase
    .from("hub_contracts")
    .select("id")
    .eq("client_id", client_id)
    .eq("project_id", project_id ?? "")
    .single();

  const payload = {
    client_id,
    project_id: project_id ?? null,
    amount_usd: data.amount_usd ?? null,
    payment_model: data.payment_model ?? "50/50",
    monthly_support_usd: data.monthly_support_usd ?? null,
    support_active: data.support_active ?? false,
    start_date: data.start_date ?? null,
    notes: data.notes ?? null,
  };

  if (existente) {
    await supabase.from("hub_contracts").update(payload).eq("id", existente.id);
    console.log(`  ✓ Contrato actualizado: ${data.clienteNombre}`);
    return;
  }

  const { error } = await supabase.from("hub_contracts").insert(payload);
  if (error) {
    console.error(`  ✗ Error insertando contrato ${data.clienteNombre}: ${error.message}`);
    return;
  }
  console.log(`  + Contrato creado: ${data.clienteNombre}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Seed Hub ZM Tech — agosto 2026\n");

  // Clientes
  console.log("── Clientes ──────────────────────────────");
  const clienteIdMap = new Map<string, string>();
  for (const cliente of CLIENTES) {
    const id = await upsertCliente(cliente);
    if (id) clienteIdMap.set(cliente.name, id);
  }

  // Proyectos
  console.log("\n── Proyectos ─────────────────────────────");
  const proyectoIdMap = new Map<string, string>();
  for (const proyecto of PROYECTOS) {
    const id = await upsertProyecto(proyecto, clienteIdMap);
    if (id) proyectoIdMap.set(proyecto.slug, id);
  }

  // Contratos
  console.log("\n── Contratos ─────────────────────────────");
  for (const contrato of CONTRATOS) {
    await upsertContrato(contrato, clienteIdMap, proyectoIdMap);
  }

  console.log("\n✅  Seed completado.\n");
}

void main().catch((err: unknown) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
