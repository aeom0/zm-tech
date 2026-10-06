import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'
import { WebField } from '@/screens/web/components/WebField'

const SUGGESTED = [
  '#E11D48',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#D946EF',
  '#EC4899',
  '#78716C',
]

interface WebColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
}

/** Colores sugeridos + hex opcional. Vacío = color de la marca. */
export function WebColorPicker({ label, value, onChange }: WebColorPickerProps) {
  const { theme } = useTheme()
  const current = value.trim().toLowerCase()

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange('')}
          style={[
            styles.defaultChip,
            { borderColor: !current ? theme.primary : theme.border },
          ]}
        >
          <ThemedText style={{ fontSize: 12, color: !current ? theme.primary : theme.textMuted }}>
            Por defecto
          </ThemedText>
        </Pressable>
        {SUGGESTED.map((hex) => {
          const active = current === hex.toLowerCase()
          return (
            <Pressable
              key={hex}
              onPress={() => onChange(hex)}
              accessibilityLabel={`Color ${hex}`}
              style={[
                styles.swatch,
                { backgroundColor: hex, borderColor: active ? theme.text : 'transparent' },
              ]}
            >
              {active ? <Feather name="check" size={16} color="#fff" /> : null}
            </Pressable>
          )
        })}
      </View>
      <WebField
        label="Hex personalizado"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        placeholder="#RRGGBB"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.xs },
  label: { fontSize: 12, marginBottom: Spacing.xs, fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultChip: {
    height: 34,
    paddingHorizontal: Spacing.md,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
  },
})
