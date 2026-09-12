import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { deleteWebAssetIfStorage } from '@/lib/webAssets'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { WebReview } from '@/types/web-landing'
import { WebAssetPicker } from '@/screens/web/components/WebAssetPicker'
import { WebField } from '@/screens/web/components/WebField'

const emptyReview = (): WebReview => ({
  author: '',
  text: '',
  role: 'Cliente',
  initial: '',
  photoUrl: '',
})

export default function MiWebResenasScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data, isLoading } = useWebSettings()
  const update = useUpdateWebSettings()

  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<WebReview>(emptyReview())
  const [saving, setSaving] = useState(false)

  const tenantSlug = data?.tenantSlug || data?.slug || 'tenant'
  const items = useMemo(() => data?.reviews ?? [], [data?.reviews])

  const persist = useCallback(
    async (next: WebReview[]) => {
      if (!data) return
      setSaving(true)
      try {
        await update.mutateAsync({ rowId: data.rowId, patch: { reviews: next } })
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
    if (!draft.author.trim() || !draft.text.trim()) {
      Alert.alert('Datos incompletos', 'Autor y texto son obligatorios.')
      return
    }
    const initial =
      draft.initial.trim() || draft.author.trim().slice(0, 1).toUpperCase()
    const item: WebReview = {
      author: draft.author.trim(),
      text: draft.text.trim(),
      role: draft.role.trim() || 'Cliente',
      initial,
      photoUrl: draft.photoUrl?.trim() || undefined,
    }
    const next = [...items]
    if (editIndex == null) next.push(item)
    else next[editIndex] = item
    await persist(next)
  }

  const removeItem = (index: number) => {
    const item = items[index]
    Alert.alert('Eliminar reseña', `¿Eliminar la de ${item.author}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteWebAssetIfStorage(item.photoUrl)
            await persist(items.filter((_, i) => i !== index))
          })()
        },
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
      <FlatList
        data={items}
        keyExtractor={(item, i) => `${item.author}-${i}`}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + 80,
          paddingHorizontal: Spacing.lg,
        }}
        ListEmptyComponent={
          <ThemedText style={{ color: theme.textMuted, textAlign: 'center', marginTop: Spacing['2xl'] }}>
            Sin reseñas. Toca + para agregar.
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
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
            ) : (
              <View
                style={[
                  styles.thumb,
                  {
                    backgroundColor: theme.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{item.initial}</ThemedText>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: theme.text, fontWeight: '600' }}>{item.author}</ThemedText>
              <ThemedText style={{ color: theme.textMuted, fontSize: 13 }} numberOfLines={2}>
                {item.text}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => {
          setEditIndex(null)
          setDraft(emptyReview())
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
              {editIndex == null ? 'Nueva reseña' : 'Editar reseña'}
            </ThemedText>
            <WebAssetPicker
              label="Foto (opcional)"
              imageUrl={draft.photoUrl || null}
              tenantSlug={tenantSlug}
              folder="reviews"
              onUploaded={(url) => setDraft((d) => ({ ...d, photoUrl: url }))}
              onCleared={() => setDraft((d) => ({ ...d, photoUrl: '' }))}
            />
            <WebField
              label="Autor"
              value={draft.author}
              onChangeText={(author) => setDraft((d) => ({ ...d, author }))}
            />
            <WebField
              label="Inicial"
              value={draft.initial}
              onChangeText={(initial) => setDraft((d) => ({ ...d, initial }))}
              placeholder="Se completa sola si la dejas vacía"
            />
            <WebField label="Rol" value={draft.role} onChangeText={(role) => setDraft((d) => ({ ...d, role }))} />
            <WebField
              label="Texto"
              value={draft.text}
              onChangeText={(text) => setDraft((d) => ({ ...d, text }))}
              multiline
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
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  thumb: { width: 48, height: 48, borderRadius: 24 },
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
