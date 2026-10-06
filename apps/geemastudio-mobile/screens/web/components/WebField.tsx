import React, { useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

interface WebFieldProps {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  multiline?: boolean
  /** Texto largo de una sola línea lógica (URLs, marquesina): se muestra completo en varias líneas, sin saltos manuales. */
  wrap?: boolean
  keyboardType?: 'default' | 'url' | 'phone-pad' | 'numeric' | 'number-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words'
  onBlur?: () => void
}

export function WebField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  wrap,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onBlur,
}: WebFieldProps) {
  const { theme } = useTheme()
  const [height, setHeight] = useState<number | undefined>()
  const grow = multiline || wrap

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={wrap ? (v) => onChangeText(v.replace(/\n/g, '')) : onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        multiline={grow}
        scrollEnabled={false}
        onContentSizeChange={
          grow ? (e) => setHeight(Math.ceil(e.nativeEvent.contentSize.height)) : undefined
        }
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          multiline && styles.multiline,
          grow && height !== undefined && { height: Math.max(height + Spacing.sm * 2 + 4, multiline ? 96 : 0) },
          {
            color: theme.text,
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: { fontSize: 12, marginBottom: Spacing.xs, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
})
