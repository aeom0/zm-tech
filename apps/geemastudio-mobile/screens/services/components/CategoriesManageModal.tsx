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

interface CategoriesManageModalProps {
  visible: boolean
  onClose: () => void
  categories: ServiceCategory[]
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
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
              <View key={cat.id} style={[styles.row, { borderColor: theme.border }]}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
})
