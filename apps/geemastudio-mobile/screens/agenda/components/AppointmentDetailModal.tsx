import React from 'react'
import { View, Modal, Pressable, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { BorderRadius, Spacing } from '@/constants/theme'

import type { TenantConfig } from '@zmtech/tenant-config'
import type { TimeFormatPreference } from '@zmtech/tenant-config'
import {
  diaDelMesEnZona,
  diaTieneFranjaAgenda,
  esInstanteEnHorarioLaboral,
  formatoHoraAgendaSlot,
  formatoHoraInstanteEnZona,
  indiceDiaSemanaJSEnZona,
  instanteCitaDesdeTexto,
  instanteCitaEnZona,
  zonaIANASegura,
} from '@zmtech/tenant-config'

import { DAYS_ES } from '../constants'
import type { AgendaAppointment, AgendaService } from '../types'
import { agendaStyles as styles } from '../agendaStyles'

/** Incremento de minutos del picker de hora exacta. */
const MINUTOS_CHIPS = [0, 15, 30, 45] as const

type Theme = {
  backgroundDefault: string
  backgroundSecondary: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  primary: string
  error: string
}

interface AppointmentDetailModalProps {
  visible: boolean
  onClose: () => void
  isTablet: boolean
  theme: Theme
  appointment: AgendaAppointment | null
  services: AgendaService[]
  agendaHours: number[]
  businessHours: TenantConfig['businessHours']
  timeZone: string
  language: TenantConfig['locale']['language']
  timeFormat: TimeFormatPreference
  weekDays: Date[]
  rescheduleDate: Date | null
  rescheduleHour: number
  rescheduleMinute: number
  onRescheduleDate: (d: Date) => void
  onRescheduleHour: (h: number) => void
  onRescheduleMinute: (m: number) => void
  onReschedule: () => void
  onDelete: () => void
  updatePending: boolean
  deletePending: boolean
  availabilityStatus?: 'idle' | 'checking' | 'free' | 'busy' | 'error'
  busyUntilLabel?: string | null
  isBusy?: boolean
}

export function AppointmentDetailModal({
  visible,
  onClose,
  isTablet,
  theme,
  appointment,
  services,
  agendaHours,
  businessHours,
  timeZone,
  language,
  timeFormat,
  weekDays,
  rescheduleDate,
  rescheduleHour,
  rescheduleMinute,
  onRescheduleDate,
  onRescheduleHour,
  onRescheduleMinute,
  onReschedule,
  onDelete,
  updatePending,
  deletePending,
  availabilityStatus = 'idle',
  busyUntilLabel = null,
  isBusy = false,
}: AppointmentDetailModalProps) {
  const enFranjaConfigurada =
    !!rescheduleDate &&
    esInstanteEnHorarioLaboral(
      rescheduleDate,
      rescheduleHour * 60 + rescheduleMinute,
      businessHours,
      timeZone
    )

  const disableReschedule =
    updatePending || isBusy || availabilityStatus === 'checking' || !enFranjaConfigurada

  return (
    <Modal visible={visible} animationType="slide" transparent>
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
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Cita</ThemedText>
                <Pressable
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Feather name="x" size={20} color={theme.textSecondary} />
                </Pressable>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>
                  Clienta
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
                  {appointment.client_name}
                </ThemedText>
                {appointment.client_phone ? (
                  <ThemedText style={[styles.summaryValue, { color: theme.text, fontSize: 14 }]}>
                    Tel: {appointment.client_phone}
                  </ThemedText>
                ) : null}
                {appointment.client_document ? (
                  <ThemedText style={[styles.summaryValue, { color: theme.text, fontSize: 14 }]}>
                    DNI: {appointment.client_document}
                  </ThemedText>
                ) : null}
                <ThemedText
                  style={[styles.summaryLabel, { color: theme.textMuted, marginTop: Spacing.md }]}
                >
                  Servicio
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
                  {services.find((s) => s.id === appointment.service_id)?.name ?? '—'}
                </ThemedText>
                <ThemedText
                  style={[styles.summaryLabel, { color: theme.textMuted, marginTop: Spacing.sm }]}
                >
                  {new Intl.DateTimeFormat(language, {
                    timeZone: zonaIANASegura(timeZone),
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: timeFormat === '12',
                  }).format(instanteCitaDesdeTexto(appointment.date, timeZone))}
                </ThemedText>
              </View>

              <View style={styles.formSection}>
                <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Reprogramar a
                </ThemedText>
                <ScrollFadeRow
                  backgroundColor={theme.backgroundDefault}
                  contentContainerStyle={styles.chipsContainer}
                  showArrows
                  arrowColor={theme.textSecondary}
                >
                  {weekDays.map((d) => {
                    const isSelected = rescheduleDate?.toDateString() === d.toDateString()
                    const diaConFranja = diaTieneFranjaAgenda(
                      d,
                      agendaHours,
                      businessHours,
                      timeZone
                    )
                    return (
                      <Pressable
                        key={d.toISOString()}
                        style={[
                          styles.serviceChip,
                          { borderColor: theme.border },
                          isSelected && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                          !diaConFranja && { opacity: 0.4 },
                        ]}
                        onPress={() => {
                          if (diaConFranja) onRescheduleDate(d)
                        }}
                      >
                        <ThemedText
                          style={[styles.serviceChipName, isSelected && { color: '#FFFFFF' }]}
                        >
                          {DAYS_ES[indiceDiaSemanaJSEnZona(d, timeZone)]}{' '}
                          {diaDelMesEnZona(d, timeZone)}
                        </ThemedText>
                      </Pressable>
                    )
                  })}
                </ScrollFadeRow>
                <ScrollFadeRow
                  backgroundColor={theme.backgroundDefault}
                  contentContainerStyle={styles.chipsContainer}
                  showArrows
                  arrowColor={theme.textSecondary}
                  style={{ marginTop: Spacing.sm }}
                >
                  {agendaHours.map((h) => {
                    const isSelected = rescheduleHour === h
                    const horaPermitida =
                      !!rescheduleDate &&
                      esInstanteEnHorarioLaboral(rescheduleDate, h * 60, businessHours, timeZone)
                    return (
                      <Pressable
                        key={h}
                        style={[
                          styles.employeeChip,
                          { borderColor: theme.border },
                          isSelected && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                          !horaPermitida && { opacity: 0.35 },
                        ]}
                        onPress={() => {
                          if (horaPermitida) onRescheduleHour(h)
                        }}
                      >
                        <ThemedText
                          style={[styles.employeeChipName, isSelected && { color: '#FFFFFF' }]}
                        >
                          {rescheduleDate
                            ? formatoHoraAgendaSlot(
                                rescheduleDate,
                                h,
                                zonaIANASegura(timeZone),
                                language,
                                timeFormat
                              )
                            : `${h}:00`}
                        </ThemedText>
                      </Pressable>
                    )
                  })}
                </ScrollFadeRow>
                <ScrollFadeRow
                  backgroundColor={theme.backgroundDefault}
                  contentContainerStyle={styles.chipsContainer}
                  showArrows
                  arrowColor={theme.textSecondary}
                  style={{ marginTop: Spacing.sm }}
                >
                  {MINUTOS_CHIPS.map((m) => {
                    const isSelected = rescheduleMinute === m
                    const permitido =
                      !!rescheduleDate &&
                      esInstanteEnHorarioLaboral(
                        rescheduleDate,
                        rescheduleHour * 60 + m,
                        businessHours,
                        timeZone
                      )
                    return (
                      <Pressable
                        key={m}
                        style={[
                          styles.employeeChip,
                          { borderColor: theme.border },
                          isSelected && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                          !permitido && { opacity: 0.35 },
                        ]}
                        onPress={() => {
                          if (permitido) onRescheduleMinute(m)
                        }}
                      >
                        <ThemedText
                          style={[styles.employeeChipName, isSelected && { color: '#FFFFFF' }]}
                        >
                          :{String(m).padStart(2, '0')}
                        </ThemedText>
                      </Pressable>
                    )
                  })}
                </ScrollFadeRow>
                {rescheduleDate && !enFranjaConfigurada ? (
                  <ThemedText
                    style={[styles.summaryLabel, { color: theme.error, marginTop: Spacing.sm }]}
                  >
                    Ese día u hora está fuera de la franja configurada del negocio.
                  </ThemedText>
                ) : rescheduleDate ? (
                  <View
                    style={{
                      marginTop: Spacing.sm,
                      paddingVertical: Spacing.sm,
                      paddingHorizontal: Spacing.md,
                      borderRadius: BorderRadius.md,
                      backgroundColor: theme.backgroundSecondary,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.xs,
                    }}
                  >
                    <Feather name="clock" size={15} color={theme.primary} />
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                      Hora seleccionada:{' '}
                      {formatoHoraInstanteEnZona(
                        instanteCitaEnZona(
                          rescheduleDate,
                          rescheduleHour,
                          zonaIANASegura(timeZone),
                          rescheduleMinute
                        ),
                        zonaIANASegura(timeZone),
                        language,
                        timeFormat
                      )}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {availabilityStatus === 'busy' ? (
                <View
                  style={[
                    styles.availabilityBanner,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Feather name="alert-triangle" size={18} color={theme.text} />
                  <ThemedText style={[styles.availabilityBannerText, { color: theme.text }]}>
                    Horario ocupado
                    {busyUntilLabel ? `. Termina a las ${busyUntilLabel}` : ''}.
                  </ThemedText>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.primary,
                    marginBottom: Spacing.sm,
                  },
                  disableReschedule && { opacity: 0.65 },
                ]}
                onPress={onReschedule}
                disabled={disableReschedule}
              >
                {updatePending || availabilityStatus === 'checking' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="calendar" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.submitButtonText}>
                      {isBusy ? 'Horario ocupado' : 'Reprogramar'}
                    </ThemedText>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.submitButton, { backgroundColor: theme.error }]}
                onPress={onDelete}
                disabled={deletePending}
              >
                {deletePending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="trash-2" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.submitButtonText}>Eliminar cita</ThemedText>
                  </>
                )}
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}
