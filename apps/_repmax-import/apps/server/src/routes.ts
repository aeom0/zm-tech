// ============================================================
// Rutas HTTP del API — storefront público + panel web (JWT)
// ============================================================

import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  customers,
  products,
  sales,
  stores,
  storeUsers,
  users,
} from "@repmax/shared";
import { firmarToken, verificarJWT } from "./auth";
import { db } from "./db";

/** Convierte decimal/string de PG a número seguro para JSON */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Inicio del día actual en UTC (00:00:00.000) */
function inicioDiaUtc(ref: Date = new Date()): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), 0, 0, 0, 0));
}

function restarDiasUtc(d: Date, dias: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - dias);
  return x;
}

/** Últimos 7 días calendario (YYYY-MM-DD), del más antiguo al más reciente */
function fechasUltimos7Dias(): string[] {
  const hoy = inicioDiaUtc();
  const out: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = restarDiasUtc(hoy, i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

interface DashboardData {
  ventasHoy: number;
  ingresoHoy: number;
  totalProductos: number;
  totalClientes: number;
  stockBajo: number;
  ventasUltimos7Dias: { fecha: string; total: number }[];
  topProductos: { title: string; brand: string; cantidad: number }[];
  metodoPago: { metodo: string; total: number }[];
}

// ------------------------------------------------------------
// Rutas públicas (sin autenticación) — vitrina por slug
// ------------------------------------------------------------

function registerPublicStorefrontRoutes(app: Express): void {
  /** Catálogo público de la tienda por slug */
  app.get("/api/public/:slug/store", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const filas = await db
        .select({
          id: stores.id,
          name: stores.name,
          slug: stores.slug,
          logoUrl: stores.logoUrl,
          phone: stores.phone,
          address: stores.address,
          city: stores.city,
          plan: stores.plan,
          usdBsRate: stores.usdBsRate,
        })
        .from(stores)
        .where(and(eq(stores.slug, slug), eq(stores.isActive, true)))
        .limit(1);

      const fila = filas[0];
      if (!fila) {
        res.status(404).json({ error: "Tienda no encontrada" });
        return;
      }

      res.json({
        id: fila.id,
        name: fila.name,
        slug: fila.slug,
        logoUrl: fila.logoUrl ?? null,
        phone: fila.phone ?? null,
        address: fila.address ?? null,
        city: fila.city ?? null,
        plan: fila.plan,
        usdBsRate: toNumber(fila.usdBsRate),
      });
    } catch (err) {
      console.error("[public/store]", err);
      res.status(500).json({ error: "Error al cargar la tienda" });
    }
  });

  /** Productos en stock de la tienda con filtros y paginación */
  app.get("/api/public/:slug/products", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const { brand, condition, vehicleType, q } = req.query;

      const pageRaw = Number(req.query.page ?? 1);
      const limitRaw = Number(req.query.limit ?? 20);
      const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
      let limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 20;
      if (limit > 50) limit = 50;

      const offset = (page - 1) * limit;

      const tienda = await db
        .select({
          id: stores.id,
          usdBsRate: stores.usdBsRate,
        })
        .from(stores)
        .where(and(eq(stores.slug, slug), eq(stores.isActive, true)))
        .limit(1);

      const t = tienda[0];
      if (!t) {
        res.status(404).json({ error: "Tienda no encontrada" });
        return;
      }

      const usdBsRate = toNumber(t.usdBsRate);

      const condiciones = [
        eq(products.storeId, t.id),
        eq(products.isActive, true),
        gt(products.stock, 0),
      ];

      if (typeof brand === "string" && brand.trim() !== "" && brand !== "__all__") {
        condiciones.push(eq(products.brand, brand.trim()));
      }

      if (condition === "NEW" || condition === "USED") {
        condiciones.push(eq(products.condition, condition));
      }

      if (
        typeof vehicleType === "string" &&
        (vehicleType === "CAR" ||
          vehicleType === "MOTO" ||
          vehicleType === "TRUCK" ||
          vehicleType === "SUV")
      ) {
        condiciones.push(eq(products.vehicleType, vehicleType));
      }

      if (typeof q === "string" && q.trim() !== "") {
        const patron = `%${q.trim()}%`;
        condiciones.push(
          or(
            ilike(products.title, patron),
            ilike(products.brand, patron),
            ilike(products.model, patron),
            ilike(products.partNumber, patron),
          )!,
        );
      }

      const whereClause = and(...condiciones);

      const [totalRow] = await db
        .select({ total: count() })
        .from(products)
        .where(whereClause);

      const total = Number(totalRow?.total ?? 0);

      const filasProductos = await db
        .select({
          id: products.id,
          title: products.title,
          brand: products.brand,
          model: products.model,
          yearFrom: products.yearFrom,
          yearTo: products.yearTo,
          vehicleType: products.vehicleType,
          condition: products.condition,
          partNumber: products.partNumber,
          priceUsd: products.priceUsd,
          priceBs: products.priceBs,
          stock: products.stock,
          photos: products.photos,
        })
        .from(products)
        .where(whereClause)
        .limit(limit)
        .offset(offset);

      const lista = filasProductos.map((p) => ({
        id: p.id,
        title: p.title,
        brand: p.brand,
        model: p.model,
        yearFrom: p.yearFrom ?? null,
        yearTo: p.yearTo ?? null,
        vehicleType: p.vehicleType ?? null,
        condition: p.condition,
        partNumber: p.partNumber ?? null,
        priceUsd: toNumber(p.priceUsd),
        priceBs: toNumberOrNull(p.priceBs),
        usdBsRate,
        stock: p.stock ?? 0,
        photos: p.photos ?? null,
      }));

      res.json({
        products: lista,
        total,
        page,
        limit,
      });
    } catch (err) {
      console.error("[public/products]", err);
      res.status(500).json({ error: "Error al cargar productos" });
    }
  });
}

// ------------------------------------------------------------
// Rutas autenticadas (JWT)
// ------------------------------------------------------------

function registerAuthenticatedRoutes(app: Express): void {
  /** Login con email/contraseña (tabla `users` + bcrypt) */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const body = req.body as { email?: string; password?: string };
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!email || !password) {
        res.status(400).json({ error: "Email y contraseña son obligatorios" });
        return;
      }

      const [usuario] = await db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!usuario) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      const ok = await bcrypt.compare(password, usuario.passwordHash);
      if (!ok) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      const [vinculo] = await db
        .select({
          storeUser: storeUsers,
          store: stores,
        })
        .from(storeUsers)
        .innerJoin(stores, eq(storeUsers.storeId, stores.id))
        .where(
          and(
            eq(storeUsers.userId, usuario.id),
            eq(storeUsers.isActive, true),
            eq(stores.isActive, true),
          ),
        )
        .limit(1);

      if (!vinculo) {
        res.status(403).json({ error: "Usuario sin tienda asignada" });
        return;
      }

      const token = firmarToken({
        userId: usuario.id,
        storeId: vinculo.store.id,
      });

      res.json({
        token,
        user: { id: usuario.id, email: usuario.email },
        store: {
          id: vinculo.store.id,
          name: vinculo.store.name,
          slug: vinculo.store.slug,
          city: vinculo.store.city ?? null,
          plan: vinculo.store.plan,
          usdBsRate: toNumber(vinculo.store.usdBsRate),
        },
        storeUser: {
          role: vinculo.storeUser.role,
          fullName: vinculo.storeUser.fullName ?? null,
        },
      });
    } catch (err) {
      console.error("[auth/login]", err);
      if (err instanceof Error && err.message.includes("JWT_SECRET")) {
        res.status(500).json({ error: "Configuración del servidor incompleta" });
        return;
      }
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  /** Perfil + tienda según JWT */
  app.get("/api/auth/me", verificarJWT, async (req: Request, res: Response) => {
    try {
      const u = req.user;
      if (!u) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }

      const [usuario] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, u.userId))
        .limit(1);

      if (!usuario) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const [vinculo] = await db
        .select({
          storeUser: storeUsers,
          store: stores,
        })
        .from(storeUsers)
        .innerJoin(stores, eq(storeUsers.storeId, stores.id))
        .where(
          and(
            eq(storeUsers.userId, usuario.id),
            eq(storeUsers.storeId, u.storeId),
            eq(storeUsers.isActive, true),
          ),
        )
        .limit(1);

      if (!vinculo) {
        res.status(403).json({ error: "Sin acceso a esta tienda" });
        return;
      }

      res.json({
        user: { id: usuario.id, email: usuario.email },
        store: {
          id: vinculo.store.id,
          name: vinculo.store.name,
          slug: vinculo.store.slug,
          city: vinculo.store.city ?? null,
          plan: vinculo.store.plan,
          usdBsRate: toNumber(vinculo.store.usdBsRate),
        },
        storeUser: {
          role: vinculo.storeUser.role,
          fullName: vinculo.storeUser.fullName ?? null,
        },
      });
    } catch (err) {
      console.error("[auth/me]", err);
      res.status(500).json({ error: "Error al cargar el perfil" });
    }
  });

  /** KPIs y agregados del día para el panel */
  app.get("/api/dashboard", verificarJWT, async (req: Request, res: Response) => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }

      const inicioHoy = inicioDiaUtc();
      const inicioRango7 = restarDiasUtc(inicioHoy, 6);

      const whereVentasHoy = and(
        eq(sales.storeId, storeId),
        eq(sales.status, "COMPLETED"),
        gte(sales.createdAt, inicioHoy),
      );

      const [ventasAgg] = await db
        .select({
          ventasHoy: count(),
          ingresoHoy: sql<string>`coalesce(sum(${sales.totalUsd}::numeric), 0)::text`,
        })
        .from(sales)
        .where(whereVentasHoy);

      const [prodRow] = await db
        .select({ totalProductos: count() })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.isActive, true)));

      const [cliRow] = await db
        .select({ totalClientes: count() })
        .from(customers)
        .where(eq(customers.storeId, storeId));

      const [stockRow] = await db
        .select({ stockBajo: count() })
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            eq(products.isActive, true),
            lte(products.stock, products.minStock),
          ),
        );

      const filas7d = await db
        .select({
          fecha: sql<string>`to_char(date_trunc('day', ${sales.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
          total: sql<string>`coalesce(sum(${sales.totalUsd}::numeric), 0)::text`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.storeId, storeId),
            eq(sales.status, "COMPLETED"),
            gte(sales.createdAt, inicioRango7),
          ),
        )
        .groupBy(sql`date_trunc('day', ${sales.createdAt} AT TIME ZONE 'UTC')`)
        .orderBy(asc(sql`date_trunc('day', ${sales.createdAt} AT TIME ZONE 'UTC')`));

      const mapa7: Record<string, number> = {};
      for (const row of filas7d) {
        mapa7[row.fecha] = toNumber(row.total);
      }
      const fechas = fechasUltimos7Dias();
      const ventasUltimos7Dias = fechas.map((fecha) => ({
        fecha,
        total: mapa7[fecha] ?? 0,
      }));

      const topRows = await db.execute(
        sql<{
          title: string;
          brand: string;
          cantidad: string;
        }>`
        SELECT
          COALESCE(
            NULLIF(TRIM(si.product_snapshot->>'title'), ''),
            p.title,
            'Sin título'
          ) AS title,
          COALESCE(
            NULLIF(TRIM(si.product_snapshot->>'brand'), ''),
            p.brand,
            ''
          ) AS brand,
          SUM(si.quantity)::text AS cantidad
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        LEFT JOIN products p ON p.id = si.product_id
        WHERE s.store_id = ${storeId}::uuid
          AND s.status = 'COMPLETED'
          AND s.created_at >= ${inicioHoy}
        GROUP BY 1, 2
        ORDER BY SUM(si.quantity) DESC
        LIMIT 5
        `,
      );

      const filasTopRaw = "rows" in topRows ? topRows.rows : topRows;
      const filasTop = filasTopRaw as { title: string; brand: string; cantidad: string }[];

      const topProductos: { title: string; brand: string; cantidad: number }[] = filasTop.map((r) => ({
        title: String(r.title ?? ""),
        brand: String(r.brand ?? ""),
        cantidad: Math.round(toNumber(r.cantidad)),
      }));

      const pagosHoy = await db
        .select({
          metodo: sales.paymentMethod,
          total: sql<string>`coalesce(sum(${sales.totalUsd}::numeric), 0)::text`,
        })
        .from(sales)
        .where(whereVentasHoy)
        .groupBy(sales.paymentMethod);

      const metodoPago = pagosHoy.map((row) => ({
        metodo: row.metodo,
        total: toNumber(row.total),
      }));

      const payload: DashboardData = {
        ventasHoy: Number(ventasAgg?.ventasHoy ?? 0),
        ingresoHoy: toNumber(ventasAgg?.ingresoHoy),
        totalProductos: Number(prodRow?.totalProductos ?? 0),
        totalClientes: Number(cliRow?.totalClientes ?? 0),
        stockBajo: Number(stockRow?.stockBajo ?? 0),
        ventasUltimos7Dias,
        topProductos,
        metodoPago,
      };

      res.json(payload);
    } catch (err) {
      console.error("[dashboard]", err);
      res.status(500).json({ error: "Error al cargar el dashboard" });
    }
  });

  /** Listado de inventario con filtros (panel web) */
  app.get("/api/products", verificarJWT, async (req: Request, res: Response) => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }

      const { brand, condition, vehicleType, q, lowStock } = req.query;
      const pageRaw = Number(req.query.page ?? 1);
      const limitRaw = Number(req.query.limit ?? 20);
      const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
      let limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 20;
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const [tienda] = await db
        .select({ usdBsRate: stores.usdBsRate })
        .from(stores)
        .where(eq(stores.id, storeId))
        .limit(1);

      const tasa = toNumber(tienda?.usdBsRate);

      const condiciones = [eq(products.storeId, storeId)];

      if (typeof brand === "string" && brand.trim() !== "" && brand !== "__all__") {
        condiciones.push(eq(products.brand, brand.trim()));
      }
      if (condition === "NEW" || condition === "USED") {
        condiciones.push(eq(products.condition, condition));
      }
      if (
        typeof vehicleType === "string" &&
        (vehicleType === "CAR" ||
          vehicleType === "MOTO" ||
          vehicleType === "TRUCK" ||
          vehicleType === "SUV")
      ) {
        condiciones.push(eq(products.vehicleType, vehicleType));
      }
      if (typeof q === "string" && q.trim() !== "") {
        const patron = `%${q.trim()}%`;
        condiciones.push(
          or(
            ilike(products.title, patron),
            ilike(products.brand, patron),
            ilike(products.model, patron),
            ilike(products.partNumber, patron),
          )!,
        );
      }
      if (lowStock === "true" || lowStock === "1") {
        condiciones.push(lte(products.stock, products.minStock));
      }

      const whereClause = and(...condiciones);

      const [totalRow] = await db
        .select({ total: count() })
        .from(products)
        .where(whereClause);

      const total = Number(totalRow?.total ?? 0);

      const filas = await db
        .select()
        .from(products)
        .where(whereClause)
        .orderBy(desc(products.updatedAt))
        .limit(limit)
        .offset(offset);

      const lista = filas.map((p) => {
        const priceUsd = toNumber(p.priceUsd);
        const priceBs =
          toNumberOrNull(p.priceBs) ?? (priceUsd > 0 ? Math.round(priceUsd * tasa * 100) / 100 : 0);
        return {
          id: p.id,
          title: p.title,
          brand: p.brand,
          model: p.model,
          priceUsd,
          priceBs,
          stock: p.stock ?? 0,
          minStock: p.minStock ?? 0,
          condition: p.condition,
          vehicleType: p.vehicleType ?? null,
          isActive: p.isActive ?? true,
          partNumber: p.partNumber ?? "",
        };
      });

      res.json({ products: lista, total, page, limit });
    } catch (err) {
      console.error("[products]", err);
      res.status(500).json({ error: "Error al cargar productos" });
    }
  });

  /** Actualización parcial de producto */
  app.patch("/api/products/:id", verificarJWT, async (req: Request, res: Response) => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const body = req.body as {
        title?: string;
        brand?: string;
        model?: string;
        priceUsd?: number;
        stock?: number;
        minStock?: number;
        isActive?: boolean;
      };

      const [existente] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, id), eq(products.storeId, storeId)))
        .limit(1);

      if (!existente) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }

      const patch: Partial<typeof products.$inferInsert> = {};
      if (typeof body.title === "string") patch.title = body.title;
      if (typeof body.brand === "string") patch.brand = body.brand;
      if (typeof body.model === "string") patch.model = body.model;
      if (typeof body.priceUsd === "number" && Number.isFinite(body.priceUsd)) {
        patch.priceUsd = String(body.priceUsd);
      }
      if (typeof body.stock === "number" && Number.isFinite(body.stock)) {
        patch.stock = Math.floor(body.stock);
      }
      if (typeof body.minStock === "number" && Number.isFinite(body.minStock)) {
        patch.minStock = Math.floor(body.minStock);
      }
      if (typeof body.isActive === "boolean") patch.isActive = body.isActive;

      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: "Nada que actualizar" });
        return;
      }

      patch.updatedAt = new Date();

      const [tienda] = await db
        .select({ usdBsRate: stores.usdBsRate })
        .from(stores)
        .where(eq(stores.id, storeId))
        .limit(1);
      const tasa = toNumber(tienda?.usdBsRate);

      const [actualizado] = await db
        .update(products)
        .set(patch)
        .where(and(eq(products.id, id), eq(products.storeId, storeId)))
        .returning();

      if (!actualizado) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }

      const priceUsd = toNumber(actualizado.priceUsd);
      const priceBs =
        toNumberOrNull(actualizado.priceBs) ??
        (priceUsd > 0 ? Math.round(priceUsd * tasa * 100) / 100 : 0);

      res.json({
        id: actualizado.id,
        title: actualizado.title,
        brand: actualizado.brand,
        model: actualizado.model,
        priceUsd,
        priceBs,
        stock: actualizado.stock ?? 0,
        minStock: actualizado.minStock ?? 0,
        condition: actualizado.condition,
        vehicleType: actualizado.vehicleType ?? null,
        isActive: actualizado.isActive ?? true,
        partNumber: actualizado.partNumber ?? "",
      });
    } catch (err) {
      console.error("[products/patch]", err);
      res.status(500).json({ error: "Error al actualizar el producto" });
    }
  });

  /** Historial de ventas */
  app.get("/api/sales", verificarJWT, async (req: Request, res: Response) => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }

      const pageRaw = Number(req.query.page ?? 1);
      const limitRaw = Number(req.query.limit ?? 20);
      const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
      let limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 20;
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const fromQ = req.query.from;
      const toQ = req.query.to;
      const condiciones = [eq(sales.storeId, storeId)];

      if (typeof fromQ === "string" && fromQ.trim() !== "") {
        const d = new Date(fromQ);
        if (!Number.isNaN(d.getTime())) {
          condiciones.push(gte(sales.createdAt, d));
        }
      }
      if (typeof toQ === "string" && toQ.trim() !== "") {
        const d = new Date(toQ);
        if (!Number.isNaN(d.getTime())) {
          const fin = new Date(d);
          fin.setUTCHours(23, 59, 59, 999);
          condiciones.push(lte(sales.createdAt, fin));
        }
      }

      const whereClause = and(...condiciones);

      const [totalRow] = await db.select({ total: count() }).from(sales).where(whereClause);
      const total = Number(totalRow?.total ?? 0);

      const filas = await db
        .select({
          id: sales.id,
          invoiceNumber: sales.invoiceNumber,
          totalUsd: sales.totalUsd,
          totalBs: sales.totalBs,
          paymentMethod: sales.paymentMethod,
          status: sales.status,
          createdAt: sales.createdAt,
          customerId: sales.customerId,
          customerName: customers.fullName,
        })
        .from(sales)
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(whereClause)
        .orderBy(desc(sales.createdAt))
        .limit(limit)
        .offset(offset);

      const lista = filas.map((s) => ({
        id: s.id,
        invoiceNumber: s.invoiceNumber ?? "",
        totalUsd: toNumber(s.totalUsd),
        totalBs: toNumberOrNull(s.totalBs),
        paymentMethod: s.paymentMethod,
        status: s.status,
        createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
        customer: s.customerId && s.customerName ? { fullName: s.customerName } : null,
      }));

      res.json({ sales: lista, total, page, limit });
    } catch (err) {
      console.error("[sales]", err);
      res.status(500).json({ error: "Error al cargar ventas" });
    }
  });

  /** Clientes de la tienda */
  app.get("/api/customers", verificarJWT, async (req: Request, res: Response) => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }

      const pageRaw = Number(req.query.page ?? 1);
      const limitRaw = Number(req.query.limit ?? 20);
      const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
      let limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 20;
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const q = req.query.q;
      const condiciones = [eq(customers.storeId, storeId)];

      if (typeof q === "string" && q.trim() !== "") {
        const patron = `%${q.trim()}%`;
        condiciones.push(
          or(
            ilike(customers.fullName, patron),
            ilike(customers.phone, patron),
            ilike(customers.cedulaRif, patron),
          )!,
        );
      }

      const whereClause = and(...condiciones);

      const [totalRow] = await db.select({ total: count() }).from(customers).where(whereClause);
      const total = Number(totalRow?.total ?? 0);

      const filas = await db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(desc(customers.createdAt))
        .limit(limit)
        .offset(offset);

      const lista = filas.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone ?? "",
        cedulaRif: c.cedulaRif ?? "",
        email: c.email ?? "",
        totalPurchases: c.totalPurchases ?? 0,
        totalSpentUsd: toNumber(c.totalSpentUsd),
        createdAt: c.createdAt?.toISOString() ?? new Date().toISOString(),
      }));

      res.json({ customers: lista, total, page, limit });
    } catch (err) {
      console.error("[customers]", err);
      res.status(500).json({ error: "Error al cargar clientes" });
    }
  });
}

/**
 * Registra todas las rutas del servidor.
 */
export function registerRoutes(app: Express): void {
  registerPublicStorefrontRoutes(app);
  registerAuthenticatedRoutes(app);
}
