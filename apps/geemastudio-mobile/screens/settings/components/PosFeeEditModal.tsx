import React, { useState } from 'react'
import { Modal, View, StyleSheet, Pressable, SafeAreaView, TextInput } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'

interface PosFeeEditModalProps {
  visible: boolean
  percent: number
  onSave: (percent: number) => void
  onClose: () => void
}

export function PosFeeEditModal({ visible, percent, onSave, onClose }: PosFeeEditModalProps) {
  const { theme } = useTheme()
  const [value, setValue] = useState(String(percent))
  const [prevVisible, setPrevVisible] = useState(visible)

  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) setValue(String(percent))
  }

  const parsed = parseFloat(value.replace(',', '.'))
  const canSave = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100

  const handleSave = () => {
    if (!canSave) return
    onSave(Math.round(parsed * 100) / 100)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText style={[styles.titulo, { color: theme.text }]}>
            Recargo POS (tarjeta)
          </ThemedText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="x" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Porcentaje que el POS suma al cobro con tarjeta. Es comisión del POS: se muestra al
            cobrar pero no cuenta como ingreso.
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
          />

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: theme.primary,
                opacity: !canSave ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titulo: { fontSize: 17, fontWeight: '600' },
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
})
