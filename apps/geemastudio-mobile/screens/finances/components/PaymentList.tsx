import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'

import { PAYMENT_METHODS } from '../constants'
import { financesStyles as styles } from '../financesStyles'
import type { FinancesPayment, FinancesPaymentType } from '../types'

interface Props {
  payments: FinancesPayment[]
  serviceNameById: Record<string, string>
  pendienteByAppointmentId: Record<string, number>
  appointmentNameById: Record<
    string,
    { client_name: string; service_id: string | null }
  >
  isAdmin: boolean
  isStaffOnly: boolean
  isTablet: boolean
  onEditPayment: (payment: FinancesPayment) => void
  onDeletePayment: (payment: FinancesPayment) => void
  onOpenNewPayment: (aptId?: string, type?: FinancesPaymentType) => void
}

function formatMethod(method: string): string {
  return PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method
}

export function PaymentList({
  payments,
  serviceNameById,
  pendienteByAppointmentId,
  appointmentNameById,
  isAdmin,
  isStaffOnly,
  isTablet,
  onEditPayment,
  onDeletePayment,
  onOpenNewPayment,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const currencySymbol = config.locale.currency.symbol

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(config.locale.language, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          {isStaffOnly ? 'Mis pagos' : 'Historial de Pagos'}
        </ThemedText>
        <ThemedText style={[styles.paymentCount, { color: theme.primary }]}>
          {payments.length}
        </ThemedText>
      </View>

      {payments.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="credit-card" size={28} color={theme.textMuted} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            Sin pagos registrados
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            {isStaffOnly
              ? 'No hay pagos de tus citas en este período'
              : 'Registra un pago o un abono (20%)'}
          </ThemedText>
        </View>
      ) : (
        <View style={isTablet ? styles.paymentsGridTablet : undefined}>
          {payments.map((payment) => {
            const linkedAppointment =
              payment.appointment_id != null
                ? appointmentNameById[payment.appointment_id]
                : undefined
            const serviceName =
              linkedAppointment?.service_id != null
                ? (serviceNameById[linkedAppointment.service_id] ?? null)
                : null
            const pendiente =
              payment.appointment_id != null
                ? pendienteByAppointmentId[payment.appointment_id]
                : undefined

            return (
              <Pressable
                key={payment.id}
                style={({ pressed }) => [
                  styles.paymentCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                    opacity: pressed ? 0.9 : 1,
                    ...(isTablet && { width: '48.5%' as `${number}%` }),
                  },
                ]}
                onPress={() => isAdmin && onEditPayment(payment)}
                onLongPress={() => isAdmin && onDeletePayment(payment)}
              >
                <View style={styles.paymentInfo}>
                  <View style={styles.paymentHeader}>
                    <View
                      style={[styles.methodBadge, { backgroundColor: theme.primary + '15' }]}
                    >
                      <Feather
                        name={
                          PAYMENT_METHODS.find((m) => m.id === payment.method)?.icon ??
                          'dollar-sign'
                        }
                        size={14}
                        color={theme.primary}
                      />
                    </View>
                    <ThemedText style={styles.paymentMethod}>
                      {formatMethod(payment.method)}
                    </ThemedText>
                    {payment.is_abono && (
                      <View style={[styles.abonoBadge, { backgroundColor: theme.gold + '20' }]}>
                        <ThemedText style={[styles.abonoBadgeText, { color: theme.gold }]}>
                          Abono 20%
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[styles.paymentDate, { color: theme.textMuted }]}>
                    {formatDate(payment.date)}
                  </ThemedText>
                  {linkedAppointment && (
                    <ThemedText
                      style={[styles.paymentLinkedAppointment, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {linkedAppointment.client_name}
                      {serviceName ? ` · ${serviceName}` : ''}
                    </ThemedText>
                  )}
                  {payment.notes ? (
                    <ThemedText
                      style={[styles.paymentNotes, { color: theme.textMuted }]}
                      numberOfLines={1}
                    >
                      {payment.notes}
                    </ThemedText>
                  ) : null}
                  {payment.is_abono && payment.service_total ? (
                    <ThemedText style={[styles.paymentNotes, { color: theme.textMuted }]}>
                      Servicio total {currencySymbol}
                      {parseFloat(payment.service_total).toFixed(0)}
                    </ThemedText>
                  ) : null}
                  {pendiente != null && pendiente > 0.01 && (
                    <View style={styles.pendienteRow}>
                      <ThemedText
                        style={[
                          styles.paymentNotes,
                          { color: theme.primary, fontWeight: '600' },
                        ]}
                      >
                        Pendiente {formatCurrency(pendiente, config)}
                      </ThemedText>
                      {isAdmin && (
                        <Pressable
                          style={[
                            styles.completarBtn,
                            {
                              backgroundColor: theme.primary + '18',
                              borderColor: theme.primary,
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            onOpenNewPayment(payment.appointment_id ?? undefined, 'completar')
                          }}
                        >
                          <Feather name="plus-circle" size={11} color={theme.primary} />
                          <ThemedText
                            style={[styles.completarBtnText, { color: theme.primary }]}
                          >
                            Cobrar restante
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
                <ThemedText style={[styles.paymentAmount, { color: theme.gold }]}>
                  {formatCurrency(parseFloat(payment.amount), config)}
                </ThemedText>
              </Pressable>
            )
          })}
        </View>
      )}
    </>
  )
}
