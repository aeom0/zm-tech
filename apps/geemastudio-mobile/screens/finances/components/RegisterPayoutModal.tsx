import React, { useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius } from '@/constants/theme'
import { filterPriceInput, normalizeDecimalInput, formatCurrency } from '@/utils/format'
import type { FinancesDesgloseRow } from '../types'

interface Props {
  visible: boolean
  row: FinancesDesgloseRow | null
  periodStart: string
  periodEnd: string
  isPending: boolean
  isTablet: boolean
  onClose: () => void
  onSubmit: (data: { amount: number; method: string | null; notes: string | null }) => void
}

export function RegisterPayoutModal({
  visible,
  row,
  periodStart,
  periodEnd,
  isPending,
  isTablet,
  onClose,
  onSubmit,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const currencySymbol = config.locale.currency.symbol
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!visible || !row) return
    const pendiente = row.comisionPendienteReal ?? 0
    setAmount(pendiente > 0 ? String(pendiente.toFixed(2)).replace('.', ',') : '')
    setMethod('')
    setNotes('')
  }, [visible, row])

  if (!row) return null

  const parsedAmount = Number.parseFloat(normalizeDecimalInput(amount))
  const canSave = Number.isFinite(parsedAmount) && parsedAmount > 0

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, isTablet ? styles.overlayTablet : undefined]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.content,
            isTablet ? styles.contentTablet : undefined,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>Marcar pago — {row.name}</ThemedText>
            <Pressable
              onPress={onClose}
              style={[styles.close, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ThemedText style={[styles.periodNote, { color: theme.textMuted }]}>
              Período {periodStart} a {periodEnd}. Comisión pendiente:{' '}
              {formatCurrency(row.comisionPendienteReal ?? 0, config)}. Si registras un pago de
              un rango más amplio (ej. el mes completo), aparecerá reflejado también al filtrar
              por rangos más chicos dentro de ese mes.
            </ThemedText>

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Monto pagado ({currencySymbol})
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="0,00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(t) => setAmount(filterPriceInput(t))}
            />

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Método (opcional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Efectivo, transferencia..."
              placeholderTextColor={theme.textMuted}
              value={method}
              onChangeText={setMethod}
            />

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Notas (opcional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Notas"
              placeholderTextColor={theme.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <Pressable
              disabled={!canSave || isPending}
              onPress={() =>
                onSubmit({
                  amount: parsedAmount,
                  method: method.trim() || null,
                  notes: notes.trim() || null,
                })
              }
              style={[
                styles.save,
                { backgroundColor: theme.primary, opacity: !canSave || isPending ? 0.6 : 1 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                <ThemedText style={{ color: theme.buttonText, fontWeight: '700' }}>
                  Registrar pago
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayTablet: { justifyContent: 'center', alignItems: 'center' },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  contentTablet: { borderRadius: BorderRadius.xl, width: 520, maxHeight: '80%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1, marginRight: Spacing.sm },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  periodNote: { fontSize: 12, marginBottom: Spacing.md, lineHeight: 17 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.md },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  save: {
    marginTop: Spacing.xl,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
