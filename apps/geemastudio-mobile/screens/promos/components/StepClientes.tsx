import React, { useMemo } from 'react'
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Button } from '@/components/Button'
import { useTheme } from '@/hooks/useTheme'
import { useHaptics } from '@/hooks/useHaptics'
import { Spacing, BorderRadius } from '@/constants/theme'
import { useClientesSegmento } from '../hooks/useClientesSegmento'
import type { ClienteSegmento } from '../types'
import { useServicesData } from '@/screens/services/hooks/useServicesData'

interface StepClientesProps {
  selectedClients: ClienteSegmento[]
  onChangeSelected: (clients: ClienteSegmento[]) => void
  onNext: () => void
}

function formatLastVisit(date: string | null): string {
  if (!date) return 'Sin citas recientes'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Hoy'
  if (diffDays === 1) return 'Hace 1 día'
  if (diffDays < 7) return `Hace ${diffDays} días`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks === 1) return 'Hace 1 semana'
  if (diffWeeks < 8) return `Hace ${diffWeeks} semanas`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths <= 1) return 'Hace ~1 mes'
  return `Hace ~${diffMonths} meses`
}

export function StepClientes({ selectedClients, onChangeSelected, onNext }: StepClientesProps) {
  const { theme } = useTheme()
  const haptics = useHaptics()
  const [categoryName, setCategoryName] = React.useState<string | null>(null)
  const [inactiveOnly, setInactiveOnly] = React.useState(true)

  const { categories } = useServicesData()
  const { data: clientes = [], isLoading } = useClientesSegmento(categoryName, inactiveOnly)

  const selectedIds = useMemo(() => new Set(selectedClients.map((c) => c.id)), [selectedClients])

  const toggleClient = (cliente: ClienteSegmento) => {
    const exists = selectedIds.has(cliente.id)
    let next: ClienteSegmento[]
    if (exists) {
      next = selectedClients.filter((c) => c.id !== cliente.id)
    } else {
      next = [...selectedClients, cliente]
    }
    onChangeSelected(next)
    haptics.selection()
  }

  const handleSelectAll = () => {
    onChangeSelected(clientes)
    haptics.selection()
  }

  const handleDeselectAll = () => {
    onChangeSelected([])
    haptics.selection()
  }

  const canContinue = selectedClients.length > 0

  return (
    <View style={styles.container}>
      <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
        Elige las clientas
      </ThemedText>

      <View style={styles.categoryRow}>
        <Pressable
          onPress={() => {
            setInactiveOnly(true)
            onChangeSelected([])
          }}
          style={({ pressed }) => [
            styles.categoryPill,
            {
              backgroundColor: inactiveOnly ? theme.primary : theme.backgroundDefault,
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText
            type="small"
            style={{ color: inactiveOnly ? theme.buttonText : theme.text, fontWeight: '600' }}
          >
            30+ días sin visita
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            setInactiveOnly(false)
            setCategoryName(null)
            onChangeSelected([])
          }}
          style={({ pressed }) => [
            styles.categoryPill,
            {
              backgroundColor: !inactiveOnly && categoryName == null ? theme.primary : theme.backgroundDefault,
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText
            type="small"
            style={{
              color: !inactiveOnly && categoryName == null ? theme.buttonText : theme.text,
              fontWeight: '600',
            }}
          >
            Todas
          </ThemedText>
        </Pressable>

        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              setCategoryName(cat.name)
              setInactiveOnly(false)
              onChangeSelected([])
            }}
            style={({ pressed }) => [
              styles.categoryPill,
              {
                backgroundColor: categoryName === cat.name ? theme.primary : theme.backgroundDefault,
                borderColor: theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: categoryName === cat.name ? theme.buttonText : theme.text,
                fontWeight: '600',
              }}
            >
              {cat.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={handleSelectAll} style={styles.textButton}>
          <ThemedText type="small" style={{ color: theme.link }}>
            Seleccionar todas
          </ThemedText>
        </Pressable>
        <Pressable onPress={handleDeselectAll} style={styles.textButton}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Deseleccionar todas
          </ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="small" style={{ marginTop: Spacing.sm }}>
            Cargando clientas...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingVertical: Spacing.md }}
          ListEmptyComponent={
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: 'center', paddingVertical: Spacing.xl }}
            >
              No hay clientas en esta categoría
            </ThemedText>
          }
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id)
            return (
              <Pressable
                onPress={() => toggleClient(item)}
                style={({ pressed }) => [
                  styles.clientRow,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: selected ? theme.primary : theme.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '600' }}>{item.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {item.days_since_last_visit != null
                      ? `Hace ${item.days_since_last_visit} días`
                      : formatLastVisit(item.last_appointment_date)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    {item.phone}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? theme.primary : 'transparent',
                    },
                  ]}
                >
                  {selected && <Feather name="check" size={16} color={theme.buttonText} />}
                </View>
              </Pressable>
            )
          }}
        />
      )}

      <View style={{ marginTop: Spacing.lg }}>
        <ThemedText type="small" style={{ marginBottom: Spacing.sm }}>
          {selectedClients.length} clientas seleccionadas
        </ThemedText>
        <Button onPress={onNext} disabled={!canContinue}>
          Continuar
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  textButton: {
    paddingVertical: Spacing.xs,
  },
  loading: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
