import React from 'react'
import {
  View,
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
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { Spacing } from '@/constants/theme'
import { posChargeAmount, resolvePosFeePercent } from '@/lib/pos-fee'
import { instanteCitaDesdeTexto, zonaIANASegura } from '@zmtech/tenant-config'

import { convertirBsAUsd, convertirUsdABs, formatearBs } from '@zmtech/tasas'

import { paymentMethodsForCountry } from '../constants'
import type { PaymentFormData } from '../hooks/usePaymentForm'
import { financesStyles as styles } from '../financesStyles'
import type { FinancesAppointmentOption, FinancesPayment, FinancesPaymentType } from '../types'

/** Solo se usa `getParent()` para saltar a Agenda; sirve desde cualquier pantalla del stack Más. */
type NavigationProp = { getParent: () => unknown }

interface Props {
  visible: boolean
  editingPayment: FinancesPayment | null
  paymentType: FinancesPaymentType
  formData: PaymentFormData
  setFormData: React.Dispatch<React.SetStateAction<PaymentFormData>>
  selectedAppointmentId: string | null
  abonoAmount: string | null
  currencySymbol: string
  /** Tenant VE: permite registrar el pago en Bs con la tasa vigente. */
  vesEnabled: boolean
  vesRate: number | null
  onChangeCurrency: (currency: 'USD' | 'VES') => void
  recentAppointments: FinancesAppointmentOption[]
  abonoPrevioByApt: Record<string, { amount: number; service_total: number }>
  isPending: boolean
  isTablet: boolean
  navigation: NavigationProp
  onClose: () => void
  onChangePaymentType: (type: FinancesPaymentType) => void
  onSelectAppointment: (aptId: string | null) => void
  onSubmit: () => void
  onDelete: (payment: FinancesPayment) => void
}

export function PaymentModal({
  visible,
  editingPayment,
  paymentType,
  formData,
  setFormData,
  selectedAppointmentId,
  abonoAmount,
  currencySymbol,
  vesEnabled,
  vesRate,
  onChangeCurrency,
  recentAppointments,
  abonoPrevioByApt,
  isPending,
  isTablet,
  navigation,
  onClose,
  onChangePaymentType,
  onSelectAppointment,
  onSubmit,
  onDelete,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()

  const enBs = vesEnabled && formData.currency === 'VES'
  const montoNum = parseFloat(formData.amount.replace(',', '.'))
  const montoValido = Number.isFinite(montoNum) && montoNum > 0
  const abonoNum = abonoAmount != null ? parseFloat(abonoAmount) : null
  // Equivalente en la otra moneda para que el cajero verifique antes de registrar.
  const equivalente = (() => {
    if (!vesEnabled || !vesRate) return null
    if (paymentType === 'abono') {
      if (abonoNum == null || !Number.isFinite(abonoNum)) return null
      return enBs
        ? `Cobrar ${formatearBs(convertirUsdABs(abonoNum, vesRate))}`
        : `≈ ${formatearBs(convertirUsdABs(abonoNum, vesRate))}`
    }
    if (!montoValido) return null
    return enBs
      ? `≈ ${currencySymbol}${convertirBsAUsd(montoNum, vesRate).toFixed(2)}`
      : `≈ ${formatearBs(convertirUsdABs(montoNum, vesRate))}`
  })()

  const formatShortDate = (dateString: string) => {
    const date = instanteCitaDesdeTexto(dateString, config.locale.timezone)
    if (Number.isNaN(date.getTime())) return 'Fecha inválida'
    return date.toLocaleDateString(config.locale.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: config.locale.timeFormat === '12',
      timeZone: zonaIANASegura(config.locale.timezone),
    })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.backgroundDefault },
            isTablet && styles.modalContentTablet,
          ]}
        >
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              {editingPayment ? 'Editar pago' : 'Nuevo pago'}
            </ThemedText>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            {!editingPayment && (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Tipo de pago
                </ThemedText>
                <View style={styles.paymentTypeRow}>
                  {(
                    [
                      {
                        id: 'full' as FinancesPaymentType,
                        label: 'Pago completo',
                        icon: 'check-circle' as const,
                      },
                      {
                        id: 'abono' as FinancesPaymentType,
                        label: 'Adelanto 20%',
                        icon: 'smartphone' as const,
                      },
                      {
                        id: 'completar' as FinancesPaymentType,
                        label: 'Completar 80%',
                        icon: 'refresh-cw' as const,
                      },
                      {
                        id: 'producto' as FinancesPaymentType,
                        label: 'Producto',
                        icon: 'shopping-bag' as const,
                      },
                    ] as const
                  ).map((t) => (
                    <Pressable
                      key={t.id}
                      style={[
                        styles.paymentTypeChip,
                        {
                          borderColor: paymentType === t.id ? theme.primary : theme.border,
                          backgroundColor:
                            paymentType === t.id ? theme.primary + '15' : theme.backgroundSecondary,
                        },
                      ]}
                      onPress={() => onChangePaymentType(t.id)}
                    >
                      <Feather
                        name={t.icon}
                        size={14}
                        color={paymentType === t.id ? theme.primary : theme.textMuted}
                      />
                      <ThemedText
                        style={[
                          styles.paymentTypeChipText,
                          {
                            color: paymentType === t.id ? theme.primary : theme.text,
                          },
                        ]}
                      >
                        {t.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {vesEnabled && (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Moneda del pago
                </ThemedText>
                <View style={styles.paymentTypeRow}>
                  {(
                    [
                      { id: 'USD' as const, label: `Dólares (${currencySymbol})` },
                      { id: 'VES' as const, label: 'Bolívares (Bs.)' },
                    ] as const
                  ).map((c) => (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.paymentTypeChip,
                        {
                          borderColor: formData.currency === c.id ? theme.primary : theme.border,
                          backgroundColor:
                            formData.currency === c.id
                              ? theme.primary + '15'
                              : theme.backgroundSecondary,
                        },
                      ]}
                      onPress={() => onChangeCurrency(c.id)}
                    >
                      <ThemedText
                        style={[
                          styles.paymentTypeChipText,
                          { color: formData.currency === c.id ? theme.primary : theme.text },
                        ]}
                      >
                        {c.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
                <ThemedText style={[styles.noAppointmentsText, { color: theme.textMuted }]}>
                  {vesRate
                    ? `Tasa: ${vesRate.toFixed(2)} Bs por ${currencySymbol}`
                    : 'Sin tasa de cambio disponible. Configúrala en Ajustes.'}
                </ThemedText>
              </>
            )}

            {paymentType === 'abono' ? (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {`Valor total del servicio (${currencySymbol})`}
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
                  placeholder="Ej. 130"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  value={formData.serviceTotal}
                  onChangeText={(text) => setFormData((p) => ({ ...p, serviceTotal: text }))}
                />
                {abonoAmount != null && (
                  <View
                    style={[styles.abonoResult, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <ThemedText style={[styles.abonoResultLabel, { color: theme.textMuted }]}>
                      {`20% = ${currencySymbol}`}
                    </ThemedText>
                    <ThemedText style={[styles.abonoResultAmount, { color: theme.gold }]}>
                      {abonoAmount}
                    </ThemedText>
                  </View>
                )}
                {equivalente && (
                  <ThemedText style={[styles.noAppointmentsText, { color: theme.textMuted }]}>
                    {equivalente}
                  </ThemedText>
                )}
              </>
            ) : (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {`Monto (${enBs ? 'Bs.' : currencySymbol})`}
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
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  value={formData.amount}
                  onChangeText={(text) => setFormData((p) => ({ ...p, amount: text }))}
                />
                {equivalente && (
                  <ThemedText style={[styles.noAppointmentsText, { color: theme.textMuted }]}>
                    {equivalente}
                  </ThemedText>
                )}
              </>
            )}

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Método de pago
            </ThemedText>
            <View style={styles.methodRow}>
              {paymentMethodsForCountry(config.locale.country).map((m) => (
                <Pressable
                  key={m.id}
                  style={[
                    styles.methodChip,
                    {
                      borderColor: theme.border,
                      backgroundColor:
                        formData.method === m.id ? theme.primary : theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => setFormData((p) => ({ ...p, method: m.id }))}
                >
                  <Feather
                    name={m.icon}
                    size={16}
                    color={formData.method === m.id ? theme.buttonText : theme.textMuted}
                  />
                  <ThemedText
                    style={[
                      styles.methodChipText,
                      {
                        color: formData.method === m.id ? theme.buttonText : theme.text,
                      },
                    ]}
                  >
                    {m.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {formData.method === 'card' && parseFloat(formData.amount.replace(',', '.')) > 0 && (
              <ThemedText style={[styles.noAppointmentsText, { color: theme.textMuted }]}>
                {`Cobrar en POS: ${formatCurrency(posChargeAmount(parseFloat(formData.amount.replace(',', '.')), config.payments?.posFeePercent), config)} (incluye ${resolvePosFeePercent(config.payments?.posFeePercent)} % de comisión). Registra aquí solo el monto sin comisión.`}
              </ThemedText>
            )}

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Vincular a cita (opcional)
            </ThemedText>
            {recentAppointments.length === 0 ? (
              <ThemedText style={[styles.noAppointmentsText, { color: theme.textMuted }]}>
                No hay citas recientes para enlazar.
              </ThemedText>
            ) : (
              <ScrollFadeRow
                backgroundColor={theme.backgroundDefault}
                arrowColor={theme.textSecondary}
                contentContainerStyle={styles.appointmentChipsContainer}
              >
                <Pressable
                  style={[
                    styles.appointmentChip,
                    {
                      borderColor: theme.border,
                      backgroundColor:
                        selectedAppointmentId === null ? theme.primary : theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => onSelectAppointment(null)}
                >
                  <ThemedText
                    style={[
                      styles.appointmentChipText,
                      {
                        color: selectedAppointmentId === null ? theme.buttonText : theme.text,
                      },
                    ]}
                  >
                    Sin cita
                  </ThemedText>
                </Pressable>
                {recentAppointments.map((apt) => {
                  const isSelected = selectedAppointmentId === apt.id
                  const abono = abonoPrevioByApt[apt.id]
                  const pendienteApt = abono ? abono.service_total - abono.amount : null
                  return (
                    <Pressable
                      key={apt.id}
                      style={[
                        styles.appointmentChip,
                        {
                          borderColor: isSelected
                            ? theme.primary
                            : abono
                              ? theme.gold + '80'
                              : theme.border,
                          backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                        },
                      ]}
                      onPress={() => onSelectAppointment(apt.id)}
                    >
                      {abono && (
                        <View style={[styles.abonoChipDot, { backgroundColor: theme.gold }]} />
                      )}
                      <ThemedText
                        style={[
                          styles.appointmentChipText,
                          { color: isSelected ? theme.buttonText : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {apt.client_name || 'Sin nombre'}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.appointmentChipSubText,
                          {
                            color: isSelected ? theme.buttonText : theme.textMuted,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {formatShortDate(apt.date)} · {currencySymbol}
                        {parseFloat(apt.price).toFixed(0)}
                      </ThemedText>
                      {abono && pendienteApt != null && (
                        <ThemedText
                          style={[
                            styles.appointmentChipSubText,
                            {
                              color: isSelected ? theme.buttonText : theme.gold,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          Pendiente {currencySymbol}
                          {pendienteApt.toFixed(0)}
                        </ThemedText>
                      )}
                    </Pressable>
                  )
                })}
              </ScrollFadeRow>
            )}

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Notas (opcional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.inputMultiline,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Ej. Retoque pestañas, cliente María..."
              placeholderTextColor={theme.textMuted}
              value={formData.notes}
              onChangeText={(text) => setFormData((p) => ({ ...p, notes: text }))}
              multiline
            />

            {editingPayment?.appointment_id && (
              <Pressable
                style={[styles.linkAppointmentButton, { borderColor: theme.primary }]}
                onPress={() => {
                  const aptId = editingPayment.appointment_id
                  onClose()
                  if (aptId) {
                    const tabNav = navigation.getParent()
                    if (tabNav && typeof tabNav === 'object' && 'navigate' in tabNav) {
                      ;(
                        tabNav as {
                          navigate: (a: string, b?: { appointmentId: string }) => void
                        }
                      ).navigate('Agenda', { appointmentId: aptId })
                    }
                  }
                }}
              >
                <Feather name="calendar" size={18} color={theme.primary} />
                <ThemedText style={[styles.linkAppointmentButtonText, { color: theme.primary }]}>
                  Ver cita en Agenda
                </ThemedText>
              </Pressable>
            )}

            {editingPayment && (
              <Pressable
                style={[styles.deleteButton, { borderColor: theme.error }]}
                onPress={() => {
                  onClose()
                  onDelete(editingPayment)
                }}
              >
                <Feather name="trash-2" size={18} color={theme.error} />
                <ThemedText style={[styles.deleteButtonText, { color: theme.error }]}>
                  Eliminar pago
                </ThemedText>
              </Pressable>
            )}
          </ScrollView>

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary },
              isPending && { opacity: 0.7 },
            ]}
            onPress={onSubmit}
            disabled={
              isPending || (paymentType === 'abono' ? !abonoAmount : !formData.amount.trim())
            }
          >
            {isPending ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <>
                <Feather name="check" size={18} color={theme.buttonText} />
                <ThemedText style={[styles.submitButtonText, { color: theme.buttonText }]}>
                  {editingPayment ? 'Guardar' : 'Registrar pago'}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
