// ============================================================
// Servidor Express — API RepMAX (storefront público + futuras rutas)
// ============================================================

import "dotenv/config";
import cors from "cors";
import express from "express";
import { registerRoutes } from "./routes";

const app = express();
const webUrl = process.env.WEB_URL ?? "http://localhost:3003";

app.use(
  cors({
    // En desarrollo acepta cualquier origen (localhost / 127.0.0.1) para el fetch del catálogo
    origin: process.env.NODE_ENV === "development" ? true : webUrl,
    credentials: true,
  }),
);
app.use(express.json());

registerRoutes(app);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`[server] API en http://localhost:${PORT}`);
});
