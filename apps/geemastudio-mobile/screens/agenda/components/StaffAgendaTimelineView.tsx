import React, { useMemo } from 'react'
import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Gradients, Spacing, BorderRadius } from '@/constants/theme'
import {
  esHoyEnZonaIANA,
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  type TenantConfig,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import type { AgendaAppointment, AgendaService } from '../types'
import {
  filterAppointmentsForOwnerDay,
  getServiceName,
  sortAppointmentsByStart,
} from '../agendaUtils'
import { useAgendaClockTick } from '../hooks/useAgendaClockTick'
import { agendaStyles as sharedStyles } from '../agendaStyles'

interface StaffAgendaTimelineViewProps {
  staffEmployeeId: string | null
  staffDisplayName: string
  staffSingularLabel: string
  tabBarHeight: number
  selectedDate: Date
  timeZone: string
  language: TenantConfig['locale']['language']
  timeFormat: TimeFormatPreference
  appointments: AgendaAppointment[]
  services: AgendaService[]
  isLoading: boolean
  onRefresh: () => void
  currencySymbol: string
  theme: {
    primary: string
    accent: string
    text: string
    textSecondary: string
    textMuted: string
    border: string
    backgroundRoot: string
    backgroundSecondary: string
    card: string
    success: string
    warning: string
  }
  onOpenDetail: (apt: AgendaAppointment) => void
  onPressNew: () => void
}

function esPendienteDeValidacion(status: string): boolean {
  return status === 'payment_submitted'
}

function descripcionEstado(status: string): {
  label: string
  tone: 'ok' | 'wait' | 'muted'
} {
  if (esPendienteDeValidacion(status)) return { label: 'Pendiente', tone: 'wait' }
  if (status === 'cancelled' || status === 'no_show')
    return {
      label: status === 'cancelled' ? 'Cancelada' : 'Ausencia',
      tone: 'muted',
    }
  return { label: 'Confirmado', tone: 'ok' }
}

/** 45 → '45 min' | 60 → '1 h' | 90 → '1 h 30 min' */
function formatDuration(minutes: number): string {
  if (minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/**
 * Card de cita en la timeline del staff.
 *
 * Patrón de borde izquierdo coloreado sin artefactos en Android:
 *   - View exterior: borderRadius + overflow:"hidden" → recorta TODOS los hijos
 *   - View interior: sin overflow, con padding y contenido
 *   - El borde izquierdo grueso (accentColor) se aplica en el exterior
 *     con borderLeftWidth. overflow:"hidden" garantiza que las esquinas
 *     del borde grueso se recorten correctamente en Android e iOS.
 */
function TimelineCard({
  apt,
  accentColor,
  tone,
  estadoLabel,
  serviceName,
  theme,
  onPress,
}: {
  apt: AgendaAppointment
  accentColor: string
  tone: 'ok' | 'wait' | 'muted'
  estadoLabel: string
  serviceName: string
  theme: StaffAgendaTimelineViewProps['theme']
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, marginLeft: Spacing.sm }}>
      {/*
       * overflow:"hidden" aquí hace que borderRadius recorte el borderLeftWidth:4
       * en Android. Sin él, el borde grueso sobresale de las esquinas redondeadas.
       * No hay LinearGradient dentro, así que overflow:"hidden" no bloquea nada.
       */}
      <View
        style={{
          borderRadius: BorderRadius.md,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          backgroundColor: theme.backgroundSecondary,
        }}
      >
        <View style={{ padding: Spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <ThemedText
                style={{ fontSize: 16, fontWeight: '700', color: theme.text }}
                numberOfLines={1}
              >
                {apt.client_name}
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 13,
                  color: theme.textSecondary,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {serviceName || '—'}
              </ThemedText>
              {apt.duration > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  <Feather name="clock" size={11} color={theme.textMuted} />
                  <ThemedText style={{ fontSize: 11, color: theme.textMuted }}>
                    {formatDuration(apt.duration)}
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {tone === 'ok' ? (
                <Feather name="check-circle" size={16} color={theme.success} />
              ) : tone === 'wait' ? (
                <Feather name="clock" size={16} color={theme.warning} />
              ) : (
                <Feather name="minus-circle" size={16} color={theme.textMuted} />
              )}
              <ThemedText style={{ fontSize: 11, fontWeight: '600', color: accentColor }}>
                {estadoLabel}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

export function StaffAgendaTimelineView({
  staffEmployeeId,
  staffDisplayName,
  staffSingularLabel,
  tabBarHeight,
  selectedDate,
  timeZone,
  language,
  timeFormat,
  appointments,
  services,
  isLoading,
  onRefresh,
  currencySymbol,
  theme,
  onOpenDetail,
  onPressNew,
}: StaffAgendaTimelineViewProps) {
  const isTodayInTz = esHoyEnZonaIANA(selectedDate, timeZone)
  const now = useAgendaClockTick(isTodayInTz)

  const myDayApts = useMemo(() => {
    if (!staffEmployeeId) return []
    const raw = filterAppointmentsForOwnerDay(
      appointments,
      selectedDate,
      [staffEmployeeId],
      'all',
      timeZone
    )
    return sortAppointmentsByStart(raw, timeZone)
  }, [appointments, selectedDate, staffEmployeeId, timeZone])

  const siguiente = useMemo(() => {
    if (myDayApts.length === 0) return null
    const nowMs = now.getTime()
    for (const apt of myDayApts) {
      const startMs = instanteCitaDesdeTexto(apt.date, timeZone).getTime()
      const endMs = startMs + apt.duration * 60_000
      if (endMs >= nowMs) return apt
    }
    return null
  }, [myDayApts, now])

  if (!staffEmployeeId) {
    return (
      <View
        style={[
          sharedStyles.calendarContainer,
          {
            padding: Spacing.xl,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
          Tu cuenta no está vinculada a un {staffSingularLabel} en el equipo. Pide al dueño que te
          asigne en Personal.
        </ThemedText>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={sharedStyles.calendarContainer}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 88,
          paddingHorizontal: Spacing.md,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <ThemedText
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: theme.text,
            marginBottom: Spacing.sm,
            marginTop: Spacing.xs,
          }}
        >
          Mi agenda — {staffDisplayName.split(' ')[0] ?? staffDisplayName}
        </ThemedText>

        {/* Hero card: próxima cita — LinearGradient como borde exterior, sin overflow:hidden */}
        {siguiente ? (
          <LinearGradient
            colors={Gradients.onboarding.colors}
            start={Gradients.onboarding.linearStart}
            end={Gradients.onboarding.linearEnd}
            locations={[...Gradients.onboarding.locations]}
            style={{
              borderRadius: BorderRadius.lg,
              padding: 2,
              marginBottom: Spacing.lg,
            }}
          >
            {/*
             * View interior: overflow:"hidden" + borderRadius para recortar
             * correctamente dentro del LinearGradient en Android.
             */}
            <View
              style={{
                borderRadius: BorderRadius.lg - 2,
                overflow: 'hidden',
                backgroundColor: theme.card,
              }}
            >
              <View
                style={{
                  padding: Spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                }}
              >
                <Feather name="zap" size={28} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: theme.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Próximo cliente
                  </ThemedText>
                  <ThemedText
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: theme.text,
                      marginTop: 4,
                    }}
                  >
                    {formatoHoraInstanteEnZona(
                      instanteCitaDesdeTexto(siguiente.date, timeZone),
                      timeZone,
                      language,
                      timeFormat
                    )}{' '}
                    · {siguiente.client_name}
                  </ThemedText>
                  <ThemedText
                    style={{
                      fontSize: 14,
                      color: theme.textSecondary,
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {getServiceName(services, siguiente.service_id) || '—'}
                  </ThemedText>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: Spacing.md,
                      marginTop: Spacing.sm,
                    }}
                  >
                    {siguiente.duration > 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Feather name="clock" size={12} color={theme.textMuted} />
                        <ThemedText style={{ fontSize: 12, color: theme.textMuted }}>
                          {formatDuration(siguiente.duration)}
                        </ThemedText>
                      </View>
                    )}
                    {parseFloat(siguiente.price) > 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Feather name="tag" size={12} color={theme.textMuted} />
                        <ThemedText style={{ fontSize: 12, color: theme.textMuted }}>
                          {currencySymbol} {parseFloat(siguiente.price).toFixed(2)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        ) : myDayApts.length > 0 ? (
          <View style={{ marginBottom: Spacing.lg }}>
            <ThemedText style={{ color: theme.textMuted, fontSize: 14 }}>
              No quedan citas pendientes hoy en el horario actual.
            </ThemedText>
          </View>
        ) : (
          <View style={{ marginBottom: Spacing.lg }}>
            <ThemedText style={{ color: theme.textMuted, fontSize: 14 }}>
              No tienes citas este día. Toca “Nueva cita” para agendar.
            </ThemedText>
          </View>
        )}

        {/* Timeline */}
        <View style={{ position: 'relative', paddingLeft: Spacing.lg }}>
          <View
            style={{
              position: 'absolute',
              left: 6,
              top: 12,
              bottom: 12,
              width: 2,
              backgroundColor: theme.border,
              borderRadius: 1,
            }}
          />

          {myDayApts.map((apt) => {
            const start = instanteCitaDesdeTexto(apt.date, timeZone)
            const timeLabel = formatoHoraInstanteEnZona(start, timeZone, language, timeFormat)
            const { label: estadoLabel, tone } = descripcionEstado(apt.status)
            const accentColor =
              tone === 'ok' ? theme.success : tone === 'wait' ? theme.warning : theme.textMuted
            const serviceName = getServiceName(services, apt.service_id)

            return (
              <View
                key={apt.id}
                style={{
                  flexDirection: 'row',
                  marginBottom: Spacing.md,
                  alignItems: 'stretch',
                }}
              >
                {/* Hora */}
                <View
                  style={{
                    width: 52,
                    alignItems: 'flex-end',
                    paddingRight: Spacing.sm,
                    paddingTop: 6,
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: theme.textMuted,
                    }}
                  >
                    {timeLabel}
                  </ThemedText>
                </View>

                {/* Dot */}
                <View style={{ width: 14, alignItems: 'center', paddingTop: 6 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: accentColor,
                      borderWidth: 2,
                      borderColor: theme.backgroundRoot,
                    }}
                  />
                </View>

                <TimelineCard
                  apt={apt}
                  accentColor={accentColor}
                  tone={tone}
                  estadoLabel={estadoLabel}
                  serviceName={serviceName}
                  theme={theme}
                  onPress={() => onOpenDetail(apt)}
                />
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* FAB Nueva cita */}
      <Pressable
        onPress={onPressNew}
        style={{
          position: 'absolute',
          right: Spacing.lg,
          bottom: tabBarHeight + Spacing.md,
          borderRadius: BorderRadius.full,
          overflow: 'hidden',
          ...StyleSheet.flatten({
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          }),
        }}
      >
        <LinearGradient
          colors={Gradients.onboarding.colors}
          start={Gradients.onboarding.linearStart}
          end={Gradients.onboarding.linearEnd}
          locations={[...Gradients.onboarding.locations]}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            gap: Spacing.sm,
          }}
        >
          <Feather name="plus" size={22} color="#FFFFFF" />
          <ThemedText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
            Nueva cita
          </ThemedText>
        </LinearGradient>
      </Pressable>
    </View>
  )
}
