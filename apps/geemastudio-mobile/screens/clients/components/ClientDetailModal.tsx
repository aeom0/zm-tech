import React, { useCallback, useState } from 'react'
import { View, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'
import { ClientAppointmentRow } from './ClientAppointmentRow'
import { ClientFormModal } from './ClientFormModal'
import type { ClientWithMetrics } from '../types'
import { useClientDetail } from '../hooks/useClientDetail'
import { useClientsMutations } from '../hooks/useClientsMutations'
import {
  buildTelUrl,
  buildWhatsAppUrl,
  openExternalUrl,
  reengageMessage,
} from '../utils/phoneContact'

interface Props {
  visible: boolean
  client: ClientWithMetrics | null
  onClose: () => void
  onSchedule: (client: ClientWithMetrics) => void
  onClientUpdated?: (patch: Partial<ClientWithMetrics>) => void
}

export function ClientDetailModal({
  visible,
  client,
  onClose,
  onSchedule,
  onClientUpdated,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const country = config.locale.country
  const { data, isLoading } = useClientDetail(client?.id ?? null)
  const appointments = data ?? []
  const { updateMutation } = useClientsMutations()
  const [editVisible, setEditVisible] = useState(false)

  const total_visits = appointments.length
  const total_spent = appointments.reduce((sum, a) => sum + a.total_paid, 0)
  const avg_ticket = total_visits > 0 ? total_spent / total_visits : 0

  const serviceFrequency: Record<string, number> = {}
  for (const apt of appointments) {
    for (const svc of apt.services) {
      serviceFrequency[svc.name] = (serviceFrequency[svc.name] ?? 0) + 1
    }
  }
  const [favoriteName] = Object.entries(serviceFrequency).sort((a, b) => b[1] - a[1])[0] ?? []

  const handleWhatsApp = useCallback(() => {
    if (!client) return
    void openExternalUrl(
      buildWhatsAppUrl(client.phone, country),
      'Agrega un teléfono a la ficha para escribir por WhatsApp.'
    )
  }, [client, country])

  const handleCall = useCallback(() => {
    if (!client) return
    void openExternalUrl(
      buildTelUrl(client.phone, country),
      'Agrega un teléfono a la ficha para llamar.'
    )
  }, [client, country])

  const handleReengage = useCallback(() => {
    if (!client) return
    const msg = reengageMessage(client.name, config.businessName)
    void openExternalUrl(
      buildWhatsAppUrl(client.phone, country, msg),
      'Agrega un teléfono para recontactar.'
    )
  }, [client, country, config.businessName])

  const handleSchedule = useCallback(() => {
    if (!client) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSchedule(client)
  }, [client, onSchedule])

  if (!client) return null

  const atRisk = client.is_at_risk
  const hasPhone = Boolean(client.phone?.trim())

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.content, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.header}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                  {client.name}
                </ThemedText>
                <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {client.phone?.trim() || 'Sin teléfono'}
                  {client.email?.trim() ? ` · ${client.email}` : ''}
                </ThemedText>
              </View>
              <Pressable
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
            >
              <View style={styles.actionsRow}>
                <ActionBtn
                  icon="message-circle"
                  label="WhatsApp"
                  color={theme.whatsapp}
                  onPress={handleWhatsApp}
                  disabled={!hasPhone}
                  theme={theme}
                />
                <ActionBtn
                  icon="phone"
                  label="Llamar"
                  color={theme.primary}
                  onPress={handleCall}
                  disabled={!hasPhone}
                  theme={theme}
                />
                <ActionBtn
                  icon="calendar"
                  label="Agendar"
                  color={theme.accent}
                  onPress={handleSchedule}
                  theme={theme}
                />
                <ActionBtn
                  icon="edit-2"
                  label="Editar"
                  color={theme.textSecondary}
                  onPress={() => setEditVisible(true)}
                  theme={theme}
                />
              </View>

              {atRisk && (
                <Pressable
                  style={[
                    styles.reengageBanner,
                    {
                      backgroundColor: `${theme.warning}18`,
                      borderColor: theme.warning,
                    },
                  ]}
                  onPress={handleReengage}
                  disabled={!hasPhone}
                >
                  <Feather name="alert-triangle" size={16} color={theme.warning} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.reengageTitle, { color: theme.warning }]}>
                      Cliente en riesgo
                    </ThemedText>
                    <ThemedText style={[styles.reengageSub, { color: theme.textSecondary }]}>
                      {client.days_since_last_visit != null
                        ? `Hace ${client.days_since_last_visit} días sin visita · toca para recontactar`
                        : 'Toca para escribir por WhatsApp'}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.warning} />
                </Pressable>
              )}

              {client.notes?.trim() ? (
                <View
                  style={[
                    styles.notesCard,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                  ]}
                >
                  <ThemedText style={[styles.notesLabel, { color: theme.textMuted }]}>
                    Notas
                  </ThemedText>
                  <ThemedText style={[styles.notesBody, { color: theme.text }]}>
                    {client.notes}
                  </ThemedText>
                </View>
              ) : null}

              <View
                style={[
                  styles.metricsCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textMuted }]}>
                      Visitas
                    </ThemedText>
                    <ThemedText style={[styles.metricValue, { color: theme.text }]}>
                      {isLoading ? '...' : total_visits}
                    </ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textMuted }]}>
                      Total gastado
                    </ThemedText>
                    <ThemedText style={[styles.metricValue, { color: theme.gold }]}>
                      {isLoading ? '...' : formatCurrency(total_spent, config)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textMuted }]}>
                      Ticket promedio
                    </ThemedText>
                    <ThemedText style={[styles.metricValue, { color: theme.info }]}>
                      {isLoading ? '...' : formatCurrency(avg_ticket, config)}
                    </ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText style={[styles.metricLabel, { color: theme.textMuted }]}>
                      Servicio favorito
                    </ThemedText>
                    <ThemedText
                      style={[styles.metricValue, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {isLoading ? '...' : (favoriteName ?? '—')}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                  Historial de citas
                </ThemedText>
                <ThemedText style={[styles.sectionCount, { color: theme.textSecondary }]}>
                  {appointments.length}
                </ThemedText>
              </View>

              {appointments.length === 0 && !isLoading ? (
                <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
                  Aún no hay citas registradas para esta persona.
                </ThemedText>
              ) : (
                appointments.map((apt) => <ClientAppointmentRow key={apt.id} appointment={apt} />)
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ClientFormModal
        visible={editVisible}
        mode="edit"
        initial={{
          name: client.name,
          phone: client.phone ?? '',
          email: client.email ?? '',
          notes: client.notes ?? '',
        }}
        saving={updateMutation.isPending}
        onClose={() => setEditVisible(false)}
        onSave={(payload) => {
          updateMutation.mutate(
            { id: client.id, payload },
            {
              onSuccess: () => {
                onClientUpdated?.({
                  name: payload.name.trim(),
                  phone: payload.phone.trim(),
                  email: payload.email.trim() || null,
                  notes: payload.notes.trim() || null,
                })
                setEditVisible(false)
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              },
              onError: (e: Error) => Alert.alert('Error', e.message ?? 'No se pudo guardar'),
            }
          )
        }}
      />
    </>
  )
}

function ActionBtn({
  icon,
  label,
  color,
  onPress,
  disabled,
  theme,
}: {
  icon: React.ComponentProps<typeof Feather>['name']
  label: string
  color: string
  onPress: () => void
  disabled?: boolean
  theme: { backgroundSecondary: string; border: string; textMuted: string }
}) {
  return (
    <Pressable
      style={[
        styles.actionBtn,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}22` }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <ThemedText style={[styles.actionLabel, { color: disabled ? theme.textMuted : color }]}>
        {label}
      </ThemedText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  reengageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  reengageTitle: { fontSize: 13, fontWeight: '700' },
  reengageSub: { fontSize: 12, marginTop: 2 },
  notesCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  notesLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  notesBody: { fontSize: 14, lineHeight: 20 },
  metricsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    marginBottom: Spacing.xl,
  },
})
