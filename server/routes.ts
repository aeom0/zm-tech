import { Router, type Request, type Response } from "express";
import * as store from "./storage";

const router = Router();

// ── Mock auth middleware (sin auth real por ahora) ─────────────────────────
// Cualquier request tiene rol "owner" automáticamente
router.use((_req, res, next) => {
  (res.locals as Record<string, unknown>).user = {
    id: "dev-user",
    role: "owner",
  };
  next();
});

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get("/dashboard/stats", async (_req, res) => {
  try {
    const stats = await store.getDashboardStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Employees ──────────────────────────────────────────────────────────────
router.get("/employees", async (_req, res) => {
  res.json(await store.getEmployees());
});

router.post("/employees", async (req, res) => {
  try {
    const emp = await store.createEmployee(req.body);
    res.status(201).json(emp);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.put("/employees/:id", async (req, res) => {
  try {
    const emp = await store.updateEmployee(req.params.id, req.body);
    if (!emp) return res.status(404).json({ error: "No encontrado" });
    res.json(emp);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/employees/:id", async (req, res) => {
  await store.deleteEmployee(req.params.id);
  res.status(204).send();
});

// ── Service Categories ─────────────────────────────────────────────────────
router.get("/service-categories", async (_req, res) => {
  res.json(await store.getServiceCategories());
});

router.post("/service-categories", async (req, res) => {
  try {
    const cat = await store.createServiceCategory(req.body);
    res.status(201).json(cat);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ── Services ───────────────────────────────────────────────────────────────
router.get("/services", async (_req, res) => {
  res.json(await store.getServices());
});

router.post("/services", async (req, res) => {
  try {
    const svc = await store.createService(req.body);
    res.status(201).json(svc);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.put("/services/:id", async (req, res) => {
  try {
    const svc = await store.updateService(req.params.id, req.body);
    if (!svc) return res.status(404).json({ error: "No encontrado" });
    res.json(svc);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/services/:id", async (req, res) => {
  await store.deleteService(req.params.id);
  res.status(204).send();
});

// ── Clients ────────────────────────────────────────────────────────────────
router.get("/clients", async (_req, res) => {
  res.json(await store.getClients());
});

router.post("/clients", async (req, res) => {
  try {
    const c = await store.createClient(req.body);
    res.status(201).json(c);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.put("/clients/:id", async (req, res) => {
  try {
    const c = await store.updateClient(req.params.id, req.body);
    if (!c) return res.status(404).json({ error: "No encontrado" });
    res.json(c);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ── Appointments ───────────────────────────────────────────────────────────
router.get("/appointments", async (req, res) => {
  const { dateFrom, dateTo, employeeId } = req.query as Record<string, string>;
  const appts = await store.getAppointments({
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    employeeId: employeeId ?? undefined,
  });
  res.json(appts);
});

router.post("/appointments", async (req, res) => {
  try {
    const a = await store.createAppointment(req.body);
    res.status(201).json(a);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.put("/appointments/:id", async (req, res) => {
  try {
    const a = await store.updateAppointment(req.params.id, req.body);
    if (!a) return res.status(404).json({ error: "No encontrado" });
    res.json(a);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.delete("/appointments/:id", async (req, res) => {
  await store.deleteAppointment(req.params.id);
  res.status(204).send();
});

// ── Inventory ──────────────────────────────────────────────────────────────
router.get("/inventory", async (_req, res) => {
  res.json(await store.getInventoryItems());
});

router.post("/inventory", async (req, res) => {
  try {
    const item = await store.createInventoryItem(req.body);
    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.patch("/inventory/:id", async (req, res) => {
  try {
    const item = await store.updateInventoryItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

router.patch("/inventory/:id/quantity", async (req, res) => {
  try {
    const delta = Number(req.body.delta ?? 0);
    const item = await store.adjustInventoryQuantity(req.params.id, delta);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// ── Payments ───────────────────────────────────────────────────────────────
router.get("/payments", async (_req, res) => {
  res.json(await store.getPayments());
});

router.post("/payments", async (req, res) => {
  try {
    const p = await store.createPayment(req.body);
    res.status(201).json(p);
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

export default router;
