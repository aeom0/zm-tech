import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

/** Se guarda el nombre Lucide (lo que renderiza la web); el glifo Feather es solo la vista previa aquí. */
const ICONS: { name: string; glyph: keyof typeof Feather.glyphMap }[] = [
  { name: 'Sparkles', glyph: 'star' },
  { name: 'Scissors', glyph: 'scissors' },
  { name: 'Brush', glyph: 'edit-2' },
  { name: 'Eye', glyph: 'eye' },
  { name: 'Hand', glyph: 'thumbs-up' },
  { name: 'Gem', glyph: 'hexagon' },
  { name: 'Crown', glyph: 'award' },
  { name: 'Heart', glyph: 'heart' },
  { name: 'Smile', glyph: 'smile' },
  { name: 'Droplets', glyph: 'droplet' },
  { name: 'Sun', glyph: 'sun' },
  { name: 'Moon', glyph: 'moon' },
  { name: 'Leaf', glyph: 'feather' },
  { name: 'Flame', glyph: 'zap' },
  { name: 'Gift', glyph: 'gift' },
  { name: 'Camera', glyph: 'camera' },
  { name: 'Coffee', glyph: 'coffee' },
  { name: 'ShieldCheck', glyph: 'shield' },
  { name: 'Clock', glyph: 'clock' },
  { name: 'Wind', glyph: 'wind' },
]

interface WebIconPickerProps {
  label: string
  value: string
  onChange: (name: string) => void
}

export function WebIconPicker({ label, value, onChange }: WebIconPickerProps) {
  const { theme } = useTheme()
  const current = value.trim() || 'Sparkles'
  const known = ICONS.some((i) => i.name === current)

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {label}: {current}
      </ThemedText>
      <View style={styles.grid}>
        {!known ? (
          <View style={[styles.cell, { borderColor: theme.primary }]}>
            <Feather name="help-circle" size={20} color={theme.primary} />
          </View>
        ) : null}
        {ICONS.map((i) => {
          const active = i.name === current
          return (
            <Pressable
              key={i.name}
              onPress={() => onChange(i.name)}
              accessibilityLabel={i.name}
              style={[
                styles.cell,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}22` : theme.backgroundDefault,
                },
              ]}
            >
              <Feather name={i.glyph} size={20} color={active ? theme.primary : theme.text} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.xs },
  label: { fontSize: 12, marginBottom: Spacing.xs, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  cell: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
