import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { AppointmentHistory } from "../types";

export function useClientDetail(clientId: string | null) {
  return useQuery({
    queryKey: ["client_detail", clientId],
    enabled: !!clientId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!clientId) return null;

      const { data: apts, error } = await supabase
        .from("appointments")
        .select(
          "id, date, status, price, notes, service_id, service_ids, service_names_snapshot, employee_id",
        )
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!apts || apts.length === 0) return [] as AppointmentHistory[];

      const aptIds = (apts as any[]).map((a) => a.id);

      const allEmpIds = new Set<string>();
      for (const a of apts as any[]) {
        if (a.employee_id) allEmpIds.add(a.employee_id);
      }

      const [
        { data: aptSvcLines },
        { data: payments },
        { data: allServices },
        { data: employees },
      ] = await Promise.all([
        aptIds.length
          ? supabase
              .from("appointment_services")
              .select("appointment_id, service_id, employee_id")
              .in("appointment_id", aptIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        aptIds.length
          ? supabase
              .from("payments")
              .select("appointment_id, amount, is_abono")
              .in("appointment_id", aptIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        supabase.from("services").select("id, name"),
        allEmpIds.size
          ? supabase
              .from("employees")
              .select("id, name, color")
              .in("id", [...allEmpIds])
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const svcMap = new Map(
        (allServices ?? []).map((s: any) => [String(s.id).trim(), s]),
      );
      const empMap = new Map((employees ?? []).map((e: any) => [e.id, e]));

      const buildSvcList = (
        svcIds: (string | number | null | undefined)[],
      ): { name: string; category_color: string | null }[] =>
        svcIds.map((svcId) => {
          const key = svcId != null ? String(svcId).trim() : "";
          const svc = key ? (svcMap.get(key) as any) : undefined;

          let fallbackName = "Servicio sin nombre";
          if (!svc && key) {
            if (key.startsWith("svc-")) {
              const slug = key.replace(/^svc-/, "");
              const pretty = slug
                .split("-")
                .map(
                  (part: string) =>
                    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
                )
                .join(" ");
              fallbackName = pretty || fallbackName;
            } else if (!/^[0-9a-f-]{36}$/i.test(key)) {
              fallbackName = key;
            }
          }

          return { name: svc?.name ?? fallbackName, category_color: null };
        });

      const history: AppointmentHistory[] = (apts as any[]).map((a) => {
        const totalPaid = (payments ?? [])
          .filter((p: any) => p.appointment_id === a.id)
          .reduce(
            (sum: number, p: any) => sum + parseFloat(p.amount ?? "0"),
            0,
          );
        const price = parseFloat(a.price ?? "0");

        const namesSnapshot: string[] | null =
          (a as any).service_names_snapshot ?? null;

        const aptLines = (aptSvcLines ?? []).filter(
          (l: any) => l.appointment_id === a.id,
        );

        let svcList: { name: string; category_color: string | null }[];

        if (namesSnapshot && namesSnapshot.length > 0) {
          svcList = namesSnapshot.map((name) => ({
            name,
            category_color: null,
          }));
        } else if (aptLines.length > 0) {
          const lineSvcIds = aptLines
            .map((l: any) => l.service_id)
            .filter((id: string | null) => !!id);
          svcList = buildSvcList(lineSvcIds);
        } else {
          const raw = a.service_ids;
          let ids: string[] = [];
          if (Array.isArray(raw)) {
            ids = raw;
          } else if (typeof raw === "string" && raw.length > 0) {
            ids = raw
              .replace(/^\{|\}$/g, "")
              .split(",")
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
          }
          if (!ids.length && a.service_id) {
            ids = [a.service_id];
          }
          svcList = buildSvcList(ids);
        }

        const emp = empMap.get(a.employee_id) as any;

        return {
          id: a.id,
          date: a.date,
          status: a.status,
          price: a.price,
          employee_name: emp?.name ?? null,
          employee_color: emp?.color ?? null,
          services: svcList,
          total_paid: totalPaid,
          pending_amount: Math.max(0, price - totalPaid),
        };
      });

      return history;
    },
  });
}
