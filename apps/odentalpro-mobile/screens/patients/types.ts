import type { OdontogramState } from '@odentalpro/dental-schema'

/** Fila `odental_patients` (snake_case como viene de Supabase). */
export interface OdentalPatientRow {
  id: string
  tenant_id: string
  full_name: string
  phone: string | null
  birth_date: string | null
  blood_type: string | null
  allergies: string | null
  medical_notes: string | null
  created_at: string | null
}

/** Fila `odental_clinical_records` (subset usado por la ficha de paciente). */
export interface OdentalClinicalRecordRow {
  id: string
  tenant_id: string
  patient_id: string
  dentist_id: string | null
  visit_date: string
  odontogram: OdontogramState | null
  created_at: string | null
  updated_at: string | null
}

/** Detalle de ficha: paciente + su registro clínico más reciente (si existe). */
export type PatientDetail = {
  patient: OdentalPatientRow
  latestRecord: OdentalClinicalRecordRow | null
}

export type PatientsStackParamList = {
  PatientsList: undefined
  PatientDetail: { patientId: string }
}
