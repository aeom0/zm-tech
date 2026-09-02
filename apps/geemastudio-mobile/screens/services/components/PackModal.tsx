import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { BorderRadius, Spacing, Colors } from '@/constants/theme'

import type { Pack, Service, ServiceCategory } from '../types'
import type { PackPayload } from '../hooks/usePacksData'

const BADGE_PRESETS = ['✨', '💅', '👑', '🪷', '👁️', '💜', '🌟', '💝', '🎁']

interface PackModalProps {
  visible: boolean
  onClose: () => void
  editing: Pack | null
  categories: ServiceCategory[]
  services: Service[]
  onSave: (payload: PackPayload) => void
  savePending: boolean
  onDelete: (p: Pack) => void
  deletePending: boolean
}

export function PackModal({
  visible,
  onClose,
  editing,
  categories,
  services,
  onSave,
  savePending,
  onDelete,
  deletePending,
}: PackModalProps) {
  const { theme } = useTheme()
  const { config } = useTenant()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isActive, setIsActive] = useState(true)
  const [badge, setBadge] = useState('✨')

  useEffect(() => {
    if (!visible) {
      return
    }
    if (editing) {
      setName(editing.name)
      setDescription(editing.description ?? '')
      setPrice(editing.price)
      setSelected(new Set(editing.service_ids ?? []))
      setIsActive(editing.is_active)
      setBadge(editing.badge?.trim() || '✨')
    } else {
      setName('')
      setDescription('')
      setPrice('')
      setSelected(new Set())
      setIsActive(true)
      setBadge('✨')
    }
  }, [visible, editing])

  const grouped = useMemo(() => {
    return categories.map((cat) => ({
      category: cat,
      services: services.filter((s) => s.category_id === cat.id),
    }))
  }, [categories, services])

  const toggleId = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const inferCategoryId = (): string | null => {
    for (const serviceId of selected) {
      const svc = services.find((s) => s.id === serviceId)
      if (svc?.category_id) {
        return svc.category_id
      }
    }
    if (editing?.category_id && categories.some((c) => c.id === editing.category_id)) {
      return editing.category_id
    }
    return null
  }

  const handleSubmit = () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Faltan datos', 'Nombre y precio son obligatorios.')
      return
    }
    if (selected.size === 0) {
      Alert.alert('Servicios', 'Selecciona al menos un servicio para el pack.')
      return
    }
    const payload: PackPayload = {
      name: name.trim(),
      description: description.trim() || null,
      price,
      service_ids: Array.from(selected),
      is_active: isActive,
      category_id: inferCategoryId(),
      badge: badge.trim() || null,
    }
    onSave(payload)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{editing ? 'Editar pack' : 'Nuevo pack'}</ThemedText>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onClose()
              }}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Nombre</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Nombre del pack"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Descripción (opcional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Breve descripción"
              placeholderTextColor={theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              {`Precio (${config.locale.currency.symbol})`}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="0,00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Emoji</ThemedText>
            <ScrollFadeRow
              backgroundColor={theme.backgroundDefault}
              arrowColor={theme.textSecondary}
              style={styles.presets}
            >
              {BADGE_PRESETS.map((em) => (
                <Pressable
                  key={em}
                  style={[
                    styles.presetChip,
                    {
                      borderColor: theme.border,
                      backgroundColor: badge === em ? theme.primary + '22' : 'transparent',
                    },
                  ]}
                  onPress={() => setBadge(em)}
                >
                  <ThemedText style={{ fontSize: 22 }}>{em}</ThemedText>
                </Pressable>
              ))}
            </ScrollFadeRow>

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Servicios incluidos
            </ThemedText>
            {grouped.map(
              (g) =>
                g.services.length > 0 && (
                  <View key={g.category.id} style={styles.group}>
                    <ThemedText style={[styles.groupTitle, { color: theme.primary }]}>
                      {g.category.name}
                    </ThemedText>
                    {g.services.map((svc) => {
                      const on = selected.has(svc.id)
                      return (
                        <Pressable
                          key={svc.id}
                          style={[styles.checkRow, { borderColor: theme.border }]}
                          onPress={() => toggleId(svc.id)}
                        >
                          <Feather
                            name={on ? 'check-square' : 'square'}
                            size={22}
                            color={on ? theme.primary : theme.textMuted}
                          />
                          <ThemedText style={styles.checkLabel}>{svc.name}</ThemedText>
                        </Pressable>
                      )
                    })}
                  </View>
                )
            )}

            <View style={styles.switchRow}>
              <ThemedText style={{ color: theme.text }}>Pack activo</ThemedText>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: theme.border, true: theme.primary + '99' }}
                thumbColor={isActive ? theme.primary : theme.textMuted}
              />
            </View>

            {editing && (
              <Pressable
                style={[styles.deleteBtn, { borderColor: theme.error }]}
                onPress={() => {
                  onClose()
                  onDelete(editing)
                }}
                disabled={deletePending}
              >
                <Feather name="trash-2" size={18} color={theme.error} />
                <ThemedText style={{ color: theme.error, fontWeight: '600' }}>
                  Eliminar pack
                </ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[styles.submit, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={savePending}
            >
              {savePending ? (
                <ActivityIndicator color={Colors.light.white} />
              ) : (
                <ThemedText style={styles.submitText}>
                  {editing ? 'Guardar' : 'Crear pack'}
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
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
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    minHeight: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  presets: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  presetChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  group: {
    marginBottom: Spacing.md,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  checkLabel: {
    fontSize: 15,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  submit: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  submitText: {
    color: Colors.light.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
