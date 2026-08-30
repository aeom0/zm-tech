import React from 'react'
import { ActivityIndicator, Modal, Pressable, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'

import { PAYMENT_METHODS } from '@/screens/finances/constants'

import { formatDashboardTime } from '../dashboardUtils'
import type { DashboardAppointment } from '../types'
import { dashboardStyles as styles } from '../dashboardStyles'

interface DashboardAppointmentModalProps {
  visible: boolean
  appointment: DashboardAppointment | null
  isTablet: boolean
  currencySymbol: string
  locale: string
  timeZone: string
  theme: {
    backgroundDefault: string
    backgroundSecondary: string
    border: string
    text: string
    textSecondary: string
    primary: string
    gold: string
    success: string
  }
  getServiceName: (serviceId: string) => string
  isCompleting: boolean
  payMethodVisible: boolean
  pendingPayMethod: string
  onSelectPayMethod: (method: string) => void
  onCancelPayMethod: () => void
  onConfirmPayMethod: () => void
  onClose: () => void
  onMarkCompleted: (appointment: DashboardAppointment) => void
  onEditInAgenda: (appointment: DashboardAppointment) => void
}

export function DashboardAppointmentModal({
  visible,
  appointment,
  isTablet,
  currencySymbol,
  locale,
  timeZone,
  theme,
  getServiceName,
  isCompleting,
  payMethodVisible,
  pendingPayMethod,
  onSelectPayMethod,
  onCancelPayMethod,
  onConfirmPayMethod,
  onClose,
  onMarkCompleted,
  onEditInAgenda,
}: DashboardAppointmentModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.backgroundDefault },
            isTablet && styles.modalContentTablet,
          ]}
        >
          {appointment ? (
            <>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Detalle de cita</ThemedText>
                <Pressable
                  onPress={onClose}
                  style={[styles.modalCloseBtn, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>

              <View style={[styles.modalBody, { borderColor: theme.border }]}>
                <ThemedText style={[styles.modalClient, { color: theme.text }]}>
                  {appointment.client_name}
                </ThemedText>
                <ThemedText style={[styles.modalService, { color: theme.textSecondary }]}>
                  {getServiceName(appointment.service_id)}
                </ThemedText>
                <View style={styles.modalMeta}>
                  <View style={[styles.modalMetaChip, { backgroundColor: `${theme.primary}12` }]}>
                    <Feather name="clock" size={12} color={theme.primary} />
                    <ThemedText style={[styles.modalMetaText, { color: theme.primary }]}>
                      {formatDashboardTime(appointment.date, locale, timeZone)}
                    </ThemedText>
                  </View>
                  <View style={[styles.modalMetaChip, { backgroundColor: `${theme.primary}12` }]}>
                    <Feather name="activity" size={12} color={theme.primary} />
                    <ThemedText style={[styles.modalMetaText, { color: theme.primary }]}>
                      {appointment.duration} min
                    </ThemedText>
                  </View>
                  <View style={[styles.modalMetaChip, { backgroundColor: `${theme.gold}18` }]}>
                    <ThemedText
                      style={[styles.modalMetaText, { color: theme.gold, fontWeight: '700' }]}
                    >
                      {currencySymbol}
                      {parseFloat(String(appointment.price)).toFixed(0)}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.success }]}
                onPress={() => onMarkCompleted(appointment)}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Feather name="check-circle" size={16} color="#FFF" />
                    <ThemedText style={styles.modalBtnText}>Marcar completada</ThemedText>
                  </>
                )}
              </Pressable>

              {payMethodVisible && (
                <View
                  style={[
                    styles.payMethodBox,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                  ]}
                >
                  <ThemedText style={[styles.payMethodTitle, { color: theme.text }]}>
                    ¿Cómo pagó?
                  </ThemedText>
                  {PAYMENT_METHODS.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[
                        styles.payMethodOption,
                        {
                          borderColor: pendingPayMethod === m.id ? theme.primary : theme.border,
                        },
                        pendingPayMethod === m.id && { backgroundColor: `${theme.primary}12` },
                      ]}
                      onPress={() => onSelectPayMethod(m.id)}
                    >
                      <Feather
                        name={m.icon}
                        size={14}
                        color={pendingPayMethod === m.id ? theme.primary : theme.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.payMethodLabel,
                          { color: pendingPayMethod === m.id ? theme.primary : theme.text },
                        ]}
                      >
                        {m.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                  <View style={styles.payMethodActions}>
                    <Pressable
                      style={[styles.payMethodCancel, { borderColor: theme.border }]}
                      onPress={onCancelPayMethod}
                    >
                      <ThemedText
                        style={[styles.payMethodCancelText, { color: theme.textSecondary }]}
                      >
                        Cancelar
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.payMethodCancel,
                        { borderColor: theme.primary, backgroundColor: theme.primary },
                      ]}
                      onPress={onConfirmPayMethod}
                      disabled={isCompleting}
                    >
                      {isCompleting ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <ThemedText style={[styles.payMethodCancelText, { color: '#FFF' }]}>
                          Confirmar
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.modalBtnOutline, { borderColor: theme.primary }]}
                onPress={() => onEditInAgenda(appointment)}
              >
                <Feather name="edit-2" size={16} color={theme.primary} />
                <ThemedText style={[styles.modalBtnOutlineText, { color: theme.primary }]}>
                  Editar en Agenda
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}
