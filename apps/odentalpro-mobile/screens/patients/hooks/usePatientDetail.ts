import { useQuery } from "@tanstack/react-query";

import { useTenant } from "@geemastudio/tenant-config/odental";
import { supabase } from "@/lib/supabase";

import type {
  OdentalClinicalRecordRow,
  OdentalPatientRow,
  PatientDetail,
} from "../types";

/**
 * Ficha de paciente: la fila del paciente + su registro clínico más
 * reciente (de ahí sale el odontograma a mostrar). Dos queries separadas
 * — nunca un join encadenado, PostgREST devuelve `[]` silencioso con eso.
 */
export function usePatientDetail(patientId: string | undefined) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["odental_patient_detail", patientId],
    queryFn: async (): Promise<PatientDetail> => {
      const { data: patient, error: patientError } = await supabase
        .from("odental_patients")
        .select(
          "id, tenant_id, full_name, phone, birth_date, blood_type, allergies, medical_notes, created_at",
        )
        .eq("id", patientId as string)
        .single();

      if (patientError) throw patientError;

      const { data: records, error: recordsError } = await supabase
        .from("odental_clinical_records")
        .select(
          "id, tenant_id, patient_id, dentist_id, visit_date, odontogram, created_at, updated_at",
        )
        .eq("patient_id", patientId as string)
        .order("visit_date", { ascending: false })
        .limit(1);

      if (recordsError) throw recordsError;

      return {
        patient: patient as OdentalPatientRow,
        latestRecord: ((records as OdentalClinicalRecordRow[]) ?? [])[0] ?? null,
      };
    },
    enabled: !!patientId && !!tenantId,
  });
}
