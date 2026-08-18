/**
 * Auth panel web — Supabase Auth + membership repmax_store_users.
 * Sin JWT propio ni cookie repmax_token.
 */
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
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { StoreWeb } from "@/types/dashboard";

export interface AuthContextValue {
  /** access_token de Supabase (compat con guards que miraban JWT propio) */
  token: string | null;
  user: { id: string; email: string } | null;
  store: StoreWeb | null;
  storeUser: { id: string; role: string; fullName: string | null } | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type Membership = {
  store: StoreWeb;
  storeUser: { id: string; role: string; fullName: string | null };
};

/**
 * Resuelve la tasa efectiva de la tienda: si `usar_tasa_manual` está activo,
 * respeta el valor fijado a mano. Si no, intenta la tasa BCV en vivo
 * (/api/bcv/tasa) y cae de vuelta a la manual si el fetch falla o no hay
 * tasa disponible — nunca debe bloquear el checkout por falta de conectividad.
 */
async function resolverTasaEfectiva(
  tasaManual: number,
  usarTasaManual: boolean,
): Promise<number> {
  if (usarTasaManual) return tasaManual;
  try {
    const res = await fetch("/api/bcv/tasa", { cache: "no-store" });
    if (!res.ok) return tasaManual;
    const data = (await res.json()) as {
      bcv?: { valor?: number; disponible?: boolean };
    };
    const valor = data.bcv?.valor;
    if (data.bcv?.disponible && Number.isFinite(valor) && (valor as number) > 0) {
      return valor as number;
    }
    return tasaManual;
  } catch {
    return tasaManual;
  }
}

async function loadMembership(
  userId: string,
): Promise<Membership | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("repmax_store_users")
    .select(
      `
      id, role, full_name,
      store:repmax_stores ( id, name, slug, city, plan, usd_bs_rate, usar_tasa_manual, is_active )
    `,
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[repmax auth]", error.message);
    return null;
  }
  if (!data) return null;

  const storeRaw = Array.isArray(data.store) ? data.store[0] : data.store;
  if (!storeRaw || storeRaw.is_active === false) return null;

  const tasaManual = Number(storeRaw.usd_bs_rate) || 36.5;
  const usarTasaManual = Boolean(storeRaw.usar_tasa_manual);
  const usdBsRate = await resolverTasaEfectiva(tasaManual, usarTasaManual);

  return {
    store: {
      id: storeRaw.id,
      name: storeRaw.name,
      slug: storeRaw.slug,
      city: storeRaw.city ?? null,
      plan: (storeRaw.plan as StoreWeb["plan"]) ?? "basic",
      usdBsRate,
    },
    storeUser: {
      id: String(data.id),
      role: String(data.role),
      fullName: data.full_name ?? null,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [store, setStore] = useState<StoreWeb | null>(null);
  const [storeUser, setStoreUser] = useState<{
    id: string;
    role: string;
    fullName: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncMembership = useCallback(async (uid: string | null) => {
    if (!uid) {
      setStore(null);
      setStoreUser(null);
      return;
    }
    const m = await loadMembership(uid);
    setStore(m?.store ?? null);
    setStoreUser(m?.storeUser ?? null);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      await syncMembership(data.session?.user.id ?? null);
      if (!cancelled) setIsLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void syncMembership(next?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [syncMembership]);

  const login = useCallback(
    async (email: string, password: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);

      const uid = data.user?.id ?? data.session?.user?.id ?? null;
      if (!uid) throw new Error("No se obtuvo la sesión");

      const m = await loadMembership(uid);
      if (!m) {
        await supabase.auth.signOut();
        throw new Error(
          "Tu usuario no está vinculado a una tienda RepMAX. Pide al dueño que te asocie.",
        );
      }
      setSession(data.session);
      setStore(m.store);
      setStoreUser(m.storeUser);
    },
    [],
  );

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
    setStore(null);
    setStoreUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user
      ? { id: session.user.id, email: session.user.email ?? "" }
      : null;
    return {
      token: session?.access_token ?? null,
      user,
      store,
      storeUser,
      isLoading,
      login,
      logout,
    };
  }, [session, store, storeUser, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
