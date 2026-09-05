import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius, Shadows } from '@/constants/theme'
import { formatCurrency } from '@/utils/format'
import { EXPENSE_CATEGORIES, type OperationalExpense } from '../../types'
import { toNumber } from '../../services/expenses'

interface Props {
  expenses: OperationalExpense[]
  onEdit: (row: OperationalExpense) => void
}

function categoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

export function ExpenseList({ expenses, onEdit }: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const formatValue = (n: number) => formatCurrency(n, config)

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Gastos del mes</ThemedText>
        <ThemedText style={[styles.count, { color: theme.primary }]}>
          {expenses.length}
        </ThemedText>
      </View>

      {expenses.length === 0 ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={{ color: theme.textMuted }}>
            Sin gastos este mes. Toca + para registrar uno.
          </ThemedText>
        </View>
      ) : (
        expenses.map((row) => {
          const pending = row.amount == null
          return (
            <Pressable
              key={row.id}
              onPress={() => onEdit(row)}
              style={[
                styles.row,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
              ]}
            >
              <View style={styles.rowText}>
                <ThemedText style={styles.label}>{row.label}</ThemedText>
                <ThemedText style={[styles.meta, { color: theme.textMuted }]}>
                  {categoryLabel(row.category)}
                </ThemedText>
              </View>
              {pending ? (
                <View
                  style={[styles.badge, { backgroundColor: theme.accentLight }]}
                >
                  <ThemedText
                    style={[styles.badgeText, { color: theme.accent }]}
                  >
                    Pendiente
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.amount}>
                  {formatValue(toNumber(row.amount))}
                </ThemedText>
              )}
              <Feather name="chevron-right" size={16} color={theme.textMuted} />
            </Pressable>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: { fontSize: 16, fontWeight: '700' },
  count: { fontSize: 14, fontWeight: '700' },
  empty: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  rowText: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700' },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
})
