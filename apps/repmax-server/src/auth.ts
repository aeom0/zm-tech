// ============================================================
// JWT — verificación de Bearer y utilidades de firma
// ============================================================

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayloadRepmax {
  userId: string;
  storeId: string;
}

function obtenerSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET no está configurado");
  }
  return secret;
}

/**
 * Firma un access token con userId y storeId (expira en 7 días).
 */
export function firmarToken(payload: JwtPayloadRepmax): string {
  return jwt.sign(payload, obtenerSecret(), { expiresIn: "7d" });
}

/**
 * Middleware: exige Authorization Bearer válido y asigna req.user.
 */
export function verificarJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const decoded = jwt.verify(token, obtenerSecret()) as jwt.JwtPayload & Partial<JwtPayloadRepmax>;
    const userId = decoded.userId;
    const storeId = decoded.storeId;
    if (typeof userId !== "string" || typeof storeId !== "string") {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    req.user = { userId, storeId };
    next();
  } catch {
    res.status(401).json({ error: "No autorizado" });
  }
}
