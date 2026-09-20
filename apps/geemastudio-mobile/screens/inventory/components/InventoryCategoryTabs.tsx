import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'

import type { InventoryCategoryOption } from '../types'
import { inventoryStyles as styles } from '../inventoryStyles'

interface InventoryCategoryTabsProps {
  categories: InventoryCategoryOption[]
  selectedTab: string
  onSelect: (cat: string) => void
  onAddCategory: (label: string) => void
  onRequestDeleteCategory: (cat: InventoryCategoryOption) => void
  addPending: boolean
  headerPaddingTop: number
  theme: {
    primary: string
    backgroundSecondary: string
    backgroundDefault: string
    border: string
    text: string
    textMuted: string
  }
}

export function InventoryCategoryTabs({
  categories,
  selectedTab,
  onSelect,
  onAddCategory,
  onRequestDeleteCategory,
  addPending,
  headerPaddingTop,
  theme,
}: InventoryCategoryTabsProps) {
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [newLabel, setNewLabel] = useState('')

  const handleConfirmAdd = () => {
    const label = newLabel.trim()
    if (!label) return
    onAddCategory(label)
    setNewLabel('')
    setAddModalVisible(false)
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[
          styles.tabBar,
          { paddingTop: headerPaddingTop + Spacing.sm, alignItems: 'center' },
        ]}
      >
        {categories.map((cat) => (
          <Pressable
            key={cat.key}
            style={[
              styles.tab,
              {
                flex: undefined,
                paddingHorizontal: Spacing.lg,
                backgroundColor:
                  selectedTab === cat.key ? theme.primary : theme.backgroundSecondary,
              },
            ]}
            onPress={() => {
              onSelect(cat.key)
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }}
            onLongPress={() => {
              if (!cat.isCustom) return
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              onRequestDeleteCategory(cat)
            }}
          >
            <ThemedText
              style={[styles.tabText, { color: selectedTab === cat.key ? Colors.light.buttonText : theme.text }]}
            >
              {cat.label}
            </ThemedText>
          </Pressable>
        ))}
        <Pressable
          style={[
            styles.tab,
            {
              flex: undefined,
              width: 36,
              backgroundColor: theme.backgroundSecondary,
            },
          ]}
          onPress={() => setAddModalVisible(true)}
        >
          <Feather name="plus" size={16} color={theme.text} />
        </Pressable>
      </ScrollView>

      <Modal visible={addModalVisible} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.light.overlay,
            justifyContent: 'center',
            padding: Spacing.xl,
          }}
        >
          <View
            style={{
              backgroundColor: theme.backgroundDefault,
              borderRadius: BorderRadius.lg,
              padding: Spacing.lg,
              gap: Spacing.md,
            }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
              Nueva categoría
            </ThemedText>
            <TextInput
              autoFocus
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="Ej. Barba y Afeitado"
              placeholderTextColor={theme.textMuted}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: BorderRadius.sm,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                color: theme.text,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg }}>
              <Pressable
                onPress={() => {
                  setAddModalVisible(false)
                  setNewLabel('')
                }}
              >
                <ThemedText style={{ color: theme.textMuted }}>Cancelar</ThemedText>
              </Pressable>
              <Pressable onPress={handleConfirmAdd} disabled={addPending || !newLabel.trim()}>
                <ThemedText
                  style={{
                    color: theme.primary,
                    fontWeight: '600',
                    opacity: addPending || !newLabel.trim() ? 0.5 : 1,
                  }}
                >
                  Crear
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}
