import React from 'react'
import { Platform, StyleSheet, TextInput, View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { BorderRadius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/useTheme'

interface FormFieldProps extends React.ComponentProps<typeof TextInput> {
  label: string
  /** Error de validación: marca el campo en rojo y muestra el mensaje debajo. */
  error?: string
  /** Sugerencia informativa (ej. tipo de documento detectado); se oculta si hay error. */
  hint?: string
}

/** Mensaje bajo un campo: el error (rojo) tiene prioridad sobre la sugerencia (gris). */
export function FieldNote({ error, hint }: { error?: string; hint?: string }) {
  const { theme } = useTheme()
  if (error) {
    return <ThemedText style={[styles.note, { color: theme.error }]}>{error}</ThemedText>
  }
  if (hint) {
    return <ThemedText style={[styles.note, { color: theme.textMuted }]}>{hint}</ThemedText>
  }
  return null
}

/** Campo de texto con etiqueta, borde de error y nota de ayuda; el tema sale de useTheme. */
export function FormField({ label, error, hint, style, ...inputProps }: FormFieldProps) {
  const { theme } = useTheme()
  return (
    <View>
      <ThemedText style={[styles.label, { color: theme.textMuted }]}>{label}</ThemedText>
      <TextInput
        {...inputProps}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundSecondary,
            borderColor: error ? theme.error : theme.border,
          },
          style,
        ]}
        placeholderTextColor={theme.textMuted}
      />
      <FieldNote error={error} hint={hint} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
  },
  note: { fontSize: 12, marginTop: 4 },
})
