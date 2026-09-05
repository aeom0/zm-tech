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
import { filterPriceInput, normalizeDecimalInput } from '@/utils/format'
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type OperationalExpense,
} from '../../types'

interface Props {
  visible: boolean
  expenseMonth: string
  editing: OperationalExpense | null
  isPending: boolean
  isTablet: boolean
  onClose: () => void
  onSubmit: (data: {
    category: ExpenseCategory
    label: string
    amount: number | null
    expense_month: string
  }) => void
  onDelete?: (id: string) => void
}

export function ExpenseModal({
  visible,
  expenseMonth,
  editing,
  isPending,
  isTablet,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const currencySymbol = config.locale.currency.symbol
  const [category, setCategory] = useState<ExpenseCategory>('otros')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (!visible) return
    if (editing) {
      setCategory(editing.category)
      setLabel(editing.label)
      setAmount(editing.amount ? String(editing.amount).replace('.', ',') : '')
    } else {
      setCategory('otros')
      setLabel('')
      setAmount('')
    }
  }, [visible, editing])

  const canSave = label.trim().length > 0

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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
            <ThemedText style={styles.title}>
              {editing ? 'Editar gasto' : 'Nuevo gasto'}
            </ThemedText>
            <Pressable
              onPress={onClose}
              style={[
                styles.close,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText
              style={[styles.inputLabel, { color: theme.textSecondary }]}
            >
              Categoría
            </ThemedText>
            <View style={styles.chips}>
              {EXPENSE_CATEGORIES.map((c) => {
                const selected = category === c.id
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected
                          ? theme.primary
                          : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: selected ? theme.buttonText : theme.text,
                      }}
                    >
                      {c.label}
                    </ThemedText>
                  </Pressable>
                )
              })}
            </View>

            <ThemedText
              style={[styles.inputLabel, { color: theme.textSecondary }]}
            >
              Concepto
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Ej. Alquiler local"
              placeholderTextColor={theme.textMuted}
              value={label}
              onChangeText={setLabel}
            />

            <ThemedText
              style={[styles.inputLabel, { color: theme.textSecondary }]}
            >
              Monto ({currencySymbol}) — vacío = pendiente
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="0,00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(t) => setAmount(filterPriceInput(t))}
            />

            <Pressable
              disabled={!canSave || isPending}
              onPress={() => {
                const normalized = normalizeDecimalInput(amount)
                const n = Number.parseFloat(normalized)
                onSubmit({
                  category,
                  label: label.trim(),
                  amount: Number.isFinite(n) && n > 0 ? n : null,
                  expense_month: expenseMonth,
                })
              }}
              style={[
                styles.save,
                {
                  backgroundColor: theme.primary,
                  opacity: !canSave || isPending ? 0.6 : 1,
                },
              ]}
            >
              {isPending ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                <ThemedText
                  style={{ color: theme.buttonText, fontWeight: '700' }}
                >
                  Guardar
                </ThemedText>
              )}
            </Pressable>

            {editing && onDelete ? (
              <Pressable
                onPress={() => onDelete(editing.id)}
                style={styles.delete}
              >
                <ThemedText style={{ color: theme.error, fontWeight: '600' }}>
                  Eliminar
                </ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayTablet: { justifyContent: 'center', alignItems: 'center' },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  contentTablet: {
    borderRadius: BorderRadius.xl,
    width: 520,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '700' },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  save: {
    marginTop: Spacing.xl,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
})
