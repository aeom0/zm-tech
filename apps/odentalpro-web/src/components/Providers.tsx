"use client";

import { useMemo } from "react";
import {
  OdentalAuthProvider,
  OdentalTenantProvider,
  useTenant,
} from "@geemastudio/tenant-config/odental";
import { createClient } from "@/lib/supabase/client";

function TenantBadge() {
  const { config, tenantId, isLoading } = useTenant();
  if (isLoading) return <p className="text-sm text-slate-500">Cargando tenant…</p>;
  return (
    <p className="mt-6 text-sm text-slate-400">
      Preset <span className="text-teal-400">{config.preset}</span>
      {tenantId ? (
        <>
          {" "}
          · clínica <span className="text-white">{config.clinicName}</span>
        </>
      ) : (
        " · sin sesión (preset local)"
      )}
    </p>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  if (!client) {
    return <>{children}</>;
  }

  return (
    <OdentalAuthProvider client={client}>
      <OdentalTenantProvider>
        {children}
        <TenantBadge />
      </OdentalTenantProvider>
    </OdentalAuthProvider>
  );
}
