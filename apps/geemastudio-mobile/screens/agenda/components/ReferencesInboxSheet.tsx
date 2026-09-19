import React from 'react'
import { Modal, View, StyleSheet, Pressable, FlatList, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius } from '@/constants/theme'
import { formatoHoraInstanteEnZona, instanteCitaDesdeTexto, zonaIANASegura } from '@zmtech/tenant-config'
import type { UnreviewedReferenceAppointment } from '@/hooks/usePendingBadgeCount'

interface Props {
  visible: boolean
  appointments: UnreviewedReferenceAppointment[]
  onClose: () => void
  onSelect: (apt: UnreviewedReferenceAppointment) => void
}

/** Lista de citas con fotos de referencia por revisar (campana de Agenda). */
export function ReferencesInboxSheet({ visible, appointments, onClose, onSelect }: Props) {
  const { theme, isDark } = useTheme()
  const { config } = useTenant()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const sheetMaxH = Math.min(height * 0.55, 420)

  const timeZone = zonaIANASegura(config.locale.timezone)

  const formatSubtitle = (apt: UnreviewedReferenceAppointment): string => {
    const instante = instanteCitaDesdeTexto(apt.date, timeZone)
    const dayLabel = new Intl.DateTimeFormat(config.locale.language, {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(instante)
    const time = formatoHoraInstanteEnZona(
      instante,
      timeZone,
      config.locale.language,
      config.locale.timeFormat ?? '24'
    )
    const count = apt.reference_image_paths?.length ?? 0
    const photoLabel = count === 1 ? 'foto' : `${count} fotos`
    return `${dayLabel} · ${time} · ${photoLabel}`
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? theme.backgroundSecondary : theme.backgroundRoot,
            maxHeight: sheetMaxH,
            paddingBottom: Math.max(insets.bottom, Spacing.md),
          },
        ]}
      >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Referencias por revisar
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
            <Feather name="x" size={22} color={theme.textMuted} />
          </Pressable>
        </View>
        {appointments.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={{ color: theme.textMuted, fontSize: 14 }}>
              No hay referencias pendientes
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.row,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
                onPress={() => onSelect(item)}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${config.theme.primaryColor}18` }]}>
                  <Feather name="image" size={18} color={config.theme.primaryColor} />
                </View>
                <View style={styles.rowText}>
                  <ThemedText style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
                    {item.client_name}
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
                    {formatSubtitle(item)}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={18} color={config.theme.primaryColor} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
  },
  title: { fontSize: 17, fontWeight: '700' },
  empty: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  list: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  clientName: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12 },
})
