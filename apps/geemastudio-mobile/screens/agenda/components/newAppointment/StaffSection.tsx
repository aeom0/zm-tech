import React from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { Spacing } from '@/constants/theme'

import type { AgendaEmployee, AgendaFormState } from '../../types'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

/**
 * Selecciona el profesional "por defecto": se asigna a cada nueva línea de
 * servicio que se agregue desde ServicioSection, y al cambiarlo también
 * arrastra las líneas ya agregadas que todavía coincidían con el default
 * anterior (las que el usuario ya reasignó a mano quedan intactas).
 */
interface StaffSectionProps {
  theme: NewAppointmentModalTheme
  formData: AgendaFormState
  setFormData: React.Dispatch<React.SetStateAction<AgendaFormState>>
  employees: AgendaEmployee[]
  employeesLoading: boolean
  employeesError: unknown
  staffSingular: string
  staffPlural: string
}

export function StaffSection({
  theme,
  formData,
  setFormData,
  employees,
  employeesLoading,
  employeesError,
  staffSingular,
  staffPlural,
}: StaffSectionProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Feather name="heart" size={16} color={theme.primary} />
        <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {staffSingular}
        </ThemedText>
      </View>

      {employeesLoading ? (
        <ActivityIndicator color={theme.primary} style={{ padding: Spacing.lg }} />
      ) : employeesError ? (
        <View style={[styles.emptyState, { backgroundColor: theme.error + '15' }]}>
          <Feather name="wifi-off" size={20} color={theme.error} />
          <ThemedText style={[styles.emptyText, { color: theme.error }]}>
            Error al cargar el personal. Verifica la conexión.
          </ThemedText>
        </View>
      ) : employees.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="alert-circle" size={20} color={theme.textMuted} />
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            No hay {staffPlural.toLowerCase()} registrados. Agrega personal primero.
          </ThemedText>
        </View>
      ) : (
        <ScrollFadeRow
          backgroundColor={theme.backgroundDefault}
          arrowColor={theme.textSecondary}
          contentContainerStyle={styles.chipsContainer}
        >
          {employees.map((employee) => {
            const isSelected = formData.employeeId === employee.id
            return (
              <Pressable
                key={employee.id}
                style={[
                  styles.employeeChip,
                  {
                    borderColor: employee.color,
                    backgroundColor: isSelected ? employee.color : 'transparent',
                  },
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    employeeId: employee.id,
                    // Las líneas que seguían el default anterior se mueven junto con él;
                    // las que el usuario ya reasignó a mano quedan intactas.
                    serviceLines: prev.serviceLines.map((line) =>
                      line.employeeId === prev.employeeId
                        ? { ...line, employeeId: employee.id }
                        : line
                    ),
                  }))
                }
              >
                <View
                  style={[
                    styles.employeeAvatar,
                    {
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : employee.color + '20',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.employeeInitial,
                      {
                        color: isSelected ? '#FFFFFF' : employee.color,
                      },
                    ]}
                  >
                    {employee.name[0]}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.employeeChipName, isSelected && { color: '#FFFFFF' }]}>
                  {employee.name.split(' ')[0]}
                </ThemedText>
              </Pressable>
            )
          })}
        </ScrollFadeRow>
      )}
    </View>
  )
}
