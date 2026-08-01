// ============================================================
// Autenticación del panel web — JWT en localStorage + cookie (middleware)
// ============================================================

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthMeResponse, StoreWeb } from "@/types/dashboard";

const CLAVE_TOKEN = "repmax_token";
const CLAVE_COOKIE = "repmax_token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function escribirCookieToken(token: string): void {
  document.cookie = `${CLAVE_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=604800`;
}

function borrarCookieToken(): void {
  document.cookie = `${CLAVE_COOKIE}=; path=/; max-age=0`;
}

export interface AuthContextValue {
  token: string | null;
  user: { id: string; email: string } | null;
  store: StoreWeb | null;
  storeUser: { role: string; fullName: string | null } | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(bearer: string): Promise<AuthMeResponse> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${bearer}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Sesión inválida");
  }
  return (await res.json()) as AuthMeResponse;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [store, setStore] = useState<StoreWeb | null>(null);
  const [storeUser, setStoreUser] = useState<{ role: string; fullName: string | null } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* ignore */
    }
    borrarCookieToken();
    setToken(null);
    setUser(null);
    setStore(null);
    setStoreUser(null);
  }, []);

  const hidratar = useCallback(async (bearer: string) => {
    const data = await fetchMe(bearer);
    setUser(data.user);
    setStore(data.store);
    setStoreUser(data.storeUser);
  }, []);

  // Hidratar al montar si hay token guardado
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const guardado = localStorage.getItem(CLAVE_TOKEN);
        if (!guardado) {
          if (!cancelado) setIsLoading(false);
          return;
        }
        setToken(guardado);
        escribirCookieToken(guardado);
        await hidratar(guardado);
      } catch {
        if (!cancelado) {
          logout();
        }
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [hidratar, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as
        | { token?: string; user?: { id: string; email: string }; store?: StoreWeb; storeUser?: { role: string; fullName: string | null }; error?: string }
        | null;
      if (!res.ok || !body?.token) {
        throw new Error(body?.error ?? "No se pudo iniciar sesión");
      }
      localStorage.setItem(CLAVE_TOKEN, body.token);
      escribirCookieToken(body.token);
      setToken(body.token);
      if (body.user && body.store && body.storeUser) {
        setUser(body.user);
        setStore(body.store);
        setStoreUser(body.storeUser);
      } else {
        await hidratar(body.token);
      }
    },
    [hidratar],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      store,
      storeUser,
      isLoading,
      login,
      logout,
    }),
    [token, user, store, storeUser, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
