import React from 'react'
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { Spacing, BorderRadius } from '@/constants/theme'
import { instanteCitaDesdeTexto, zonaIANASegura } from '@zmtech/tenant-config'
import type { ValidacionItem } from '../types'

interface ValidacionRowProps {
  item: ValidacionItem
  onToggleForfeit?: () => void
  forfeitBusy?: boolean
}

export function ValidacionRow({
  item,
  onToggleForfeit,
  forfeitBusy = false,
}: ValidacionRowProps) {
  const { theme } = useTheme()
  const { config } = useTenant()

  const fecha = instanteCitaDesdeTexto(item.date, config.locale.timezone).toLocaleString(
    config.locale.language,
    {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
      hour12: config.locale.timeFormat === '12',
      timeZone: zonaIANASegura(config.locale.timezone),
    }
  )

  const resolvedLabel = item.resolvedAt
    ? new Date(item.resolvedAt.endsWith('Z') || item.resolvedAt.includes('+') ? item.resolvedAt : `${item.resolvedAt}Z`).toLocaleDateString(
        config.locale.language,
        { day: 'numeric', month: 'short', timeZone: zonaIANASegura(config.locale.timezone) }
      )
    : ''

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Franja de color del empleado */}
      {item.employeeColor && (
        <View style={[styles.colorBar, { backgroundColor: item.employeeColor }]} />
      )}

      <View style={styles.body}>
        {/* Info principal */}
        <View style={styles.infoRow}>
          <ThemedText style={[styles.clientName, { color: theme.text }]}>
            {item.client_name}
          </ThemedText>
          <ThemedText style={[styles.price, { color: theme.primary }]}>
            {formatCurrency(item.price, config)}
          </ThemedText>
        </View>

        <ThemedText style={[styles.meta, { color: theme.textSecondary }]}>
          {item.employeeName ? `${item.serviceName} · ${item.employeeName}` : item.serviceName}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: theme.textMuted }]}>{fecha}</ThemedText>

        {item.readOnly && item.status !== 'pending' && (
          <View style={styles.resolvedRow}>
            <Feather
              name={item.status === 'approved' ? 'check-circle' : 'x-circle'}
              size={14}
              color={item.status === 'approved' ? theme.success : theme.error}
            />
            <ThemedText
              style={[
                styles.meta,
                { color: item.status === 'approved' ? theme.success : theme.error },
              ]}
            >
              {item.status === 'approved' ? 'Validado' : 'Rechazado'}
              {resolvedLabel ? ` · ${resolvedLabel}` : ''}
            </ThemedText>
          </View>
        )}
        {item.readOnly && item.status === 'pending' && (
          <ThemedText style={[styles.meta, { color: theme.textMuted }]}>
            Pendiente de validación
          </ThemedText>
        )}

        {item.depositForfeited && (
          <View style={styles.resolvedRow}>
            <Feather name="alert-triangle" size={14} color={theme.error} />
            <ThemedText style={[styles.meta, { color: theme.error, fontWeight: '600' }]}>
              Adelanto perdido
            </ThemedText>
          </View>
        )}
        {item.canMarkForfeit && onToggleForfeit && (
          <Pressable
            style={styles.forfeitLink}
            hitSlop={8}
            disabled={forfeitBusy}
            onPress={onToggleForfeit}
          >
            {forfeitBusy ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <>
                <Feather
                  name="alert-triangle"
                  size={12}
                  color={item.depositForfeited ? theme.textMuted : theme.error}
                />
                <ThemedText
                  style={[
                    styles.forfeitLinkText,
                    { color: item.depositForfeited ? theme.textMuted : theme.error },
                  ]}
                >
                  {item.depositForfeited ? 'Quitar marca' : 'Marcar adelanto perdido'}
                </ThemedText>
              </>
            )}
          </Pressable>
        )}

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
  },
  forfeitLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  forfeitLinkText: { fontSize: 12, fontWeight: '600' },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
