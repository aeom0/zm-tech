import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TIME_OFF_KIND_LABELS, trimTime } from '@geemastudio/shared-schema'

import { ThemedText } from '@/components/ThemedText'
import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'

import { AusenciasTab } from './components/AusenciasTab'
import { AvailabilityNote } from './components/AvailabilityNote'
import { av } from './components/availabilityStyles'
import {
  useAllTimeOff,
  useCoverages,
  useDeleteCoverage,
  useDeleteTimeOff,
} from './hooks/useAvailability'
import { useEmployeesQuery } from './hooks/useEmployeesData'
import { rangeLabel, todayIso } from './lib/availabilityUi'

function confirmDelete(title: string, message: string | undefined, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
  ])
}

/** Ausencias y coberturas de todo el equipo, con acceso directo a registrar una nueva. */
export default function AusenciasEquipoScreen() {
  const { theme } = useTheme()
  const { config } = useTenant()
  const insets = useSafeAreaInsets()
  const staffSingular = config.terminology.staffSingular || 'Profesional'
  const timezone = config.locale.timezone

  const employeesQuery = useEmployeesQuery()
  const employees = useMemo(
    () => (employeesQuery.data ?? []).filter((e) => e.is_active),
    [employeesQuery.data]
  )
  const names = useMemo(
    () => new Map((employeesQuery.data ?? []).map((e) => [e.id, e.name])),
    [employeesQuery.data]
  )
  const timeOff = useAllTimeOff()
  const coverages = useCoverages()
  const delTimeOff = useDeleteTimeOff('')
  const delCoverage = useDeleteCoverage()

  const [modalOpen, setModalOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  const today = todayIso(timezone)
  const isCurrent = (to: string | null) => to === null || to >= today
  const upcoming = (timeOff.data ?? []).filter((t) => isCurrent(t.date_to))
  const past = (timeOff.data ?? [])
    .filter((t) => !isCurrent(t.date_to))
    .reverse()
    .slice(0, 10)
  const activeCoverages = (coverages.data ?? []).filter((c) => c.date_to >= today).reverse()

  const cardStyle = [av.card, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]
  const selected = employeeId ?? employees[0]?.id ?? null

  const renderTimeOff = (t: NonNullable<typeof timeOff.data>[number]) => (
    <View key={t.id} style={[cardStyle, av.row]}>
      <View style={av.grow}>
        <ThemedText style={av.title}>{names.get(t.employee_id) ?? staffSingular}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {TIME_OFF_KIND_LABELS[t.kind]} · {rangeLabel(t.date_from, t.date_to)}
          {t.start_time && t.end_time ? ` · ${trimTime(t.start_time)}–${trimTime(t.end_time)}` : ''}
        </ThemedText>
        {t.reason ? (
          <ThemedText type="small" style={{ color: theme.textMuted }} numberOfLines={1}>
            {t.reason}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel="Eliminar ausencia"
        style={[av.iconBtn, { borderColor: theme.border }]}
        onPress={() =>
          confirmDelete('¿Eliminar esta ausencia?', 'Los horarios vuelven a estar disponibles.', () =>
            delTimeOff.mutate(t.id)
          )
        }
      >
        <Feather name="trash-2" size={18} color={theme.error} />
      </Pressable>
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={av.content}>
        <Pressable
          onPress={() => setModalOpen(true)}
          accessibilityRole="button"
          style={[av.primaryBtn, { backgroundColor: theme.primary }]}
        >
          <Feather name="plus" size={18} color={theme.buttonText} />
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>Nueva ausencia</ThemedText>
        </Pressable>

        {timeOff.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : timeOff.isError ? (
          <AvailabilityNote kind="error">No se pudieron cargar las ausencias.</AvailabilityNote>
        ) : (
          <>
            <ThemedText style={av.sectionTitle}>Vigentes y próximas</ThemedText>
            {upcoming.length === 0 ? (
              <AvailabilityNote kind="info">No hay ausencias vigentes ni próximas.</AvailabilityNote>
            ) : (
              upcoming.map(renderTimeOff)
            )}
          </>
        )}

        {activeCoverages.length > 0 && (
          <>
            <ThemedText style={av.sectionTitle}>Coberturas</ThemedText>
            {activeCoverages.map((c) => (
              <View key={c.id} style={[cardStyle, av.row]}>
                <View style={av.grow}>
                  <ThemedText style={av.title}>
                    {names.get(c.covering_employee_id) ?? staffSingular} cubre a{' '}
                    {names.get(c.covered_employee_id) ?? staffSingular}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {rangeLabel(c.date_from, c.date_to)}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityLabel="Eliminar cobertura"
                  style={[av.iconBtn, { borderColor: theme.border }]}
                  onPress={() =>
                    confirmDelete('¿Eliminar esta cobertura?', undefined, () => delCoverage.mutate(c.id))
                  }
                >
                  <Feather name="trash-2" size={18} color={theme.error} />
                </Pressable>
              </View>
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <ThemedText style={av.sectionTitle}>Anteriores</ThemedText>
            {past.map(renderTimeOff)}
          </>
        )}
      </ScrollView>

      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Nueva ausencia o cobertura</ThemedText>
            <Pressable
              onPress={() => setModalOpen(false)}
              accessibilityLabel="Cerrar"
              style={[styles.close, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>
          <View style={av.chips}>
            {employees.map((e) => {
              const active = selected === e.id
              return (
                <Pressable
                  key={e.id}
                  onPress={() => setEmployeeId(e.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    av.chip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? `${theme.primary}22` : 'transparent',
                    },
                  ]}
                >
                  <ThemedText type="small" style={{ color: active ? theme.primary : theme.textSecondary }}>
                    {e.name}
                  </ThemedText>
                </Pressable>
              )
            })}
          </View>
          <View style={[styles.root, { paddingBottom: insets.bottom }]}>
            {selected && (
              <AusenciasTab
                key={selected}
                employeeId={selected}
                employeeName={names.get(selected) ?? staffSingular}
                staffSingular={staffSingular}
                timezone={timezone}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
