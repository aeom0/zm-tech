import React from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { useOdentalAuth, useTenant } from '@zmtech/tenant-config/odental'

import { usePatients } from './hooks/usePatients'
import type { OdentalPatientRow, PatientsStackParamList } from './types'

type Props = NativeStackScreenProps<PatientsStackParamList, 'PatientsList'>

function TopBar() {
  const { employee, logout } = useOdentalAuth()
  const { config } = useTenant()

  return (
    <View style={styles.topBar}>
      <View>
        <Text style={styles.clinicName}>{config.clinicName}</Text>
        <Text style={styles.meta}>{employee?.full_name}</Text>
      </View>
      <Pressable onPress={() => void logout()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  )
}

export function PatientsListScreen({ navigation }: Props) {
  const { data: patients, isLoading, error } = usePatients()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2dd4bf" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar la lista de pacientes.</Text>
      </View>
    )
  }

  return (
    <FlatList
      ListHeaderComponent={<TopBar />}
      style={styles.list}
      data={patients ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Todavía no hay pacientes registrados.</Text>
        </View>
      }
      renderItem={({ item }: { item: OdentalPatientRow }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}
        >
          <Text style={styles.name}>{item.full_name}</Text>
          {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#0a0f14' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  clinicName: { color: '#f0f4f8', fontSize: 16, fontWeight: '600' },
  logoutText: { color: '#2dd4bf', fontSize: 13 },
  listContent: { padding: 16, gap: 8, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  name: { color: '#f0f4f8', fontSize: 15, fontWeight: '600' },
  meta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  errorText: { color: '#f87171', fontSize: 13, textAlign: 'center' },
})
