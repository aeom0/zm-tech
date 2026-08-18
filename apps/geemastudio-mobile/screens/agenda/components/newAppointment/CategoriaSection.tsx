import React from 'react'
import { View, ScrollView, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'

import type { AgendaFormState, AgendaService, AgendaServiceCategory } from '../../types'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

interface CategoriaSectionProps {
  theme: NewAppointmentModalTheme
  formData: AgendaFormState
  setFormData: React.Dispatch<React.SetStateAction<AgendaFormState>>
  categories: AgendaServiceCategory[]
  services: AgendaService[]
}

export function CategoriaSection({
  theme,
  formData,
  setFormData,
  categories,
  services,
}: CategoriaSectionProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Feather name="grid" size={16} color={theme.primary} />
        <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          Categoría
        </ThemedText>
      </View>
      {categories.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
          No hay categorías. Crea categorías en Servicios.
        </ThemedText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {categories.map((cat) => {
            const isSelected = formData.categoryId === cat.id
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.serviceChip,
                  { borderColor: theme.border },
                  isSelected && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() =>
                  setFormData((prev) => {
                    const firstInCat = services.find((s) => s.category_id === cat.id)
                    return {
                      ...prev,
                      categoryId: cat.id,
                      serviceId: firstInCat?.id ?? '',
                    }
                  })
                }
              >
                <ThemedText
                  style={[styles.serviceChipName, isSelected && { color: '#FFFFFF' }]}
                  numberOfLines={1}
                >
                  {cat.name}
                </ThemedText>
              </Pressable>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
