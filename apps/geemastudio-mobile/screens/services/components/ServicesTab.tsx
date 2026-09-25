import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'
import { CategoryIcon } from '@/components/CategoryIcon'

import { useServicesData } from '../hooks/useServicesData'
import type { ServicePayload } from '../hooks/useServicesData'
import type { Service as ServiceRow } from '../types'
import { ServiceCard } from './ServiceCard'
import { ServiceModal } from './ServiceModal'
import { CategoriesManageModal } from './CategoriesManageModal'
import { ReorderServicesModal } from './ReorderServicesModal'

function servicesSignature(list: ServiceRow[]): string {
  return list.map((s) => `${s.id}:${s.sort_order}:${s.is_active}:${s.price}:${s.name}`).join('|')
}

export function ServicesTab() {
  const tabBarHeight = useBottomTabBarHeight()
  const { theme, shadows } = useTheme()
  const { config } = useTenant()
  const { isAdmin } = useAuth()

  const {
    services,
    categories,
    isLoading,
    isFetching,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleActiveMutation,
    createCategoryMutation,
    updateCategoryMutation,
    updateCategoryIconMutation,
    supportsCategoryIcons,
    deleteCategoryMutation,
    reorderCategoriesMutation,
    reorderServicesMutation,
  } = useServicesData()

  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<ServiceRow | null>(null)
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false)
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>({})

  const [localServices, setLocalServices] = useState<ServiceRow[]>(services)
  // Solo spinner a pantalla completa en la primera carga (sin cache).
  const showInitialLoader = isLoading && services.length === 0 && categories.length === 0
  const [reorderCategoryId, setReorderCategoryId] = useState<string | null>(null)

  React.useEffect(() => {
    // Evita parpadeo: no reemplazar estado local si el contenido es el mismo
    // (refetch de TanStack crea arrays/objetos nuevos aunque los datos no cambien).
    setLocalServices((prev) =>
      servicesSignature(prev) === servicesSignature(services) ? prev : services
    )
  }, [services])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const groupedServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const groups = categories.map((category) => {
      const inCategory = localServices.filter(
        (s) => s.category_id === category.id && (!query || s.name.toLowerCase().includes(query))
      )
      return { ...category, services: inCategory }
    })
    if (filterCategoryId) {
      return groups.filter((g) => g.id === filterCategoryId)
    }
    return groups
  }, [categories, localServices, filterCategoryId, searchQuery])

  const reorderCategory = useMemo(
    () => categories.find((c) => c.id === reorderCategoryId) ?? null,
    [categories, reorderCategoryId]
  )
  const reorderList = useMemo(() => {
    if (!reorderCategoryId) return []
    return localServices.filter((s) => s.category_id === reorderCategoryId)
  }, [localServices, reorderCategoryId])

  const handleReorderSave = useCallback(
    (orderedIds: string[]) => {
      setLocalServices((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]))
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((s): s is ServiceRow => !!s)
        const others = prev.filter((s) => s.category_id !== reorderCategoryId)
        return [...others, ...reordered]
      })
      reorderServicesMutation.mutate(orderedIds, {
        onSuccess: () => {
          setReorderCategoryId(null)
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
        onError: (e: Error) => Alert.alert('Error', e.message ?? 'No se pudo guardar el orden'),
      })
    },
    [reorderCategoryId, reorderServicesMutation]
  )

  const openNew = useCallback(() => {
    setEditing(null)
    setModalVisible(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [])

  const openEdit = useCallback((s: ServiceRow) => {
    setEditing(s)
    setModalVisible(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const closeModal = useCallback(() => {
    setModalVisible(false)
    setEditing(null)
  }, [])

  const handleSave = useCallback(
    (payload: ServicePayload) => {
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
    (s: ServiceRow) => {
      Alert.alert('Eliminar servicio', `¿Seguro que quieres eliminar "${s.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(s.id),
        },
      ])
    },
    [deleteMutation]
  )

  const handleToggle = useCallback(
    async (s: ServiceRow) => {
      if (toggleLoading[s.id]) {
        return
      }
      setToggleLoading((prev) => ({ ...prev, [s.id]: true }))
      try {
        await toggleActiveMutation.mutateAsync({
          id: s.id,
          is_active: !s.is_active,
        })
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar')
      } finally {
        setToggleLoading((prev) => {
          const n = { ...prev }
          delete n[s.id]
          return n
        })
      }
    },
    [toggleActiveMutation, toggleLoading]
  )

  const orderedCategoryIds = useMemo(() => categories.map((c) => c.id), [categories])

  const moveCategory = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = orderedCategoryIds.indexOf(id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= orderedCategoryIds.length) {
        return
      }
      const next = [...orderedCategoryIds]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      reorderCategoriesMutation.mutate(next)
    },
    [orderedCategoryIds, reorderCategoriesMutation]
  )

  const savePending = createMutation.isPending || updateMutation.isPending

  return (
    <View style={styles.flex}>
      <View style={styles.subtitleRow}>
        {searchOpen ? (
          <View
            style={[
              styles.searchRow,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
            ]}
          >
            <Feather name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar servicio…"
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <Pressable
              onPress={() => {
                setSearchOpen(false)
                setSearchQuery('')
              }}
              hitSlop={8}
            >
              <Feather name="x" size={16} color={theme.textMuted} />
            </Pressable>
          </View>
        ) : (
          <>
            <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
              {services.length} servicio{services.length === 1 ? '' : 's'} · {categories.length}{' '}
              categoría{categories.length === 1 ? '' : 's'}
            </ThemedText>
            <Pressable
              style={[styles.searchIconBtn, { borderColor: theme.border }]}
              onPress={() => setSearchOpen(true)}
              hitSlop={8}
              accessibilityLabel="Buscar servicio"
            >
              <Feather name="search" size={16} color={theme.text} />
            </Pressable>
          </>
        )}
      </View>

      <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>Categorías</ThemedText>

      <View style={styles.filterBar}>
        <ScrollFadeRow
          backgroundColor={theme.backgroundRoot}
          arrowColor={theme.textSecondary}
          contentContainerStyle={styles.filterChips}
          style={styles.filterScroll}
        >
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: theme.border },
              !filterCategoryId && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setFilterCategoryId(null)}
          >
            <ThemedText
              style={[styles.filterChipText, { color: !filterCategoryId ? Colors.light.buttonText : theme.text }]}
            >
              Todas
            </ThemedText>
          </Pressable>
          {categories.map((cat) => {
            const isSelected = filterCategoryId === cat.id
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.filterChip,
                  { borderColor: theme.border },
                  isSelected && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setFilterCategoryId(cat.id)}
              >
                <ThemedText
                  style={[styles.filterChipText, { color: isSelected ? Colors.light.buttonText : theme.text }]}
                >
                  {cat.name}
                </ThemedText>
              </Pressable>
            )
          })}
        </ScrollFadeRow>
        {isAdmin && (
          <Pressable
            style={[styles.manageIconBtn, { borderColor: theme.border }]}
            onPress={() => {
              setCategoriesModalVisible(true)
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }}
            hitSlop={8}
            accessibilityLabel="Gestionar categorías"
          >
            <Feather name="edit-2" size={16} color={theme.primary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !showInitialLoader}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {showInitialLoader ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.emptySub, { color: theme.textMuted, marginTop: 16 }]}>
              Cargando servicios…
            </ThemedText>
          </View>
        ) : isError && services.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="wifi-off" size={48} color={theme.error} />
            <ThemedText style={[styles.emptyTitle, { color: theme.error }]}>
              Error de conexión
            </ThemedText>
            <ThemedText style={[styles.emptySub, { color: theme.textMuted, textAlign: 'center' }]}>
              Desliza hacia abajo para reintentar.
            </ThemedText>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <CategoryIcon
                businessType={config.businessType}
                size={28}
                color={theme.textMuted}
              />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              No hay servicios
            </ThemedText>
            <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
              Toca + para agregar el primero
            </ThemedText>
          </View>
        ) : groupedServices.every((g) => g.services.length === 0) ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="search" size={28} color={theme.textMuted} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              Sin resultados
            </ThemedText>
            <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
              Prueba con otro nombre o categoría
            </ThemedText>
          </View>
        ) : (
          groupedServices.map(
            (category) =>
              category.services.length > 0 && (
                <View key={category.id} style={styles.section}>
                  <View style={styles.catTitleRow}>
                    <ThemedText
                      style={[styles.catTitle, { color: category.color ?? theme.primary }]}
                    >
                      {category.name}
                    </ThemedText>
                    <View style={styles.catActions}>
                      <ThemedText style={[styles.catCount, { color: theme.textMuted }]}>
                        {category.services.length} servicio
                        {category.services.length === 1 ? '' : 's'}
                      </ThemedText>
                      {isAdmin && category.services.length > 1 && (
                        <Pressable
                          onPress={() => {
                            setReorderCategoryId(category.id)
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          }}
                          hitSlop={8}
                          style={[styles.reorderBtn, { borderColor: theme.border }]}
                          accessibilityLabel={`Reordenar ${category.name}`}
                        >
                          <Feather name="menu" size={14} color={theme.textSecondary} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                  {category.services.map((svc) => (
                    <ServiceCard
                      key={svc.id}
                      service={svc}
                      categoryColor={category.color}
                      categoryIcon={category.icon}
                      onPress={() => openEdit(svc)}
                      onLongPress={() => handleDelete(svc)}
                      onToggleActive={() => handleToggle(svc)}
                      isToggling={!!toggleLoading[svc.id]}
                      theme={theme}
                      config={config}
                    />
                  ))}
                </View>
              )
          )
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary }, shadows.lg]}
        onPress={openNew}
      >
        <Feather name="plus" size={24} color={theme.buttonText} />
      </Pressable>

      <ServiceModal
        visible={modalVisible}
        onClose={closeModal}
        editing={editing}
        categories={categories}
        onSave={handleSave}
        savePending={savePending}
        onDelete={handleDelete}
        deletePending={deleteMutation.isPending}
      />

      <ReorderServicesModal
        visible={!!reorderCategoryId}
        categoryName={reorderCategory?.name ?? ''}
        services={reorderList}
        saving={reorderServicesMutation.isPending}
        onClose={() => setReorderCategoryId(null)}
        onSave={handleReorderSave}
      />

      <CategoriesManageModal
        visible={categoriesModalVisible}
        onClose={() => setCategoriesModalVisible(false)}
        categories={categories}
        onCreate={(name) => createCategoryMutation.mutate(name)}
        onRename={(id, name) => updateCategoryMutation.mutate({ id, name })}
        onUpdateIcon={(id, icon) => updateCategoryIconMutation.mutate({ id, icon })}
        supportsIcons={supportsCategoryIcons}
        businessType={config.businessType}
        onDelete={(id) => deleteCategoryMutation.mutate(id)}
        onMoveUp={(id) => moveCategory(id, -1)}
        onMoveDown={(id) => moveCategory(id, 1)}
        createPending={createCategoryMutation.isPending}
        updatePending={updateCategoryMutation.isPending || updateCategoryIconMutation.isPending}
        deletePending={deleteCategoryMutation.isPending}
        reorderPending={reorderCategoriesMutation.isPending}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    height: 36,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchIconBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterScroll: {
    flex: 1,
  },
  filterChips: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  manageIconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: '#E5E7EB40',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: { fontSize: 14 },
  section: { marginBottom: Spacing.xl },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  catTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  catActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  catCount: {
    fontSize: 13,
  },
  reorderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
