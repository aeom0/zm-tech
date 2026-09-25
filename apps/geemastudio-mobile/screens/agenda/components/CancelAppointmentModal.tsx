import React, { useState } from 'react'
import { View, Modal, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { BorderRadius, Colors, Spacing } from '@/constants/theme'
import { APPOINTMENT_CANCEL_REASONS } from '@geemastudio/shared-schema'

interface CancelAppointmentModalProps {
  visible: boolean
  clientName: string
  pending: boolean
  onClose: () => void
  onConfirm: (reason: string, note: string) => void
}

export function CancelAppointmentModal({
  visible,
  clientName,
  pending,
  onClose,
  onConfirm,
}: CancelAppointmentModalProps) {
  const { theme } = useTheme()
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useResetOnChange([visible], () => {
    setReason(null)
    setNote('')
  })

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Cancelar cita</ThemedText>
            <Pressable onPress={onClose} disabled={pending}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
            La cita de {clientName} quedará como cancelada y se liberará el horario.
          </ThemedText>

          <ThemedText style={styles.label}>Motivo</ThemedText>
          <View style={styles.chips}>
            {APPOINTMENT_CANCEL_REASONS.map((r) => {
              const selected = reason === r.value
              return (
                <Pressable
                  key={r.value}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setReason(r.value)
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.primary + '22' : theme.backgroundSecondary,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selected ? theme.primary : theme.text, fontSize: 14 }}>
                    {r.label}
                  </ThemedText>
                </Pressable>
              )
            })}
          </View>

          <ThemedText style={styles.label}>Observación (opcional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Agrega un detalle si lo necesitas"
            placeholderTextColor={theme.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
          />

          <Pressable
            style={[styles.confirm, { backgroundColor: theme.error, opacity: reason ? 1 : 0.5 }]}
            onPress={() => reason && onConfirm(reason, note)}
            disabled={!reason || pending}
          >
            {pending ? (
              <ActivityIndicator color={Colors.light.buttonText} />
            ) : (
              <ThemedText style={styles.confirmText}>Confirmar cancelación</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.light.overlay, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '600' },
  hint: { fontSize: 13, marginBottom: Spacing.lg },
  label: { fontSize: 13, fontWeight: '600', marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  input: {
    minHeight: 80,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
  confirm: {
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: Colors.light.buttonText, fontWeight: '600' },
})
