import React from 'react'
import { View, TextInput } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'

import type { AgendaFormState } from '../../types'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

interface ClienteSectionProps {
  theme: NewAppointmentModalTheme
  formData: AgendaFormState
  setFormData: React.Dispatch<React.SetStateAction<AgendaFormState>>
  clientLabel?: string
}

export function ClienteSection({
  theme,
  formData,
  setFormData,
  clientLabel = 'Clienta',
}: ClienteSectionProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Feather name="user" size={16} color={theme.primary} />
        <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {clientLabel}
        </ThemedText>
      </View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        placeholder={`Nombre de la ${clientLabel.toLowerCase()}`}
        placeholderTextColor={theme.textMuted}
        value={formData.clientName}
        onChangeText={(text) => setFormData((prev) => ({ ...prev, clientName: text }))}
      />
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
            marginTop: Spacing.sm,
          },
        ]}
        placeholder="Teléfono (opcional)"
        placeholderTextColor={theme.textMuted}
        value={formData.clientPhone}
        keyboardType="phone-pad"
        onChangeText={(text) => setFormData((prev) => ({ ...prev, clientPhone: text }))}
      />
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
            marginTop: Spacing.sm,
          },
        ]}
        placeholder="DNI (opcional)"
        placeholderTextColor={theme.textMuted}
        value={formData.clientDocument}
        keyboardType="number-pad"
        onChangeText={(text) => setFormData((prev) => ({ ...prev, clientDocument: text }))}
      />
    </View>
  )
}
