import React from 'react'
import { View, StyleSheet, TextInput, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

interface Props {
  searchQuery: string
  onSearchChange: (value: string) => void
  totalCount: number
  onAddClientPress?: () => void
}

export function ClientsHeader({
  searchQuery,
  onSearchChange,
  totalCount,
  onAddClientPress,
}: Props) {
  const { theme } = useTheme()

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather
          name="search"
          size={16}
          color={theme.textMuted}
          style={{ marginRight: Spacing.sm }}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar cliente por nombre, teléfono o correo"
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      <View style={styles.metaRow}>
        <ThemedText style={[styles.countText, { color: theme.textMuted }]}>
          {totalCount} {totalCount === 1 ? 'cliente' : 'clientes'}
        </ThemedText>
        {onAddClientPress && (
          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor: theme.primary,
              },
            ]}
            onPress={onAddClientPress}
          >
            <Feather name="user-plus" size={16} color="#FFFFFF" />
            <ThemedText style={styles.addButtonText}>Agregar</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  countText: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
})
