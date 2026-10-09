import { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useHeaderHeight } from '@react-navigation/elements'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WEEK_DAYS } from '@geemastudio/shared-schema'

import { ThemedText } from '@/components/ThemedText'
import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'
import { useServicesData } from '@/screens/services/hooks/useServicesData'

import { AvailabilityNote } from './components/AvailabilityNote'
import { HorarioTab } from './components/HorarioTab'
import { ServiciosTab } from './components/ServiciosTab'
import { av } from './components/availabilityStyles'
import { useAllEmployeeServices, useAllWorkShifts } from './hooks/useAvailability'
import { useEmployeesQuery } from './hooks/useEmployeesData'

type Mode = 'horarios' | 'servicios'

/** Vista de todo el equipo: una tarjeta por profesional con su resumen; al tocarla se edita en un modal. */
function EquipoDisponibilidad({ mode }: { mode: Mode }) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const staffSingular = config.terminology.staffSingular || 'Profesional'

  const employeesQuery = useEmployeesQuery()
  const employees = useMemo(
    () => (employeesQuery.data ?? []).filter((e) => e.is_active),
    [employeesQuery.data]
  )
  const shifts = useAllWorkShifts()
  const svc = useAllEmployeeServices()
  const { services } = useServicesData()
  const activeServices = services.filter((s) => s.is_active).length

  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)

  const daysById = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const s of shifts.data ?? []) {
      const set = map.get(s.employee_id) ?? new Set<number>()
      set.add(s.weekday)
      map.set(s.employee_id, set)
    }
    return map
  }, [shifts.data])

  const loading =
    employeesQuery.isLoading || (mode === 'horarios' ? shifts.isLoading : svc.isLoading)
  const failed = mode === 'horarios' ? shifts.isError : svc.isError

  const summary = (id: string): string => {
    if (mode === 'servicios') {
      if (svc.data?.doesAllById[id] !== false) return 'Todos los servicios'
      const n = svc.data?.countById[id] ?? 0
      return n === 0 ? 'Sin servicios asignados' : `${n} de ${activeServices} servicios`
    }
    return daysById.has(id) ? '' : 'Usa el horario del negocio'
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={[av.content, { paddingTop: headerHeight + Spacing.lg }]}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {mode === 'horarios'
            ? `Toca ${staffSingular.toLowerCase()} para editar sus días y turnos.`
            : `Toca ${staffSingular.toLowerCase()} para elegir qué servicios realiza.`}
        </ThemedText>
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : failed ? (
          <AvailabilityNote kind="error">
            No se pudo cargar la información del equipo.
          </AvailabilityNote>
        ) : (
          employees.map((e) => {
            const days = daysById.get(e.id)
            return (
              <Pressable
                key={e.id}
                onPress={() => setEditing({ id: e.id, name: e.name })}
                accessibilityRole="button"
                style={[
                  av.card,
                  av.row,
                  { borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                ]}
              >
                <View style={av.grow}>
                  <ThemedText style={av.title}>{e.name}</ThemedText>
                  {mode === 'horarios' && days ? (
                    <View style={styles.days}>
                      {WEEK_DAYS.map((d) => {
                        const on = days.has(d.weekday)
                        return (
                          <View
                            key={d.weekday}
                            style={[
                              styles.day,
                              {
                                borderColor: on ? theme.primary : theme.border,
                                backgroundColor: on ? `${theme.primary}22` : 'transparent',
                              },
                            ]}
                          >
                            <ThemedText
                              type="small"
                              style={{
                                color: on ? theme.primary : theme.textMuted,
                                fontWeight: '600',
                              }}
                            >
                              {d.short}
                            </ThemedText>
                          </View>
                        )
                      })}
                    </View>
                  ) : (
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {summary(e.id)}
                    </ThemedText>
                  )}
                </View>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </Pressable>
            )
          })
        )}
      </ScrollView>

      <Modal
        visible={!!editing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditing(null)}
      >
        <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">{editing?.name}</ThemedText>
            <Pressable
              onPress={() => setEditing(null)}
              accessibilityLabel="Cerrar"
              style={[styles.close, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>
          <View style={[styles.root, { paddingBottom: insets.bottom }]}>
            {editing &&
              (mode === 'horarios' ? (
                <HorarioTab
                  key={editing.id}
                  employeeId={editing.id}
                  staffSingular={staffSingular}
                />
              ) : (
                <ServiciosTab
                  key={editing.id}
                  employeeId={editing.id}
                  staffSingular={staffSingular}
                />
              ))}
          </View>
        </View>
      </Modal>
    </View>
  )
}

export function HorariosEquipoScreen() {
  return <EquipoDisponibilidad mode="horarios" />
}

export function ServiciosEquipoScreen() {
  return <EquipoDisponibilidad mode="servicios" />
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  days: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  day: {
    minWidth: 30,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
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
