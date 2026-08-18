import React from 'react'
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'

import type { AgendaEmployee, AgendaFormState } from '../../types'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
        </ScrollView>
      )}
    </View>
  )
}
