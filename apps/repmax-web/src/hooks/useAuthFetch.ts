// ============================================================
// fetch autenticado con Bearer desde AuthContext
// ============================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function construirUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * GET/POST/etc. hacia el API con Authorization y estados de carga/error.
 */
export function useAuthFetch<T>(
  url: string,
  opciones?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const opcionesRef = useRef(opciones);
  opcionesRef.current = opciones;

  const ejecutar = useCallback(async () => {
    const id = ++seq.current;
    if (!token) {
      setIsLoading(false);
      setError("No autenticado");
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const opt = opcionesRef.current;
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(opt?.headers ?? {}),
      };
      const res = await fetch(construirUrl(url), {
        ...opt,
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error ?? `Error ${res.status}`);
      }
      const json = (await res.json()) as T;
      if (seq.current === id) {
        setData(json);
      }
    } catch (e) {
      if (seq.current === id) {
        setData(null);
        setError(e instanceof Error ? e.message : "Error de red");
      }
    } finally {
      if (seq.current === id) {
        setIsLoading(false);
      }
    }
  }, [token, url]);

  useEffect(() => {
    void ejecutar();
  }, [ejecutar]);

  /** Vuelve a ejecutar el mismo request (p. ej. tras mutar datos en el servidor). */
  const refetch = useCallback(() => {
    void ejecutar();
  }, [ejecutar]);

  return { data, isLoading, error, refetch };
}
