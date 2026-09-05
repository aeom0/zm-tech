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
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing } from '@/constants/theme'
import type { MainTabParamList } from '@/navigation/MainTabNavigator'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'

import { PAYMENT_METHODS } from '../constants'
import { financesStyles as styles } from '../financesStyles'
import type {
  FinancesAppointmentOption,
  FinancesPayment,
  FinancesPaymentType,
} from '../types'

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList, 'Finanzas'>,
  BottomTabNavigationProp<MainTabParamList, 'More'>
>

interface Props {
  visible: boolean
  editingPayment: FinancesPayment | null
  paymentType: FinancesPaymentType
  formData: {
    amount: string
    serviceTotal: string
    method: string
    notes: string
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      amount: string
      serviceTotal: string
      method: string
      notes: string
    }>
  >
  selectedAppointmentId: string | null
  abonoAmount: string | null
  currencySymbol: string
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

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(config.locale.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
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
                    ] as const
                  ).map((t) => (
                    <Pressable
                      key={t.id}
                      style={[
                        styles.paymentTypeChip,
                        {
                          borderColor: paymentType === t.id ? theme.primary : theme.border,
                          backgroundColor:
                            paymentType === t.id
                              ? theme.primary + '15'
                              : theme.backgroundSecondary,
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
              </>
            ) : (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {`Monto (${currencySymbol})`}
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
              </>
            )}

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Método de pago
            </ThemedText>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((m) => (
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
                        selectedAppointmentId === null
                          ? theme.primary
                          : theme.backgroundSecondary,
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
                          backgroundColor: isSelected
                            ? theme.primary
                            : theme.backgroundSecondary,
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
                            color: isSelected ? 'rgba(255,255,255,0.8)' : theme.textMuted,
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
                              color: isSelected ? 'rgba(255,255,255,0.85)' : theme.gold,
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
                    if (tabNav && 'navigate' in tabNav) {
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
                <ThemedText style={styles.submitButtonText}>
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
