import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useUpdateWebSettings, useWebSettings } from '@/hooks/web/useWebSettings'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { WebService } from '@/types/web-landing'
import { WebField } from '@/screens/web/components/WebField'

const emptyService = (): WebService => ({
  name: '',
  description: '',
  price: '',
  duration: '',
  icon: 'Sparkles',
})

export default function MiWebServiciosScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data, isLoading } = useWebSettings()
  const update = useUpdateWebSettings()

  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<WebService>(emptyService())
  const [saving, setSaving] = useState(false)

  const items = useMemo(() => data?.services ?? [], [data?.services])

  const persist = useCallback(
    async (next: WebService[]) => {
      if (!data) return
      setSaving(true)
      try {
        await update.mutateAsync({ rowId: data.rowId, patch: { services: next } })
        setModalOpen(false)
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar')
      } finally {
        setSaving(false)
      }
    },
    [data, update]
  )

  const saveItem = async () => {
    if (!draft.name.trim() || !draft.price.trim()) {
      Alert.alert('Datos incompletos', 'Nombre y precio son obligatorios.')
      return
    }
    const item: WebService = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: draft.price.trim(),
      duration: draft.duration.trim(),
      icon: draft.icon.trim() || 'Sparkles',
    }
    const next = [...items]
    if (editIndex == null) next.push(item)
    else next[editIndex] = item
    await persist(next)
  }

  const removeItem = (index: number) => {
    Alert.alert('Eliminar servicio', `¿Sacar “${items[index].name}” de la web?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => void persist(items.filter((_, i) => i !== index)),
      },
    ])
  }

  if (isLoading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ThemedText
        style={{
          color: theme.textMuted,
          fontSize: 12,
          paddingHorizontal: Spacing.lg,
          paddingTop: headerHeight + Spacing.sm,
        }}
      >
        Lista curada para la landing (no sincroniza el catálogo del panel).
      </ThemedText>
      <FlatList
        data={items}
        keyExtractor={(item, i) => `${item.name}-${i}`}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + 80,
          paddingHorizontal: Spacing.lg,
        }}
        ListEmptyComponent={
          <ThemedText style={{ color: theme.textMuted, textAlign: 'center', marginTop: Spacing['2xl'] }}>
            Sin servicios en la web. Toca + para agregar.
          </ThemedText>
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              setEditIndex(index)
              setDraft({ ...item })
              setModalOpen(true)
            }}
            onLongPress={() => removeItem(index)}
            style={[
              styles.card,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: theme.text, fontWeight: '600' }}>{item.name}</ThemedText>
              <ThemedText style={{ color: theme.textMuted, fontSize: 13 }}>
                {item.price}
                {item.duration ? ` · ${item.duration}` : ''}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => {
          setEditIndex(null)
          setDraft(emptyService())
          setModalOpen(true)
        }}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Feather name="plus" size={28} color="#fff" />
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={[styles.modalCard, { backgroundColor: theme.backgroundRoot }]}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: Spacing.md }}>
              {editIndex == null ? 'Nuevo servicio' : 'Editar servicio'}
            </ThemedText>
            <WebField label="Nombre" value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} />
            <WebField
              label="Descripción"
              value={draft.description}
              onChangeText={(description) => setDraft((d) => ({ ...d, description }))}
              multiline
            />
            <WebField label="Precio" value={draft.price} onChangeText={(price) => setDraft((d) => ({ ...d, price }))} />
            <WebField
              label="Duración"
              value={draft.duration}
              onChangeText={(duration) => setDraft((d) => ({ ...d, duration }))}
              placeholder="45 min"
            />
            <WebField
              label="Ícono Lucide"
              value={draft.icon}
              onChangeText={(icon) => setDraft((d) => ({ ...d, icon }))}
              autoCapitalize="none"
              placeholder="Sparkles"
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.modalBtn}>
                <ThemedText style={{ color: theme.textSecondary }}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => void saveItem()}
                disabled={saving}
                style={[styles.modalBtn, styles.modalPrimary, { backgroundColor: theme.primary }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Guardar</ThemedText>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing['3xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  modalBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  modalPrimary: { borderRadius: BorderRadius.md, minWidth: 96, alignItems: 'center' },
})
