/**
 * AuthContext — modo desarrollo sin Supabase.
 * Usuario hardcodeado con rol "owner" para ver toda la UI.
 * Reemplazar con JWT real cuando se implemente auth.
 */
import React, { createContext, useContext, useState } from "react";

export type Role = "dev" | "owner" | "staff";

interface AuthProfile {
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

const DEV_PROFILE: AuthProfile = {
  // UUID válido para que Supabase acepte el id en tenant_settings
  id: "00000000-0000-0000-0000-000000000001",
  role: "owner",
  employee_id: null,
  full_name: "Propietario/a",
  avatar_url: null,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!email.trim() || !password.trim()) {
      return { ok: false, error: "Correo y contraseña requeridos" };
    }
    // Aceptar cualquier credencial en modo dev
    setProfile(DEV_PROFILE);
    setIsAuthenticated(true);
    return { ok: true };
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setProfile(null);
  };

  const role: Role | null = profile?.role ?? null;
  const isAdmin = role === "dev" || role === "owner";

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: false,
        userId: profile?.id ?? null,
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
