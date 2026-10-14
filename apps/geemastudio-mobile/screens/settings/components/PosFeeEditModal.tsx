import React, { useState } from 'react'
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { SheetModal } from '@/components/SheetModal'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'

interface PosFeeEditModalProps {
  visible: boolean
  percent: number
  onSave: (percent: number) => Promise<void>
  onClose: () => void
}

export function PosFeeEditModal({ visible, percent, onSave, onClose }: PosFeeEditModalProps) {
  const { theme } = useTheme()
  const [value, setValue] = useState(String(percent))
  const [prevVisible, setPrevVisible] = useState(visible)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) {
      setValue(String(percent))
      setError(null)
      setSaving(false)
    }
  }

  const parsed = parseFloat(value.replace(',', '.'))
  const canSave = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSave(Math.round(parsed * 100) / 100)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el recargo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SheetModal visible={visible} onClose={onClose} title="Recargo POS (tarjeta)">
      <View style={styles.body}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Porcentaje que el POS suma al cobro con tarjeta. Es comisión del POS: se muestra al cobrar
          pero no cuenta como ingreso.
        </ThemedText>
        <TextInput
          value={value}
          onChangeText={setValue}
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundDefault,
            },
          ]}
          placeholder="5"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          editable={!saving}
        />
        {error ? (
          <ThemedText style={[styles.error, { color: theme.error }]}>{error}</ThemedText>
        ) : null}

        <Pressable
          onPress={() => void handleSave()}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.primary,
              opacity: !canSave ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={Colors.light.buttonText} />
          ) : (
            <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
          )}
        </Pressable>
      </View>
    </SheetModal>
  )
}

const styles = StyleSheet.create({
  body: { padding: Spacing.lg },
  label: { fontSize: 13, fontWeight: '500', marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  saveButton: {
    marginTop: Spacing['2xl'],
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonText: { color: Colors.light.buttonText, fontSize: 16, fontWeight: '600' },
  error: { fontSize: 13, marginTop: Spacing.sm },
})
