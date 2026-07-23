"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type Role = "dev" | "owner" | "staff";

export interface AuthProfile {
  id: string;
  role: Role;
  employee_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  role: Role | null;
  profile: AuthProfile | null;
  isAdmin: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, employee_id, full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Error cargando perfil:", error.message);
        setProfile(null);
        return;
      }

      if (!data) {
        setProfile(null);
        return;
      }

      if (
        data.role === "dev" ||
        data.role === "owner" ||
        data.role === "staff"
      ) {
        setProfile(data as AuthProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.warn("Error inesperado cargando perfil:", err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Error recuperando sesión:", error.message);
        }
        if (!isMounted) return;

        setSession(data.session ?? null);
        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    if (!supabase) return undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) {
        return {
          ok: false,
          error:
            "Configuración de Supabase faltante. Añade NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local",
        };
      }
      const trimmedEmail = email.trim();

      if (!trimmedEmail || !password.trim()) {
        return { ok: false, error: "Correo y contraseña requeridos" };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          const message = error.message || "";
          if (/invalid login credentials/i.test(message)) {
            return { ok: false, error: "Correo o contraseña incorrectos" };
          }
          return {
            ok: false,
            error:
              "No se pudo iniciar sesión. Verifica tus datos o intenta más tarde.",
          };
        }

        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        }

        return { ok: true };
      } catch {
        return { ok: false, error: "Error de conexión" };
      }
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Error cerrando sesión:", err);
    } finally {
      setSession(null);
      setProfile(null);
    }
  }, []);

  const role: Role | null =
    profile &&
    (profile.role === "dev" ||
      profile.role === "owner" ||
      profile.role === "staff")
      ? profile.role
      : null;

  const isAdmin = role === "dev" || role === "owner";

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading,
        userId: session?.user?.id ?? null,
        role,
        profile,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
