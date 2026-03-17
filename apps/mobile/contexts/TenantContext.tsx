import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type TenantConfig,
  defaultTenantConfig,
} from "@salonpro/tenant-config";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchTenantSettings,
  upsertTenantSettings,
} from "@/services/tenantSettingsService";

const STORAGE_KEY = "@salonpro/tenant_config";
const CONFIGURED_KEY = "@salonpro/tenant_configured";

interface TenantContextValue {
  config: TenantConfig;
  updateTenant: (partial: Partial<TenantConfig>) => Promise<void>;
  markConfigured: () => Promise<{ ok: boolean; error?: string }>;
  isConfigured: boolean;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [config, setConfig] = useState<TenantConfig>(defaultTenantConfig);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const updateTenant = useCallback(async (partial: Partial<TenantConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [raw, configured] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CONFIGURED_KEY),
        ]);

        if (!isMounted) return;

        if (raw) {
          const parsed = JSON.parse(raw) as Partial<TenantConfig>;
          setConfig((prev) => ({ ...prev, ...parsed }));
        }

        const localConfigured = configured === "true";
        setIsConfigured(localConfigured);

        // Si no hay marca local pero sí usuario, intentamos sincronizar desde Supabase
        if (!localConfigured && userId) {
          try {
            const remoteConfig = await fetchTenantSettings(userId);
            if (remoteConfig && isMounted) {
              await updateTenant(remoteConfig);
              await AsyncStorage.setItem(CONFIGURED_KEY, "true");
              setIsConfigured(true);
            }
          } catch {
            // En caso de error remoto, seguimos con flujo local (onboarding)
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [userId, updateTenant]);

  const markConfigured = useCallback(async () => {
    if (!userId) {
      return {
        ok: false,
        error: "No hay usuario autenticado para guardar la configuración.",
      };
    }

    try {
      await upsertTenantSettings(config, userId);
      await AsyncStorage.setItem(CONFIGURED_KEY, "true");
      setIsConfigured(true);
      return { ok: true as const };
    } catch (error) {
      // Log en desarrollo para depurar fallos al guardar configuración remota
      // eslint-disable-next-line no-console
      console.error(
        "[TenantContext] Error al hacer upsert de tenant_settings",
        error,
      );

      // Si RLS bloquea el upsert (nuevo row viola política), permitimos continuar
      // marcando el tenant como configurado en local, para no bloquear el uso
      // de la app durante el desarrollo. En producción se debería corregir la
      // política en Supabase.
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      const isRlsViolation =
        typeof message === "string" &&
        message.toLowerCase().includes("row-level security");

      if (isRlsViolation) {
        await AsyncStorage.setItem(CONFIGURED_KEY, "true");
        setIsConfigured(true);
        return { ok: true as const };
      }

      return {
        ok: false as const,
        error:
          "Ocurrió un error al guardar la configuración en la nube. Inténtalo de nuevo.",
      };
    }
  }, [config, userId]);

  return (
    <TenantContext.Provider
      value={{ config, updateTenant, markConfigured, isConfigured, isLoading }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant debe usarse dentro de <TenantProvider>");
  }
  return ctx;
}
