import React from 'react'
import { StyleSheet, Pressable } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'
import type { ClientSortKey } from '../types'

interface Props {
  sortBy: ClientSortKey
  onSortChange: (sort: ClientSortKey) => void
}

const SORTS: { id: ClientSortKey; label: string }[] = [
  { id: 'last_visit', label: 'Última visita' },
  { id: 'spent', label: 'Gasto' },
  { id: 'name', label: 'Nombre' },
]

export function ClientSortBar({ sortBy, onSortChange }: Props) {
  const { theme } = useTheme()

  return (
    <ScrollFadeRow
      backgroundColor={theme.backgroundRoot}
      arrowColor={theme.textSecondary}
      style={styles.container}
      contentContainerStyle={styles.row}
    >
      <ThemedText style={[styles.label, { color: theme.textMuted }]}>Orden</ThemedText>
      {SORTS.map((s) => {
        const active = sortBy === s.id
        return (
          <Pressable
            key={s.id}
            style={[
              styles.chip,
              {
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? theme.primary : theme.backgroundSecondary,
              },
            ]}
            onPress={() => onSortChange(s.id)}
          >
            <ThemedText
              style={[styles.chipText, { color: active ? Colors.light.buttonText : theme.text }]}
            >
              {s.label}
            </ThemedText>
          </Pressable>
        )
      })}
    </ScrollFadeRow>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontSize: 12, fontWeight: '600', marginRight: 4 },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
})
