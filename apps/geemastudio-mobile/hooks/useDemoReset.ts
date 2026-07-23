import { useCallback } from "react";

import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Llama a la Edge Function reset-demo-tenant si el tenant actual
 * tiene isDemo = true. Se invoca justo antes de hacer sign-out.
 */
export function useDemoReset() {
  const { config } = useTenant();

  const resetIfDemo = useCallback(async (): Promise<void> => {
    if (!config.isDemo) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reset-demo-tenant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.warn("[useDemoReset] Edge Function error:", body);
      }
    } catch (err) {
      console.warn("[useDemoReset] Reset failed, continuing logout:", err);
    }
  }, [config.isDemo]);

  return { resetIfDemo };
}
