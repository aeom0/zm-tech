import React, { useState } from 'react'
import { Modal, View, StyleSheet, Pressable, SafeAreaView, TextInput } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

interface TerminologyEditModalProps {
  visible: boolean
  staff: string
  staffSingular: string
  onSave: (staff: string, staffSingular: string) => void
  onClose: () => void
}

export function TerminologyEditModal({
  visible,
  staff,
  staffSingular,
  onSave,
  onClose,
}: TerminologyEditModalProps) {
  const { theme } = useTheme()
  const [staffValue, setStaffValue] = useState(staff)
  const [staffSingularValue, setStaffSingularValue] = useState(staffSingular)
  const [prevVisible, setPrevVisible] = useState(visible)

  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) {
      setStaffValue(staff)
      setStaffSingularValue(staffSingular)
    }
  }

  const canSave = staffValue.trim().length > 0 && staffSingularValue.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave(staffValue.trim(), staffSingularValue.trim())
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
            Cómo llamamos a tu personal
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
            Plural (ej. &lsquo;chicas&rsquo;, &lsquo;barberos&rsquo;, &lsquo;especialistas&rsquo;)
          </ThemedText>
          <TextInput
            value={staffValue}
            onChangeText={setStaffValue}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundDefault,
              },
            ]}
            placeholder="Profesionales"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />

          <ThemedText style={[styles.label, { color: theme.textSecondary, marginTop: Spacing.lg }]}>
            Singular (ej. &lsquo;chica&rsquo;, &lsquo;barbero&rsquo;, &lsquo;especialista&rsquo;)
          </ThemedText>
          <TextInput
            value={staffSingularValue}
            onChangeText={setStaffSingularValue}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundDefault,
              },
            ]}
            placeholder="profesional"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
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
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
})
