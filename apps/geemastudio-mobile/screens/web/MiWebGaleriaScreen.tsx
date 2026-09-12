import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
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
import type { WebGalleryItem } from '@/types/web-landing'
import { WebAssetPicker } from '@/screens/web/components/WebAssetPicker'
import { WebField } from '@/screens/web/components/WebField'

const emptyItem = (): WebGalleryItem => ({ url: '', alt: '', category: '' })

export default function MiWebGaleriaScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data, isLoading } = useWebSettings()
  const update = useUpdateWebSettings()

  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<WebGalleryItem>(emptyItem())
  const [saving, setSaving] = useState(false)

  const tenantSlug = data?.tenantSlug || data?.slug || 'tenant'
  const items = useMemo(() => data?.gallery ?? [], [data?.gallery])

  const openNew = () => {
    setEditIndex(null)
    setDraft(emptyItem())
    setModalOpen(true)
  }

  const openEdit = (index: number) => {
    setEditIndex(index)
    setDraft({ ...items[index] })
    setModalOpen(true)
  }

  const persist = useCallback(
    async (next: WebGalleryItem[]) => {
      if (!data) return
      setSaving(true)
      try {
        await update.mutateAsync({ rowId: data.rowId, patch: { gallery: next } })
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
    if (!draft.url.trim()) {
      Alert.alert('Falta la foto', 'Sube una imagen antes de guardar.')
      return
    }
    if (!draft.alt.trim()) {
      Alert.alert('Falta el texto', 'Agrega una descripción (alt) de la foto.')
      return
    }
    const item: WebGalleryItem = {
      url: draft.url.trim(),
      alt: draft.alt.trim(),
      category: draft.category?.trim() || undefined,
    }
    const next = [...items]
    if (editIndex == null) next.push(item)
    else next[editIndex] = item
    await persist(next)
  }

  const removeItem = (index: number) => {
    const item = items[index]
    Alert.alert('Eliminar foto', '¿Sacamos esta imagen de la galería?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteWebAssetIfStorage(item.url)
            const next = items.filter((_, i) => i !== index)
            await persist(next)
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
        keyExtractor={(item, i) => `${item.url}-${i}`}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + 80,
          paddingHorizontal: Spacing.lg,
        }}
        ListEmptyComponent={
          <ThemedText style={{ color: theme.textMuted, textAlign: 'center', marginTop: Spacing['2xl'] }}>
            Todavía no hay fotos. Toca + para agregar.
          </ThemedText>
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => openEdit(index)}
            onLongPress={() => removeItem(index)}
            style={[
              styles.card,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Image source={{ uri: item.url }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: theme.text, fontWeight: '600' }} numberOfLines={2}>
                {item.alt}
              </ThemedText>
              {item.category ? (
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>{item.category}</ThemedText>
              ) : null}
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      />

      <Pressable
        onPress={openNew}
        style={[styles.fab, { backgroundColor: theme.primary }]}
        accessibilityLabel="Agregar foto"
      >
        <Feather name="plus" size={28} color="#fff" />
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: Spacing.md }}>
              {editIndex == null ? 'Nueva foto' : 'Editar foto'}
            </ThemedText>
            <WebAssetPicker
              label="Imagen"
              imageUrl={draft.url || null}
              tenantSlug={tenantSlug}
              folder="gallery"
              onUploaded={(url) => setDraft((d) => ({ ...d, url }))}
              onCleared={() => setDraft((d) => ({ ...d, url: '' }))}
            />
            <WebField label="Descripción (alt)" value={draft.alt} onChangeText={(alt) => setDraft((d) => ({ ...d, alt }))} />
            <WebField
              label="Categoría (opcional)"
              value={draft.category ?? ''}
              onChangeText={(category) => setDraft((d) => ({ ...d, category }))}
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
          </View>
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
  thumb: { width: 64, height: 64, borderRadius: BorderRadius.md },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.md },
  modalBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  modalPrimary: { borderRadius: BorderRadius.md, minWidth: 96, alignItems: 'center' },
})
