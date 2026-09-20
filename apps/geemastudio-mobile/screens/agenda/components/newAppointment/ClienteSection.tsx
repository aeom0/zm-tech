import React, { useMemo, useState } from 'react'
import { View, TextInput, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'

import { useAgendaClients, type AgendaClientOption } from '../../hooks/useAgendaClients'
import type { AgendaFormState } from '../../types'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

const MAX_SUGGESTIONS = 5

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
  const { data: clients = [] } = useAgendaClients()
  const [isFocused, setIsFocused] = useState(false)

  const suggestions = useMemo(() => {
    const query = formData.clientName.trim().toUpperCase()
    if (!query) return []
    return clients
      .filter((c) => c.name.toUpperCase().includes(query))
      .slice(0, MAX_SUGGESTIONS)
  }, [clients, formData.clientName])

  const showSuggestions =
    isFocused &&
    suggestions.length > 0 &&
    !(suggestions.length === 1 && suggestions[0].name.toUpperCase() === formData.clientName.trim().toUpperCase())

  const selectClient = (client: AgendaClientOption) => {
    setFormData((prev) => ({
      ...prev,
      clientName: client.name.toUpperCase(),
      clientPhone: client.phone ?? prev.clientPhone,
      clientDocument: client.dni ?? prev.clientDocument,
    }))
    setIsFocused(false)
  }

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
        autoCapitalize="characters"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        onChangeText={(text) =>
          setFormData((prev) => ({ ...prev, clientName: text.toUpperCase() }))
        }
      />
      {showSuggestions ? (
        <View
          style={[
            styles.suggestionsList,
            { borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
          ]}
        >
          {suggestions.map((client, index) => (
            <Pressable
              key={client.id}
              style={[
                styles.suggestionItem,
                { borderTopColor: theme.border, borderTopWidth: index === 0 ? 0 : 1 },
              ]}
              onPress={() => selectClient(client)}
            >
              <ThemedText style={[styles.suggestionName, { color: theme.text }]}>
                {client.name}
              </ThemedText>
              {client.phone ? (
                <ThemedText style={[styles.suggestionMeta, { color: theme.textMuted }]}>
                  {client.phone}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
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
