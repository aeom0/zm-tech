/**
 * Carga datos del panel vía Supabase (misma interfaz que el viejo fetch a Express).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCustomers,
  fetchDashboard,
  fetchProducts,
  fetchSales,
} from "@/lib/repmax-queries";

function parsePath(url: string): { pathname: string; search: string } {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const u = new URL(url);
    return { pathname: u.pathname, search: u.search };
  }
  const [pathname, search = ""] = url.split("?");
  return { pathname, search: search ? `?${search}` : "" };
}

async function resolveRepmaxQuery(
  url: string,
  usdBsRate: number,
): Promise<unknown> {
  const { pathname, search } = parsePath(url);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const client = createClient();

  if (pathname === "/api/dashboard") {
    return fetchDashboard(client);
  }
  if (pathname === "/api/products") {
    return fetchProducts(client, params, usdBsRate);
  }
  if (pathname === "/api/sales") {
    return fetchSales(client, params);
  }
  if (pathname === "/api/customers") {
    return fetchCustomers(client, params);
  }
  throw new Error(`Ruta no soportada: ${pathname}`);
}

export function useAuthFetch<T>(
  url: string,
): {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { token, store } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

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
    try {
      const json = (await resolveRepmaxQuery(
        url,
        store?.usdBsRate ?? 36.5,
      )) as T;
      if (seq.current === id) setData(json);
    } catch (e) {
      if (seq.current === id) {
        setData(null);
        setError(e instanceof Error ? e.message : "Error de red");
      }
    } finally {
      if (seq.current === id) setIsLoading(false);
    }
  }, [token, url, store?.usdBsRate]);

  useEffect(() => {
    void ejecutar();
  }, [ejecutar]);

  const refetch = useCallback(() => {
    void ejecutar();
  }, [ejecutar]);

  return { data, isLoading, error, refetch };
}
