import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./routes";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", apiRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ GeemaStudio API corriendo en http://0.0.0.0:${PORT}`);
});
