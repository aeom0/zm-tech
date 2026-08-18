import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { OdontogramState } from '@odentalpro/dental-schema'

import { OdontogramView, createEmptyOdontogram } from '@/screens/odontogram'
import { useClinicalRecords } from '@/screens/clinical-records/hooks/useClinicalRecords'

import { usePatientDetail } from './hooks/usePatientDetail'
import type { PatientsStackParamList } from './types'

type Props = NativeStackScreenProps<PatientsStackParamList, 'PatientDetail'>

export function PatientDetailScreen({ route }: Props) {
  const { patientId } = route.params
  const { data: detail, isLoading, error } = usePatientDetail(patientId)
  const { saveOdontogram, isSameDay } = useClinicalRecords(patientId)

  const [odontogram, setOdontogram] = useState<OdontogramState>(() => createEmptyOdontogram())
  const [isEditing, setIsEditing] = useState(false)
  /** ID del registro clínico de la sesión activa; evita doble insert si el usuario guarda antes del refetch. */
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const loadedForPatient = useRef<string | null>(null)

  // Sincroniza el estado local una sola vez por paciente cargado — no pisa
  // ediciones locales si React Query vuelve a refetchear en background.
  useEffect(() => {
    if (!detail || detail.patient.id !== patientId) return
    if (loadedForPatient.current === patientId) return
    loadedForPatient.current = patientId

    const { latestRecord } = detail
    const hasOpenSessionToday = !!latestRecord && isSameDay(latestRecord.visit_date)

    setOdontogram(latestRecord?.odontogram ?? createEmptyOdontogram())
    setIsEditing(hasOpenSessionToday)
    setActiveRecordId(hasOpenSessionToday ? latestRecord!.id : null)
  }, [detail, isSameDay, patientId])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2dd4bf" />
      </View>
    )
  }

  if (error || !detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar la ficha del paciente.</Text>
      </View>
    )
  }

  const { patient, latestRecord } = detail
  const recordIdFromQuery =
    latestRecord && isSameDay(latestRecord.visit_date) ? latestRecord.id : null
  const currentRecordId = activeRecordId ?? recordIdFromQuery

  const handleSave = () => {
    saveOdontogram.mutate(
      { patientId, currentRecordId, odontogram },
      { onSuccess: (record) => setActiveRecordId(record.id) }
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{patient.full_name}</Text>
        {patient.allergies ? (
          <Text style={styles.allergyBadge}>Alergias: {patient.allergies}</Text>
        ) : null}
      </View>

      {!isEditing ? (
        <Pressable style={styles.primaryBtn} onPress={() => setIsEditing(true)}>
          <Text style={styles.primaryText}>Nueva consulta</Text>
        </Pressable>
      ) : null}

      <OdontogramView
        value={odontogram}
        onChange={setOdontogram}
        editable={isEditing}
        title={isEditing ? 'Odontograma — consulta actual' : 'Odontograma (solo lectura)'}
      />

      {isEditing ? (
        <Pressable
          style={styles.primaryBtn}
          disabled={saveOdontogram.isPending}
          onPress={handleSave}
        >
          <Text style={styles.primaryText}>
            {saveOdontogram.isPending ? 'Guardando…' : 'Guardar'}
          </Text>
        </Pressable>
      ) : null}

      {saveOdontogram.isError ? (
        <Text style={styles.errorText}>No se pudo guardar el odontograma.</Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f14' },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { gap: 4 },
  name: { color: '#f0f4f8', fontSize: 20, fontWeight: '700' },
  allergyBadge: { color: '#fbbf24', fontSize: 13 },
  primaryBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600' },
  errorText: { color: '#f87171', fontSize: 13, textAlign: 'center' },
})
