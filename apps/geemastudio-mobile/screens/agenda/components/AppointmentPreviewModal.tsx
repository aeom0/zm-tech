import React from 'react'
import { View, Modal, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing, BorderRadius } from '@/constants/theme'

import type { TenantConfig, TimeFormatPreference } from '@zmtech/tenant-config'
import { instanteCitaDesdeTexto, zonaIANASegura } from '@zmtech/tenant-config'

import type { AgendaAppointment, AgendaEmployee, AgendaService } from '../types'
import { getEmployeeColor, getEmployeeFirstName, getServiceName } from '../agendaUtils'
import { agendaStyles as styles } from '../agendaStyles'

type Theme = {
  backgroundDefault: string
  backgroundSecondary: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  primary: string
  success: string
  warning: string
  error: string
}

interface AppointmentPreviewModalProps {
  visible: boolean
  onClose: () => void
  onOpenEdit: () => void
  isTablet: boolean
  theme: Theme
  appointment: AgendaAppointment | null
  employees: AgendaEmployee[]
  services: AgendaService[]
  timeZone: string
  language: TenantConfig['locale']['language']
  timeFormat: TimeFormatPreference
  currencySymbol: string
}

function descripcionEstado(status: string): { label: string; tone: 'ok' | 'wait' | 'muted' } {
  if (status === 'payment_submitted') return { label: 'Pendiente de validación', tone: 'wait' }
  if (status === 'cancelled') return { label: 'Cancelada', tone: 'muted' }
  if (status === 'no_show') return { label: 'Ausencia', tone: 'muted' }
  if (status === 'completed') return { label: 'Completada', tone: 'ok' }
  return { label: 'Confirmada', tone: 'ok' }
}

export function AppointmentPreviewModal({
  visible,
  onClose,
  onOpenEdit,
  isTablet,
  theme,
  appointment,
  employees,
  services,
  timeZone,
  language,
  timeFormat,
  currencySymbol,
}: AppointmentPreviewModalProps) {
  if (!appointment) return null

  const empColor = getEmployeeColor(employees, appointment.employee_id)
  const empName = getEmployeeFirstName(employees, appointment.employee_id) || 'Sin asignar'
  const serviceName = getServiceName(services, appointment.service_id)
  const { label: estadoLabel, tone } = descripcionEstado(appointment.status)
  const accentColor =
    tone === 'ok' ? theme.success : tone === 'wait' ? theme.warning : theme.textMuted
  const priceNum = parseFloat(appointment.price)

  const fechaLabel = new Intl.DateTimeFormat(language, {
    timeZone: zonaIANASegura(timeZone),
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12',
  }).format(instanteCitaDesdeTexto(appointment.date, timeZone))

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, styles.modalOverlayTablet]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Pressable
          onPress={onOpenEdit}
          style={[
            styles.modalContent,
            styles.modalContentTablet,
            {
              backgroundColor: theme.backgroundDefault,
              width: isTablet ? 420 : '85%',
              maxHeight: undefined,
              paddingBottom: Spacing.xl,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: empColor }} />
              <ThemedText style={[styles.modalTitle, { fontSize: 18 }]}>{empName}</ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedText style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>
            {appointment.client_name}
          </ThemedText>
          {appointment.client_phone ? (
            <ThemedText style={{ fontSize: 14, color: theme.textSecondary, marginTop: 2 }}>
              {appointment.client_phone}
            </ThemedText>
          ) : null}

          <View
            style={{
              marginTop: Spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
            }}
          >
            <Feather name="scissors" size={16} color={theme.textMuted} />
            <ThemedText style={{ fontSize: 15, color: theme.text, flex: 1 }} numberOfLines={1}>
              {serviceName || '—'}
            </ThemedText>
          </View>
          <View
            style={{
              marginTop: Spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
            }}
          >
            <Feather name="calendar" size={16} color={theme.textMuted} />
            <ThemedText style={{ fontSize: 14, color: theme.textSecondary, flex: 1 }}>
              {fechaLabel}
            </ThemedText>
          </View>

          <View
            style={{
              marginTop: Spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                paddingHorizontal: Spacing.sm,
                paddingVertical: 4,
                borderRadius: BorderRadius.full,
                backgroundColor: accentColor + '20',
              }}
            >
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: accentColor }}>
                {estadoLabel}
              </ThemedText>
            </View>
            {Number.isFinite(priceNum) && priceNum > 0 && (
              <ThemedText style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                {currencySymbol} {priceNum.toFixed(2)}
              </ThemedText>
            )}
          </View>

          <View
            style={{
              marginTop: Spacing.xl,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xs,
            }}
          >
            <Feather name="edit-2" size={13} color={theme.textMuted} />
            <ThemedText style={{ fontSize: 12, color: theme.textMuted }}>
              Toca la tarjeta para editar
            </ThemedText>
          </View>
        </Pressable>
      </View>
    </Modal>
  )
}
