import React, { useMemo } from 'react'
import { View, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { BorderRadius, Spacing } from '@/constants/theme'

import { PAYMENT_METHODS } from '@/screens/finances/constants'

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
import { useSalonHolidays } from '@/hooks/useSalonHolidays'

import { DAYS_ES } from '../constants'
import { SvcPickerContent } from './SvcPickerContent'
import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaPack,
  AgendaService,
  AgendaServiceCategory,
  AgendaServiceLine,
} from '../types'
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
  success: string
}

interface AppointmentDetailModalProps {
  visible: boolean
  onClose: () => void
  isTablet: boolean
  theme: Theme
  appointment: AgendaAppointment | null
  services: AgendaService[]
  employees: AgendaEmployee[]
  categories: AgendaServiceCategory[]
  packs: AgendaPack[]
  staffSingular: string
  agendaHours: number[]
  businessHours: TenantConfig['businessHours']
  timeZone: string
  language: TenantConfig['locale']['language']
  timeFormat: TimeFormatPreference
  weekDays: Date[]
  editServiceLines: AgendaServiceLine[]
  setEditServiceLines: React.Dispatch<React.SetStateAction<AgendaServiceLine[]>>
  svcPickerVisible: boolean
  svcPickerCatId: string
  setSvcPickerCatId: (id: string) => void
  svcPickerEmployeeId: string
  setSvcPickerEmployeeId: (id: string) => void
  pickerSelectedIds: string[]
  onOpenPicker: () => void
  onClosePicker: () => void
  onToggleService: (serviceId: string, employeeId: string) => void
  onAddPack: (pack: AgendaPack, employeeId: string) => void
  onSaveServices: () => void
  isSavingServices: boolean
  servicesLoading?: boolean
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
  isCompleting: boolean
  payMethodVisible: boolean
  pendingPayMethod: string
  onSelectPayMethod: (method: string) => void
  onCancelPayMethod: () => void
  onConfirmPayMethod: () => void
  onMarkCompleted: (appointment: AgendaAppointment) => void
}

export function AppointmentDetailModal({
  visible,
  onClose,
  isTablet,
  theme,
  appointment,
  services,
  employees,
  categories,
  packs,
  staffSingular,
  agendaHours,
  businessHours,
  timeZone,
  language,
  timeFormat,
  weekDays,
  editServiceLines,
  setEditServiceLines,
  svcPickerVisible,
  svcPickerCatId,
  setSvcPickerCatId,
  svcPickerEmployeeId,
  setSvcPickerEmployeeId,
  pickerSelectedIds,
  onOpenPicker,
  onClosePicker,
  onToggleService,
  onAddPack,
  onSaveServices,
  isSavingServices,
  servicesLoading = false,
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
  isCompleting,
  payMethodVisible,
  pendingPayMethod,
  onSelectPayMethod,
  onCancelPayMethod,
  onConfirmPayMethod,
  onMarkCompleted,
}: AppointmentDetailModalProps) {
  const { holidayIndex } = useSalonHolidays(true)
  const { config } = useTenant()
  type EnrichedLine = AgendaService & {
    employeeId: string
    employee?: AgendaEmployee
    idx: number
    unitPrice: number
    packId?: string
  }

  const { enrichedLines, editTotal, editDur, missingServiceCount } = useMemo(() => {
    let missing = 0
    const lines = editServiceLines
      .map((line, idx) => {
        const svc = services.find((s) => s.id === line.serviceId)
        const emp = employees.find((e) => e.id === line.employeeId)
        if (!svc) {
          missing += 1
          return null
        }
        const unitPrice =
          typeof line.priceOverride === 'number' && Number.isFinite(line.priceOverride)
            ? line.priceOverride
            : parseFloat(svc.price)
        return {
          ...svc,
          employeeId: line.employeeId,
          employee: emp,
          idx,
          unitPrice,
          packId: line.packId,
        }
      })
      .filter(Boolean) as EnrichedLine[]
    return {
      enrichedLines: lines,
      editTotal: lines.reduce((sum, s) => sum + s.unitPrice, 0),
      editDur: lines.reduce((sum, s) => sum + s.duration, 0),
      missingServiceCount: missing,
    }
  }, [editServiceLines, services, employees])

  const canMarkCompleted =
    !!appointment && appointment.status !== 'completed' && appointment.status !== 'cancelled'

  const canEditServices = !!appointment && appointment.status === 'scheduled'

  const enFranjaConfigurada =
    !!rescheduleDate &&
    esInstanteEnHorarioLaboral(
      rescheduleDate,
      rescheduleHour * 60 + rescheduleMinute,
      businessHours,
      timeZone,
      holidayIndex
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
            svcPickerVisible && styles.contentWithPicker,
          ]}
        >
          {appointment ? (
            svcPickerVisible ? (
              <SvcPickerContent
                categories={categories}
                services={services}
                employees={employees}
                packs={packs}
                currencySymbol={config.locale.currency.symbol}
                staffSingular={staffSingular}
                selectedCatId={svcPickerCatId}
                onSelectCat={setSvcPickerCatId}
                selectedEmployeeId={svcPickerEmployeeId}
                onSelectEmployee={setSvcPickerEmployeeId}
                selectedServiceIds={pickerSelectedIds}
                onToggleService={onToggleService}
                onAddPack={onAddPack}
                onClose={onClosePicker}
              />
            ) : (
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

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailScroll}
                  keyboardShouldPersistTaps="handled"
                >
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
                      <ThemedText
                        style={[styles.summaryValue, { color: theme.text, fontSize: 14 }]}
                      >
                        Tel: {appointment.client_phone}
                      </ThemedText>
                    ) : null}
                    {appointment.client_document ? (
                      <ThemedText
                        style={[styles.summaryValue, { color: theme.text, fontSize: 14 }]}
                      >
                        DNI: {appointment.client_document}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      style={[
                        styles.summaryLabel,
                        { color: theme.textMuted, marginTop: Spacing.md },
                      ]}
                    >
                      Fecha y hora
                    </ThemedText>
                    <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
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
                      Servicios
                    </ThemedText>
                    {servicesLoading ? (
                      <ActivityIndicator color={theme.primary} style={{ padding: Spacing.md }} />
                    ) : enrichedLines.length === 0 ? (
                      <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>
                        {canEditServices
                          ? 'Agrega al menos un servicio a esta cita.'
                          : 'Sin detalle de servicios registrado.'}
                      </ThemedText>
                    ) : (
                      enrichedLines.map((line) => (
                        <View
                          key={`${line.id}-${line.idx}`}
                          style={[
                            styles.svcRow,
                            {
                              backgroundColor: theme.backgroundSecondary,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              style={[styles.svcName, { color: theme.text }]}
                              numberOfLines={2}
                            >
                              {line.name}
                              {line.packId ? ' (pack)' : ''}
                            </ThemedText>
                            <ThemedText style={[styles.svcDetail, { color: theme.textMuted }]}>
                              {line.duration} min · {formatCurrency(line.unitPrice, config)}
                              {line.employee
                                ? ` · ${line.employee.name.split(' ')[0]}`
                                : ''}
                            </ThemedText>
                          </View>
                          {canEditServices ? (
                            <Pressable
                              onPress={() =>
                                setEditServiceLines((prev) =>
                                  prev.filter((_, i) => i !== line.idx)
                                )
                              }
                              hitSlop={8}
                            >
                              <Feather name="x-circle" size={18} color={theme.textMuted} />
                            </Pressable>
                          ) : null}
                        </View>
                      ))
                    )}
                    {missingServiceCount > 0 ? (
                      <ThemedText style={[styles.svcDetail, { color: theme.error }]}>
                        {missingServiceCount === 1
                          ? '1 servicio de esta cita ya no está disponible y no se muestra en el total.'
                          : `${missingServiceCount} servicios de esta cita ya no están disponibles y no se muestran en el total.`}
                      </ThemedText>
                    ) : null}
                    {enrichedLines.length > 0 ? (
                      <View
                        style={[
                          styles.totalRow,
                          { backgroundColor: theme.backgroundSecondary },
                        ]}
                      >
                        <ThemedText style={[styles.totalLabel, { color: theme.textSecondary }]}>
                          {enrichedLines.length} servicio
                          {enrichedLines.length !== 1 ? 's' : ''} · {editDur} min
                        </ThemedText>
                        <ThemedText style={[styles.totalPrice, { color: theme.primary }]}>
                          {formatCurrency(editTotal, config)}
                        </ThemedText>
                      </View>
                    ) : null}
                    {canEditServices ? (
                      <>
                        <Pressable
                          style={[styles.addSvcBtn, { borderColor: theme.primary }]}
                          onPress={onOpenPicker}
                        >
                          <Feather name="plus-circle" size={16} color={theme.primary} />
                          <ThemedText style={[styles.addSvcBtnText, { color: theme.primary }]}>
                            Agregar servicio o pack
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.submitButton,
                            {
                              backgroundColor: theme.primary,
                              marginTop: Spacing.sm,
                              marginBottom: Spacing.sm,
                            },
                            (isSavingServices || editServiceLines.length === 0) && {
                              opacity: 0.5,
                            },
                          ]}
                          onPress={onSaveServices}
                          disabled={isSavingServices || editServiceLines.length === 0}
                        >
                          {isSavingServices ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <>
                              <Feather name="save" size={18} color="#FFFFFF" />
                              <ThemedText style={styles.submitButtonText}>
                                Guardar servicios
                              </ThemedText>
                            </>
                          )}
                        </Pressable>
                      </>
                    ) : null}
                  </View>

                  {canMarkCompleted ? (
                    <>
                      <Pressable
                        style={[
                          styles.submitButton,
                          { backgroundColor: theme.success, marginBottom: Spacing.sm },
                        ]}
                        onPress={() => onMarkCompleted(appointment)}
                        disabled={isCompleting}
                      >
                        {isCompleting ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Feather name="check-circle" size={18} color="#FFFFFF" />
                            <ThemedText style={styles.submitButtonText}>
                              Marcar completada
                            </ThemedText>
                          </>
                        )}
                      </Pressable>

                      {payMethodVisible ? (
                        <View
                          style={[
                            styles.payMethodBox,
                            {
                              backgroundColor: theme.backgroundSecondary,
                              borderColor: theme.border,
                            },
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
                                  borderColor:
                                    pendingPayMethod === m.id ? theme.primary : theme.border,
                                },
                                pendingPayMethod === m.id && {
                                  backgroundColor: `${theme.primary}12`,
                                },
                              ]}
                              onPress={() => onSelectPayMethod(m.id)}
                            >
                              <Feather
                                name={m.icon}
                                size={14}
                                color={
                                  pendingPayMethod === m.id ? theme.primary : theme.textSecondary
                                }
                              />
                              <ThemedText
                                style={[
                                  styles.payMethodLabel,
                                  {
                                    color: pendingPayMethod === m.id ? theme.primary : theme.text,
                                  },
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
                      ) : null}
                    </>
                  ) : null}

                  <View style={styles.formSection}>
                    <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      Reprogramar a
                    </ThemedText>
                    <ScrollFadeRow
                      backgroundColor={theme.backgroundDefault}
                      contentContainerStyle={styles.chipsContainer}
                      arrowColor={theme.textSecondary}
                    >
                      {weekDays.map((d) => {
                        const isSelected = rescheduleDate?.toDateString() === d.toDateString()
                        const diaConFranja = diaTieneFranjaAgenda(
                          d,
                          agendaHours,
                          businessHours,
                          timeZone,
                          holidayIndex
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
                      arrowColor={theme.textSecondary}
                      style={{ marginTop: Spacing.sm }}
                    >
                      {agendaHours.map((h) => {
                        const isSelected = rescheduleHour === h
                        const horaPermitida =
                          !!rescheduleDate &&
                          esInstanteEnHorarioLaboral(
                            rescheduleDate,
                            h * 60,
                            businessHours,
                            timeZone,
                            holidayIndex
                          )
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
                            timeZone,
                            holidayIndex
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
                        style={[
                          styles.summaryLabel,
                          { color: theme.error, marginTop: Spacing.sm },
                        ]}
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
                </ScrollView>
              </>
            )
          ) : null}
        </View>
      </View>
    </Modal>
  )
}
