import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OdontogramState } from "@odentalpro/dental-schema";

import { useOdentalAuth, useTenant } from "@zmtech/tenant-config/odental";
import { supabase } from "@/lib/supabase";

import type { OdentalClinicalRecordRow } from "../../patients/types";

type SaveOdontogramInput = {
  patientId: string;
  /** Registro clínico existente de la sesión activa (mismo día, mismo dentista), si lo hay. */
  currentRecordId: string | null;
  odontogram: OdontogramState;
};

function isSameDay(isoDate: string): boolean {
  const a = new Date(isoDate);
  const b = new Date();
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Punto de entrada de Fase 3 (historia clínica): por ahora solo guarda el
 * odontograma, pero el upsert de `odental_clinical_records` es el mismo que
 * usará `ClinicalRecordScreen` para motivo de consulta/diagnóstico.
 */
export function useClinicalRecords(patientId: string | undefined) {
  const { tenantId } = useTenant();
  const { employeeId } = useOdentalAuth();
  const queryClient = useQueryClient();

  const saveOdontogram = useMutation({
    mutationFn: async ({
      patientId: inputPatientId,
      currentRecordId,
      odontogram,
    }: SaveOdontogramInput): Promise<OdentalClinicalRecordRow> => {
      if (!tenantId || !inputPatientId) {
        throw new Error("No hay tenant o paciente activo.");
      }

      if (currentRecordId) {
        const { data, error } = await supabase
          .from("odental_clinical_records")
          .update({ odontogram, updated_at: new Date().toISOString() })
          .eq("id", currentRecordId)
          .select(
            "id, tenant_id, patient_id, dentist_id, visit_date, odontogram, created_at, updated_at",
          )
          .single();
        if (error) throw error;
        return data as OdentalClinicalRecordRow;
      }

      const { data, error } = await supabase
        .from("odental_clinical_records")
        .insert({
          tenant_id: tenantId,
          patient_id: inputPatientId,
          dentist_id: employeeId,
          odontogram,
        })
        .select(
          "id, tenant_id, patient_id, dentist_id, visit_date, odontogram, created_at, updated_at",
        )
        .single();
      if (error) throw error;
      return data as OdentalClinicalRecordRow;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["odental_patient_detail", patientId],
      });
    },
  });

  return { saveOdontogram, isSameDay };
}
