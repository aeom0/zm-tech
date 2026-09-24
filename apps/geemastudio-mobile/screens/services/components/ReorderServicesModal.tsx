import React, { useEffect, useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'
import type { Service as ServiceRow } from '../types'

interface Props {
  visible: boolean
  categoryName: string
  services: ServiceRow[]
  saving: boolean
  onClose: () => void
  onSave: (orderedIds: string[]) => void
}

/**
 * Reordenar en modal aislado (un solo DraggableFlatList).
 * Evita NestableScrollContainer + N listas anidadas, que congelan el scroll
 * de la tab Servicios tras pull-to-refresh.
 */
export function ReorderServicesModal({
  visible,
  categoryName,
  services,
  saving,
  onClose,
  onSave,
}: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const [data, setData] = useState(services)

  useEffect(() => {
    if (visible) setData(services)
  }, [visible, services])

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.title, { color: theme.text }]}>Reordenar</ThemedText>
              <ThemedText style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                {categoryName}
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
            Mantén presionado el ícono y arrastra para cambiar el orden.
          </ThemedText>

          <DraggableFlatList
            data={data}
            keyExtractor={(item) => item.id}
            onDragBegin={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            }}
            onDragEnd={({ data: next }) => setData(next)}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
            renderItem={({ item, drag, isActive }: RenderItemParams<ServiceRow>) => (
              <ScaleDecorator>
                <Pressable
                  onLongPress={drag}
                  disabled={isActive}
                  style={[
                    styles.row,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                      opacity: isActive ? 0.9 : item.is_active ? 1 : 0.65,
                    },
                  ]}
                >
                  <Feather name="menu" size={20} color={theme.textMuted} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    {!item.is_active && (
                      <ThemedText style={[styles.inactive, { color: theme.textMuted }]}>
                        Inactivo
                      </ThemedText>
                    )}
                  </View>
                  <MaterialCommunityIcons name="drag-vertical" size={22} color={theme.textMuted} />
                </Pressable>
              </ScaleDecorator>
            )}
          />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
            disabled={saving}
            onPress={() => onSave(data.map((s) => s.id))}
          >
            {saving ? (
              <ActivityIndicator color={Colors.light.buttonText} />
            ) : (
              <ThemedText style={styles.saveText}>Guardar orden</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    maxHeight: '88%',
    minHeight: '55%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 12, marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowName: { fontSize: 15, fontWeight: '600' },
  inactive: { fontSize: 11, marginTop: 2 },
  saveBtn: {
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: Spacing.sm,
  },
  saveText: {
    color: Colors.light.buttonText,
    fontSize: 15,
    fontWeight: '700',
  },
})
