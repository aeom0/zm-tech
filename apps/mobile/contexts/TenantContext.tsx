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

const STORAGE_KEY = "@salonpro/tenant_config";
const CONFIGURED_KEY = "@salonpro/tenant_configured";

interface TenantContextValue {
  config: TenantConfig;
  updateTenant: (partial: Partial<TenantConfig>) => Promise<void>;
  markConfigured: () => Promise<void>;
  isConfigured: boolean;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(defaultTenantConfig);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(CONFIGURED_KEY),
    ])
      .then(([raw, configured]) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<TenantConfig>;
          setConfig((prev) => ({ ...prev, ...parsed }));
        }
        setIsConfigured(configured === "true");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateTenant = useCallback(async (partial: Partial<TenantConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const markConfigured = useCallback(async () => {
    await AsyncStorage.setItem(CONFIGURED_KEY, "true");
    setIsConfigured(true);
  }, []);

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
