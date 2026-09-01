import React, { useState } from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { Spacing } from '@/constants/theme'

import { addPackServiceLines } from '../../agendaUtils'
import type {
  AgendaFormState,
  AgendaPack,
  AgendaService,
  AgendaServiceCategory,
} from '../../types'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

type PickerTab = 'services' | 'packs'

interface ServicioSectionProps {
  theme: NewAppointmentModalTheme
  currencySymbol: string
  formData: AgendaFormState
  setFormData: React.Dispatch<React.SetStateAction<AgendaFormState>>
  servicesByCategory: AgendaService[]
  selectedCategory: AgendaServiceCategory | undefined
  servicesLoading: boolean
  servicesError: unknown
  packs: AgendaPack[]
  packsLoading: boolean
}

export function ServicioSection({
  theme,
  currencySymbol,
  formData,
  setFormData,
  servicesByCategory,
  selectedCategory,
  servicesLoading,
  servicesError,
  packs,
  packsLoading,
}: ServicioSectionProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('services')

  const selectedServiceIds = formData.serviceLines.map((l) => l.serviceId)

  const toggleService = (serviceId: string) => {
    setFormData((prev) => {
      const exists = prev.serviceLines.some((l) => l.serviceId === serviceId)
      if (exists) {
        return {
          ...prev,
          serviceLines: prev.serviceLines.filter((l) => l.serviceId !== serviceId),
        }
      }
      return {
        ...prev,
        serviceLines: [...prev.serviceLines, { serviceId, employeeId: prev.employeeId }],
      }
    })
  }

  const addPack = (pack: AgendaPack) => {
    const newLines = addPackServiceLines(pack, formData.employeeId)
    if (newLines.length === 0) return
    setFormData((prev) => ({ ...prev, serviceLines: [...prev.serviceLines, ...newLines] }))
  }

  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Feather name="list" size={16} color={theme.primary} />
        <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          Servicios
        </ThemedText>
      </View>

      <View style={styles.pickerTabsRow}>
        {(
          [
            { key: 'services' as const, label: 'Servicios' },
            { key: 'packs' as const, label: 'Packs' },
          ]
        ).map((tab) => {
          const active = activeTab === tab.key
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.pickerTab,
                { borderColor: active ? theme.primary : theme.border },
                active && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <ThemedText
                style={[styles.pickerTabText, { color: active ? '#FFFFFF' : theme.text }]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          )
        })}
      </View>

      {activeTab === 'services' ? (
        servicesLoading ? (
          <ActivityIndicator color={theme.primary} style={{ padding: Spacing.lg }} />
        ) : servicesError ? (
          <View style={[styles.emptyState, { backgroundColor: theme.error + '15' }]}>
            <Feather name="wifi-off" size={20} color={theme.error} />
            <ThemedText style={[styles.emptyText, { color: theme.error }]}>
              Error al cargar servicios.
            </ThemedText>
          </View>
        ) : !formData.categoryId ? (
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            Elige primero una categoría.
          </ThemedText>
        ) : servicesByCategory.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            No hay servicios en {selectedCategory?.name}.
          </ThemedText>
        ) : (
          <ScrollFadeRow
            backgroundColor={theme.backgroundDefault}
            arrowColor={theme.textSecondary}
            contentContainerStyle={styles.chipsContainer}
          >
            {servicesByCategory.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id)
              return (
                <Pressable
                  key={service.id}
                  style={[
                    styles.serviceChip,
                    { borderColor: theme.border },
                    isSelected && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => toggleService(service.id)}
                >
                  <ThemedText
                    style={[styles.serviceChipName, isSelected && { color: '#FFFFFF' }]}
                    numberOfLines={1}
                  >
                    {service.name}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.serviceChipDetail,
                      {
                        color: isSelected ? 'rgba(255,255,255,0.8)' : theme.textMuted,
                      },
                    ]}
                  >
                    {currencySymbol} {service.price} · {service.duration} min
                  </ThemedText>
                </Pressable>
              )
            })}
          </ScrollFadeRow>
        )
      ) : packsLoading ? (
        <ActivityIndicator color={theme.primary} style={{ padding: Spacing.lg }} />
      ) : packs.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
          No hay packs disponibles.
        </ThemedText>
      ) : (
        <ScrollFadeRow
          backgroundColor={theme.backgroundDefault}
          arrowColor={theme.textSecondary}
          contentContainerStyle={styles.chipsContainer}
        >
          {packs.map((pack) => {
            const alreadyAdded =
              pack.service_ids.length > 0 &&
              pack.service_ids.every((sid) => selectedServiceIds.includes(sid))
            return (
              <Pressable
                key={pack.id}
                style={[
                  styles.serviceChip,
                  { borderColor: theme.border },
                  alreadyAdded && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => !alreadyAdded && addPack(pack)}
              >
                <ThemedText
                  style={[styles.serviceChipName, alreadyAdded && { color: '#FFFFFF' }]}
                  numberOfLines={1}
                >
                  {pack.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.serviceChipDetail,
                    { color: alreadyAdded ? 'rgba(255,255,255,0.8)' : theme.textMuted },
                  ]}
                >
                  {pack.service_ids.length} servicios · {currencySymbol} {pack.price}
                </ThemedText>
              </Pressable>
            )
          })}
        </ScrollFadeRow>
      )}
    </View>
  )
}
