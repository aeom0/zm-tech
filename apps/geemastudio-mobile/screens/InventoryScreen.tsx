import React, { useCallback, useMemo, useState } from 'react'
import { Alert, RefreshControl, ScrollView, View } from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useHeaderHeight } from '@react-navigation/elements'
import * as Haptics from 'expo-haptics'

import { Spacing } from '@/constants/theme'
import { getDefaultInventoryCategories } from '@/constants/inventoryCategories'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InventoryAccessDenied } from './inventory/components/InventoryAccessDenied'
import { InventoryCategoryTabs } from './inventory/components/InventoryCategoryTabs'
import { InventoryEmptyState } from './inventory/components/InventoryEmptyState'
import { InventoryFab } from './inventory/components/InventoryFab'
import { InventoryItemCard } from './inventory/components/InventoryItemCard'
import { InventoryItemModal } from './inventory/components/InventoryItemModal'
import { InventoryMovementList } from './inventory/components/InventoryMovementList'
import { useInventoryCategoriesQuery } from './inventory/hooks/useInventoryCategoriesQuery'
import { useInventoryCategoryMutations } from './inventory/hooks/useInventoryCategoryMutations'
import { useInventoryMutations } from './inventory/hooks/useInventoryMutations'
import {
  useInventoryItemsQuery,
  useInventoryMovementsQuery,
} from './inventory/hooks/useInventoryQueries'
import { inventoryStyles as styles } from './inventory/inventoryStyles'
import type { InventoryCategoryOption, InventoryFormState, InventoryItem } from './inventory/types'

const defaultForm = (categoryKey: string): InventoryFormState => ({
  name: '',
  category: categoryKey,
  quantity: '0',
  minStock: '5',
  unit: 'unidad',
  cost: '',
})

export default function InventoryScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config } = useTenant()
  const currencySymbol = config.locale.currency.symbol
  const { isAdmin } = useAuth()

  const { data: customCategories = [] } = useInventoryCategoriesQuery()
  const { createMutation: createCategoryMutation, deleteMutation: deleteCategoryMutation } =
    useInventoryCategoryMutations()

  const categories = useMemo<InventoryCategoryOption[]>(() => {
    const defaults = getDefaultInventoryCategories(config.businessType).map((cat) => ({
      ...cat,
      isCustom: false,
    }))
    const custom = customCategories.map((cat) => ({
      key: cat.key,
      label: cat.label,
      isCustom: true,
      id: cat.id,
    }))
    return [...defaults, ...custom]
  }, [config.businessType, customCategories])

  const [selectedTab, setSelectedTab] = useState<string>(categories[0]?.key ?? '')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState<InventoryFormState>(() =>
    defaultForm(categories[0]?.key ?? '')
  )

  const closeModal = useCallback(() => {
    setModalVisible(false)
    setEditingItem(null)
  }, [])

  const { createMutation, updateMutation, adjustQuantityMutation, deleteMutation } =
    useInventoryMutations({ onCreateOrUpdateSuccess: closeModal })

  const { data: items = [], isLoading, refetch } = useInventoryItemsQuery()
  const { data: movements = [] } = useInventoryMovementsQuery()

  const handleAddCategory = (label: string) => {
    createCategoryMutation.mutate({ label, sortOrder: categories.length })
  }

  const handleRequestDeleteCategory = (cat: InventoryCategoryOption) => {
    Alert.alert('Eliminar categoría', `¿Eliminar "${cat.label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          if (!cat.id) return
          deleteCategoryMutation.mutate({
            id: cat.id,
            key: cat.key,
            label: cat.label,
            sort_order: 0,
          })
          if (selectedTab === cat.key) {
            setSelectedTab(categories[0]?.key ?? '')
          }
        },
      },
    ])
  }

  const openNewItem = () => {
    setEditingItem(null)
    setFormData({
      ...defaultForm(selectedTab),
      category: selectedTab,
    })
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      minStock: item.min_stock.toString(),
      unit: item.unit,
      cost: item.cost ?? '',
    })
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del producto')
      return
    }

    const data = {
      name: formData.name,
      category: formData.category,
      quantity: parseInt(formData.quantity, 10),
      min_stock: parseInt(formData.minStock, 10),
      unit: formData.unit,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (item: InventoryItem) => {
    Alert.alert('Eliminar Producto', `¿Eliminar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(item.id),
      },
    ])
  }

  const filteredItems = useMemo(
    () => items.filter((item) => item.category === selectedTab),
    [items, selectedTab]
  )

  if (!isAdmin) {
    return <InventoryAccessDenied theme={theme} />
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <InventoryCategoryTabs
        categories={categories}
        selectedTab={selectedTab}
        onSelect={setSelectedTab}
        onAddCategory={handleAddCategory}
        onRequestDeleteCategory={handleRequestDeleteCategory}
        addPending={createCategoryMutation.isPending}
        headerPaddingTop={headerHeight}
        theme={{
          primary: theme.primary,
          backgroundSecondary: theme.backgroundSecondary,
          backgroundDefault: theme.backgroundDefault,
          border: theme.border,
          text: theme.text,
          textMuted: theme.textMuted,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 70,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.violet} />
        }
      >
        {filteredItems.length === 0 && !isLoading ? (
          <InventoryEmptyState
            categoryLabel={categories.find((cat) => cat.key === selectedTab)?.label ?? ''}
            theme={theme}
          />
        ) : (
          filteredItems.map((item) => (
            <InventoryItemCard
              key={item.id}
              item={item}
              theme={theme}
              onPress={() => openEditItem(item)}
              onLongPress={() => handleDelete(item)}
              onDecrement={() => adjustQuantityMutation.mutate({ id: item.id, delta: -1 })}
              onIncrement={() => adjustQuantityMutation.mutate({ id: item.id, delta: 1 })}
            />
          ))
        )}
        <InventoryMovementList
          movements={movements}
          items={items}
          theme={{
            backgroundSecondary: theme.backgroundSecondary,
            border: theme.border,
            text: theme.text,
            textMuted: theme.textMuted,
            success: theme.success,
            error: theme.error,
          }}
        />
      </ScrollView>

      <InventoryFab onPress={openNewItem} />

      <InventoryItemModal
        visible={modalVisible}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        currencySymbol={currencySymbol}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        theme={theme}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </View>
  )
}
