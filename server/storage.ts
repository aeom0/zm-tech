import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  employees, services, serviceCategories, clients, appointments,
  inventoryItems, payments,
  type Employee, type InsertEmployee,
  type Service, type InsertService,
  type ServiceCategory, type InsertServiceCategory,
  type Client, type InsertClient,
  type Appointment, type InsertAppointment,
  type InventoryItem, type InsertInventoryItem,
  type Payment, type InsertPayment,
} from "@salonpro/shared-schema";

// ── Employees ──────────────────────────────────────────────────────────────
export async function getEmployees(): Promise<Employee[]> {
  return db.select().from(employees).orderBy(employees.name);
}

export async function getEmployee(id: string): Promise<Employee | undefined> {
  const [emp] = await db.select().from(employees).where(eq(employees.id, id));
  return emp;
}

export async function createEmployee(data: InsertEmployee): Promise<Employee> {
  const [emp] = await db.insert(employees).values(data).returning();
  return emp;
}

export async function updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
  const [emp] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
  return emp;
}

export async function deleteEmployee(id: string): Promise<void> {
  await db.delete(employees).where(eq(employees.id, id));
}

// ── Service Categories ─────────────────────────────────────────────────────
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  return db.select().from(serviceCategories).orderBy(serviceCategories.order);
}

export async function createServiceCategory(data: InsertServiceCategory): Promise<ServiceCategory> {
  const [cat] = await db.insert(serviceCategories).values(data).returning();
  return cat;
}

// ── Services ───────────────────────────────────────────────────────────────
export async function getServices(): Promise<Service[]> {
  return db.select().from(services).orderBy(services.name);
}

export async function getService(id: string): Promise<Service | undefined> {
  const [svc] = await db.select().from(services).where(eq(services.id, id));
  return svc;
}

export async function createService(data: InsertService): Promise<Service> {
  const [svc] = await db.insert(services).values(data).returning();
  return svc;
}

export async function updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined> {
  const [svc] = await db.update(services).set(data).where(eq(services.id, id)).returning();
  return svc;
}

export async function deleteService(id: string): Promise<void> {
  await db.delete(services).where(eq(services.id, id));
}

// ── Clients ────────────────────────────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
  return db.select().from(clients).orderBy(clients.name);
}

export async function getClient(id: string): Promise<Client | undefined> {
  const [c] = await db.select().from(clients).where(eq(clients.id, id));
  return c;
}

export async function createClient(data: InsertClient): Promise<Client> {
  const [c] = await db.insert(clients).values(data).returning();
  return c;
}

export async function updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
  const [c] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
  return c;
}

// ── Appointments ───────────────────────────────────────────────────────────
export async function getAppointments(filters?: { dateFrom?: Date; dateTo?: Date; employeeId?: string }): Promise<Appointment[]> {
  const conditions = [];
  if (filters?.dateFrom) conditions.push(gte(appointments.date, filters.dateFrom));
  if (filters?.dateTo)   conditions.push(lte(appointments.date, filters.dateTo));
  if (filters?.employeeId) conditions.push(eq(appointments.employeeId, filters.employeeId));

  const query = conditions.length
    ? db.select().from(appointments).where(and(...conditions))
    : db.select().from(appointments);

  return query.orderBy(desc(appointments.date));
}

export async function getAppointment(id: string): Promise<Appointment | undefined> {
  const [a] = await db.select().from(appointments).where(eq(appointments.id, id));
  return a;
}

export async function createAppointment(data: InsertAppointment): Promise<Appointment> {
  const [a] = await db.insert(appointments).values(data).returning();
  return a;
}

export async function updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
  const [a] = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
  return a;
}

export async function deleteAppointment(id: string): Promise<void> {
  await db.delete(appointments).where(eq(appointments.id, id));
}

// ── Inventory ──────────────────────────────────────────────────────────────
export async function getInventoryItems(): Promise<InventoryItem[]> {
  return db.select().from(inventoryItems).orderBy(inventoryItems.name);
}

export async function createInventoryItem(data: InsertInventoryItem): Promise<InventoryItem> {
  const [item] = await db.insert(inventoryItems).values(data).returning();
  return item;
}

export async function updateInventoryItem(id: string, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
  const [item] = await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id)).returning();
  return item;
}

export async function adjustInventoryQuantity(id: string, delta: number): Promise<InventoryItem | undefined> {
  const [item] = await db
    .update(inventoryItems)
    .set({ quantity: sql`${inventoryItems.quantity} + ${delta}` })
    .where(eq(inventoryItems.id, id))
    .returning();
  return item;
}

// ── Payments ───────────────────────────────────────────────────────────────
export async function getPayments(): Promise<Payment[]> {
  return db.select().from(payments).orderBy(desc(payments.date));
}

export async function createPayment(data: InsertPayment): Promise<Payment> {
  const [p] = await db.insert(payments).values(data).returning();
  return p;
}

// ── Dashboard stats ────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay   = new Date(startOfDay.getTime() + 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayAppts] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(and(gte(appointments.date, startOfDay), lte(appointments.date, endOfDay)));

  const [monthRevenue] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)` })
    .from(payments)
    .where(gte(payments.date, startOfMonth));

  const [activeClients] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients);

  const [pendingAppts] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(eq(appointments.status, "scheduled"));

  return {
    todayAppointments: Number(todayAppts.count),
    monthRevenue: Number(monthRevenue.total),
    activeClients: Number(activeClients.count),
    pendingAppointments: Number(pendingAppts.count),
  };
}
