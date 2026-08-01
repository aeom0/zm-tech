// ============================================================
// Extensión de Express.Request para el payload JWT verificado
// ============================================================

export {};

declare global {
  namespace Express {
    interface Request {
      /** Presente tras `verificarJWT` cuando el Bearer token es válido */
      user?: { userId: string; storeId: string };
    }
  }
}
