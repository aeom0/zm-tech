import { QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";

// En dev: IP de tu máquina accesible desde el dispositivo/emulador
// Expo inyecta la IP del host en debuggerHost
const debuggerHost =
  Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost ?? null;
const hostIp = debuggerHost ? debuggerHost.split(":")[0] : "localhost";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${hostIp}:5000`;

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

async function expressQueryFn({ queryKey }: { queryKey: readonly unknown[] }) {
  const [route, params] = queryKey as [string, string?];
  const url = params ? `${API_URL}${route}${params}` : `${API_URL}${route}`;
  return apiFetch(url);
}

/**
 * Helper para mutaciones: POST, PUT, PATCH, DELETE contra Express.
 */
export async function apiRequest(
  method: string,
  route: string,
  body?: unknown,
): Promise<{ json: () => Promise<unknown> }> {
  const url = `${API_URL}${route}`;
  const data = await apiFetch(url, {
    method,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return { json: async () => data };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: expressQueryFn as never,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
