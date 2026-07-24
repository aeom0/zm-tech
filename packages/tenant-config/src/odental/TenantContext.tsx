/**
 * TenantContext OdentalPro — preset fijo dental-clinic + fila odental_tenant_settings.
 * No comparte API con el TenantContext de GeemaStudio (vive en la app móvil).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useOdentalAuth } from "./AuthContext";
import {
  dentalClinicPreset,
  mergeOdentalTenantConfig,
} from "./preset";
import type {
  OdentalTenantConfig,
  OdentalTenantSettingsRow,
} from "./types";

type TenantContextValue = {
  config: OdentalTenantConfig;
  tenantId: string | null;
  isLoading: boolean;
  refreshTenant: () => Promise<void>;
  updateLocalConfig: (partial: Partial<OdentalTenantConfig>) => void;
};

const OdentalTenantContext = createContext<TenantContextValue | null>(null);

function rowToConfig(row: OdentalTenantSettingsRow): OdentalTenantConfig {
  const themeOverride = (row.theme_override ?? {}) as {
    primaryColor?: string;
    accentColor?: string;
    darkMode?: boolean;
  };

  return mergeOdentalTenantConfig(
    {
      ...dentalClinicPreset,
      tenantId: row.id,
      slug: row.slug,
      clinicName: row.clinic_name,
      businessSubtype: row.business_subtype ?? "general",
    },
    {
      theme: {
        primaryColor:
          themeOverride.primaryColor ?? dentalClinicPreset.theme.primaryColor,
        accentColor:
          themeOverride.accentColor ?? dentalClinicPreset.theme.accentColor,
        darkMode: themeOverride.darkMode ?? dentalClinicPreset.theme.darkMode,
      },
      locale: {
        currencyCode: row.currency_code ?? dentalClinicPreset.locale.currencyCode,
        timezone: row.timezone ?? dentalClinicPreset.locale.timezone,
        language: "es-VE",
      },
    },
  );
}

export function OdentalTenantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client, tenantId, isLoading: authLoading } = useOdentalAuth();
  const [config, setConfig] = useState<OdentalTenantConfig>({
    ...dentalClinicPreset,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadTenant = useCallback(async () => {
    if (!tenantId) {
      setConfig({ ...dentalClinicPreset });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await client
      .from("odental_tenant_settings")
      .select(
        "id, slug, clinic_name, business_subtype, theme_override, currency_code, timezone, created_at",
      )
      .eq("id", tenantId)
      .maybeSingle();

    if (error) {
      console.warn("[odental tenant] load:", error.message);
      setConfig({
        ...dentalClinicPreset,
        tenantId,
      });
    } else if (data) {
      setConfig(rowToConfig(data as OdentalTenantSettingsRow));
    } else {
      setConfig({
        ...dentalClinicPreset,
        tenantId,
      });
    }
    setIsLoading(false);
  }, [client, tenantId]);

  useEffect(() => {
    if (authLoading) return;
    void loadTenant();
  }, [authLoading, loadTenant]);

  const updateLocalConfig = useCallback(
    (partial: Partial<OdentalTenantConfig>) => {
      setConfig((prev) => mergeOdentalTenantConfig(prev, partial));
    },
    [],
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      config,
      tenantId: config.tenantId ?? tenantId,
      isLoading: authLoading || isLoading,
      refreshTenant: loadTenant,
      updateLocalConfig,
    }),
    [config, tenantId, authLoading, isLoading, loadTenant, updateLocalConfig],
  );

  return (
    <OdentalTenantContext.Provider value={value}>
      {children}
    </OdentalTenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(OdentalTenantContext);
  if (!ctx) {
    throw new Error("useTenant debe usarse dentro de <OdentalTenantProvider>");
  }
  return ctx;
}

export const useOdentalTenant = useTenant;
