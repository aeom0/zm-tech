import React, { useMemo } from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { BorderRadius, Spacing } from '@/constants/theme'

import type { TenantConfig, TimeFormatPreference } from '@zmtech/tenant-config'
import {
  diaDelMesEnZona,
  diaTieneFranjaAgenda,
  esInstanteEnHorarioLaboral,
  formatoHoraAgendaSlot,
  formatoHoraInstanteEnZona,
  indiceDiaSemanaJSEnZona,
  inicioDiaHoyEnZonaIANA,
  instanteCitaEnZona,
  sumarDiasEnZonaIANA,
  zonaIANASegura,
} from '@zmtech/tenant-config'
import { useSalonHolidays } from '@/hooks/useSalonHolidays'

import { DAYS_ES } from '../../constants'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

/** Ventana de días futuros seleccionables desde el picker — cubre agendar con semanas de anticipación. */
const DIAS_VISIBLES = 45
/** Incremento de minutos del picker de hora exacta. */
const MINUTOS_CHIPS = [0, 15, 30, 45] as const

interface FechaHoraSectionProps {
  theme: NewAppointmentModalTheme
  selectedDate: Date
  selectedHour: number
  selectedMinute: number
  agendaHours: number[]
  businessHours: TenantConfig['businessHours']
  timeZone: string
  language: TenantConfig['locale']['language']
  timeFormat: TimeFormatPreference
  onChangeDate: (d: Date) => void
  onChangeHour: (h: number) => void
  onChangeMinute: (m: number) => void
}

export function FechaHoraSection({
  theme,
  selectedDate,
  selectedHour,
  selectedMinute,
  agendaHours,
  businessHours,
  timeZone,
  language,
  timeFormat,
  onChangeDate,
  onChangeHour,
  onChangeMinute,
}: FechaHoraSectionProps) {
  const tz = zonaIANASegura(timeZone)
  const { holidayIndex } = useSalonHolidays(true)

  const diasVisibles = useMemo(() => {
    const hoy = inicioDiaHoyEnZonaIANA(tz)
    return Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDiasEnZonaIANA(hoy, i, tz))
  }, [tz])

  const horaMinutoPermitido = esInstanteEnHorarioLaboral(
    selectedDate,
    selectedHour * 60 + selectedMinute,
    businessHours,
    tz,
    holidayIndex
  )

  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Feather name="calendar" size={16} color={theme.primary} />
        <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          Fecha y hora
        </ThemedText>
      </View>

      <ScrollFadeRow
        backgroundColor={theme.backgroundDefault}
        contentContainerStyle={styles.chipsContainer}
        arrowColor={theme.textSecondary}
      >
        {diasVisibles.map((d) => {
          const isSelected = d.toDateString() === selectedDate.toDateString()
          const diaConFranja = diaTieneFranjaAgenda(
            d,
            agendaHours,
            businessHours,
            tz,
            holidayIndex
          )
          return (
            <Pressable
              key={d.toISOString()}
              style={[
                styles.serviceChip,
                { borderColor: theme.border },
                isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                !diaConFranja && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (diaConFranja) onChangeDate(d)
              }}
            >
              <ThemedText style={[styles.serviceChipName, isSelected && { color: '#FFFFFF' }]}>
                {DAYS_ES[indiceDiaSemanaJSEnZona(d, tz)]} {diaDelMesEnZona(d, tz)}
              </ThemedText>
            </Pressable>
          )
        })}
      </ScrollFadeRow>

      <ScrollFadeRow
        backgroundColor={theme.backgroundDefault}
        contentContainerStyle={styles.chipsContainer}
        arrowColor={theme.textSecondary}
        style={{ marginTop: 8 }}
      >
        {agendaHours.map((h) => {
          const isSelected = selectedHour === h
          const horaPermitida = esInstanteEnHorarioLaboral(
            selectedDate,
            h * 60,
            businessHours,
            tz,
            holidayIndex
          )
          return (
            <Pressable
              key={h}
              style={[
                styles.employeeChip,
                { borderColor: theme.border },
                isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                !horaPermitida && { opacity: 0.35 },
              ]}
              onPress={() => {
                if (horaPermitida) onChangeHour(h)
              }}
            >
              <ThemedText style={[styles.employeeChipName, isSelected && { color: '#FFFFFF' }]}>
                {formatoHoraAgendaSlot(selectedDate, h, tz, language, timeFormat)}
              </ThemedText>
            </Pressable>
          )
        })}
      </ScrollFadeRow>

      <ScrollFadeRow
        backgroundColor={theme.backgroundDefault}
        contentContainerStyle={styles.chipsContainer}
        arrowColor={theme.textSecondary}
        style={{ marginTop: 8 }}
      >
        {MINUTOS_CHIPS.map((m) => {
          const isSelected = selectedMinute === m
          const permitido = esInstanteEnHorarioLaboral(
            selectedDate,
            selectedHour * 60 + m,
            businessHours,
            tz,
            holidayIndex
          )
          return (
            <Pressable
              key={m}
              style={[
                styles.employeeChip,
                { borderColor: theme.border },
                isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                !permitido && { opacity: 0.35 },
              ]}
              onPress={() => {
                if (permitido) onChangeMinute(m)
              }}
            >
              <ThemedText style={[styles.employeeChipName, isSelected && { color: '#FFFFFF' }]}>
                :{String(m).padStart(2, '0')}
              </ThemedText>
            </Pressable>
          )
        })}
      </ScrollFadeRow>

      {!horaMinutoPermitido ? (
        <ThemedText style={{ fontSize: 12, color: theme.error, marginTop: Spacing.sm }}>
          Esa hora está fuera de la franja configurada del negocio.
        </ThemedText>
      ) : (
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
              instanteCitaEnZona(selectedDate, selectedHour, tz, selectedMinute),
              tz,
              language,
              timeFormat
            )}
          </ThemedText>
        </View>
      )}
    </View>
  )
}
