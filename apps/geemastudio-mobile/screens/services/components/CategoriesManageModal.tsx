import React, { useEffect, useState } from 'react'
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing, Colors } from '@/constants/theme'

import type { ServiceCategory } from '../types'

/** Feather icons cubriendo las categorías típicas de un salón (uñas, pestañas, depilación, faciales, etc). */
const ICON_OPTIONS = [
  'scissors',
  'feather',
  'eye',
  'smile',
  'droplet',
  'sun',
  'wind',
  'heart',
  'star',
  'zap',
] as const

interface CategoriesManageModalProps {
  visible: boolean
  onClose: () => void
  categories: ServiceCategory[]
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onUpdateIcon: (id: string, icon: string) => void
  supportsIcons: boolean
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  createPending: boolean
  updatePending: boolean
  deletePending: boolean
  reorderPending: boolean
}

export function CategoriesManageModal({
  visible,
  onClose,
  categories,
  onCreate,
  onRename,
  onUpdateIcon,
  supportsIcons,
  onDelete,
  onMoveUp,
  onMoveDown,
  createPending,
  updatePending,
  deletePending,
  reorderPending,
}: CategoriesManageModalProps) {
  const { theme } = useTheme()
  const [newName, setNewName] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setDrafts(Object.fromEntries(categories.map((c) => [c.id, c.name])))
    }
  }, [visible, categories])

  const busy = createPending || updatePending || deletePending || reorderPending

  const handleRenameBlur = (id: string, original: string) => {
    const next = (drafts[id] ?? original).trim()
    if (!next || next === original) {
      return
    }
    onRename(id, next)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Categorías</ThemedText>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onClose()
              }}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
            Arranca con el orden de arriba a abajo. Usá las flechas para reordenar.
          </ThemedText>

          <View style={styles.newRow}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Nueva categoría"
              placeholderTextColor={theme.textMuted}
              value={newName}
              onChangeText={setNewName}
            />
            <Pressable
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                const n = newName.trim()
                if (!n) {
                  return
                }
                onCreate(n)
                setNewName('')
              }}
              disabled={createPending || !newName.trim()}
            >
              {createPending ? (
                <ActivityIndicator color={Colors.light.white} />
              ) : (
                <Feather name="plus" size={20} color={Colors.light.white} />
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.list}>
            {categories.map((cat, index) => (
              <View key={cat.id} style={[styles.categoryBlock, { borderColor: theme.border }]}>
                <View style={styles.row}>
                  {supportsIcons && (
                    <Pressable
                      style={[
                        styles.iconBtn,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setPickerFor((prev) => (prev === cat.id ? null : cat.id))}
                    >
                      <Feather
                        name={(cat.icon as any) || 'scissors'}
                        size={18}
                        color={theme.primary}
                      />
                    </Pressable>
                  )}
                  <TextInput
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={drafts[cat.id] ?? cat.name}
                    onChangeText={(t) => setDrafts((prev) => ({ ...prev, [cat.id]: t }))}
                    onBlur={() => handleRenameBlur(cat.id, cat.name)}
                    editable={!updatePending}
                  />
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => onMoveUp(cat.id)}
                      disabled={index === 0 || reorderPending}
                    >
                      <Feather
                        name="chevron-up"
                        size={22}
                        color={index === 0 ? theme.textMuted : theme.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => onMoveDown(cat.id)}
                      disabled={index === categories.length - 1 || reorderPending}
                    >
                      <Feather
                        name="chevron-down"
                        size={22}
                        color={index === categories.length - 1 ? theme.textMuted : theme.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Eliminar categoría',
                          `¿Seguro que querés eliminar "${cat.name}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: () => onDelete(cat.id),
                            },
                          ]
                        )
                      }}
                      disabled={deletePending}
                    >
                      <Feather name="trash-2" size={20} color={theme.error} />
                    </Pressable>
                  </View>
                </View>
                {pickerFor === cat.id && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.iconPicker}
                    contentContainerStyle={styles.iconPickerContent}
                  >
                    {ICON_OPTIONS.map((icon) => {
                      const selected = (cat.icon ?? 'scissors') === icon
                      return (
                        <Pressable
                          key={icon}
                          style={[
                            styles.iconOption,
                            {
                              backgroundColor: selected
                                ? theme.primary + '22'
                                : theme.backgroundSecondary,
                              borderColor: selected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => {
                            onUpdateIcon(cat.id, icon)
                            setPickerFor(null)
                          }}
                          disabled={updatePending}
                        >
                          <Feather
                            name={icon}
                            size={18}
                            color={selected ? theme.primary : theme.textMuted}
                          />
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                )}
              </View>
            ))}
          </ScrollView>

          {busy && (
            <ThemedText
              style={{
                textAlign: 'center',
                color: theme.textMuted,
                marginTop: 8,
              }}
            >
              Guardando…
            </ThemedText>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  newRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 420,
  },
  categoryBlock: {
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPicker: {
    marginTop: Spacing.sm,
  },
  iconPickerContent: {
    gap: 8,
    paddingRight: Spacing.lg,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
