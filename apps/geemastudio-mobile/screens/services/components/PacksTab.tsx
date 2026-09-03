import React, { useCallback, useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, Shadows } from '@/constants/theme'

import { usePacksData } from '../hooks/usePacksData'
import type { PackPayload } from '../hooks/usePacksData'
import { useServicesData } from '../hooks/useServicesData'
import type { Pack } from '../types'
import { PackCard } from './PackCard'
import { PackModal } from './PackModal'

export function PacksTab() {
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config } = useTenant()

  const { services, categories } = useServicesData()
  const {
    packs,
    isLoading,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleActiveMutation,
  } = usePacksData()

  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Pack | null>(null)
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>({})

  const openNew = useCallback(() => {
    setEditing(null)
    setModalVisible(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [])

  const openEdit = useCallback((p: Pack) => {
    setEditing(p)
    setModalVisible(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const closeModal = useCallback(() => {
    setModalVisible(false)
    setEditing(null)
  }, [])

  const handleSave = useCallback(
    (payload: PackPayload) => {
      if (editing) {
        updateMutation.mutate(
          { id: editing.id, payload },
          {
            onSuccess: () => {
              closeModal()
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            },
            onError: (e: Error) => Alert.alert('Error', e.message ?? 'No se pudo guardar'),
          }
        )
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => {
            closeModal()
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          },
          onError: (e: Error) => Alert.alert('Error', e.message ?? 'No se pudo crear'),
        })
      }
    },
    [editing, updateMutation, createMutation, closeModal]
  )

  const handleDelete = useCallback(
    (p: Pack) => {
      Alert.alert('Eliminar pack', `¿Seguro que querés eliminar "${p.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(p.id),
        },
      ])
    },
    [deleteMutation]
  )

  const handleToggle = useCallback(
    async (p: Pack) => {
      if (toggleLoading[p.id]) {
        return
      }
      setToggleLoading((prev) => ({ ...prev, [p.id]: true }))
      try {
        await toggleActiveMutation.mutateAsync({
          id: p.id,
          is_active: !p.is_active,
        })
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar')
      } finally {
        setToggleLoading((prev) => {
          const n = { ...prev }
          delete n[p.id]
          return n
        })
      }
    },
    [toggleActiveMutation, toggleLoading]
  )

  const savePending = createMutation.isPending || updateMutation.isPending

  return (
    <View style={styles.flex}>
      <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
        {packs.length} pack{packs.length === 1 ? '' : 's'} disponible{packs.length === 1 ? '' : 's'}
      </ThemedText>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.emptySub, { color: theme.textMuted, marginTop: 16 }]}>
              Cargando packs…
            </ThemedText>
          </View>
        ) : isError ? (
          <View style={styles.empty}>
            <Feather name="wifi-off" size={48} color={theme.error} />
            <ThemedText style={[styles.emptyTitle, { color: theme.error }]}>
              Error de conexión
            </ThemedText>
          </View>
        ) : packs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="package" size={40} color={theme.textMuted} />
            <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              No hay packs
            </ThemedText>
            <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
              Agrupá servicios con un precio especial
            </ThemedText>
          </View>
        ) : (
          packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onPress={() => openEdit(pack)}
              onLongPress={() => handleDelete(pack)}
              onToggleActive={() => handleToggle(pack)}
              isToggling={!!toggleLoading[pack.id]}
              theme={theme}
              config={config}
            />
          ))
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: config.theme.primaryColor }, Shadows.lg]}
        onPress={openNew}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      <PackModal
        visible={modalVisible}
        onClose={closeModal}
        editing={editing}
        categories={categories}
        services={services}
        onSave={handleSave}
        savePending={savePending}
        onDelete={handleDelete}
        deletePending={deleteMutation.isPending}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  scroll: { flex: 1 },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySub: { fontSize: 14 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
