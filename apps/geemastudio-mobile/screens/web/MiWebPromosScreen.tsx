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
import type { WebPromo } from '@/types/web-landing'
import { WebAssetPicker } from '@/screens/web/components/WebAssetPicker'
import { WebField } from '@/screens/web/components/WebField'

const emptyPromo = (): WebPromo => ({
  title: '',
  description: '',
  badge: '',
  badgeColor: '',
  ctaText: '',
  whatsappMessage: '',
  imageUrl: '',
})

export default function MiWebPromosScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data, isLoading } = useWebSettings()
  const update = useUpdateWebSettings()

  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<WebPromo>(emptyPromo())
  const [saving, setSaving] = useState(false)

  const tenantSlug = data?.tenantSlug || data?.slug || 'tenant'
  const items = useMemo(() => data?.promos ?? [], [data?.promos])

  const persist = useCallback(
    async (next: WebPromo[]) => {
      if (!data) return
      setSaving(true)
      try {
        await update.mutateAsync({ rowId: data.rowId, patch: { promos: next } })
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
    if (!draft.title.trim()) {
      Alert.alert('Falta el título', 'Pon un título a la promo.')
      return
    }
    const item: WebPromo = {
      title: draft.title.trim(),
      description: draft.description?.trim() || undefined,
      badge: draft.badge?.trim() || undefined,
      badgeColor: draft.badgeColor?.trim() || undefined,
      ctaText: draft.ctaText?.trim() || undefined,
      whatsappMessage: draft.whatsappMessage?.trim() || undefined,
      imageUrl: draft.imageUrl?.trim() || undefined,
    }
    const next = [...items]
    if (editIndex == null) next.push(item)
    else next[editIndex] = item
    await persist(next)
  }

  const removeItem = (index: number) => {
    const item = items[index]
    Alert.alert('Eliminar promo', `¿Eliminar “${item.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteWebAssetIfStorage(item.imageUrl)
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
        keyExtractor={(item, i) => `${item.title}-${i}`}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + 80,
          paddingHorizontal: Spacing.lg,
        }}
        ListEmptyComponent={
          <ThemedText style={{ color: theme.textMuted, textAlign: 'center', marginTop: Spacing['2xl'] }}>
            Sin promos en la landing. Toca + para agregar.
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
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : (
              <View
                style={[
                  styles.thumb,
                  { backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <Feather name="tag" size={20} color={theme.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: theme.text, fontWeight: '600' }}>{item.title}</ThemedText>
              {item.badge ? (
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>{item.badge}</ThemedText>
              ) : null}
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => {
          setEditIndex(null)
          setDraft(emptyPromo())
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
              {editIndex == null ? 'Nueva promo' : 'Editar promo'}
            </ThemedText>
            <WebAssetPicker
              label="Imagen"
              imageUrl={draft.imageUrl || null}
              tenantSlug={tenantSlug}
              folder="promos"
              onUploaded={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
              onCleared={() => setDraft((d) => ({ ...d, imageUrl: '' }))}
            />
            <WebField label="Título" value={draft.title} onChangeText={(title) => setDraft((d) => ({ ...d, title }))} />
            <WebField
              label="Descripción"
              value={draft.description ?? ''}
              onChangeText={(description) => setDraft((d) => ({ ...d, description }))}
              multiline
            />
            <WebField label="Badge" value={draft.badge ?? ''} onChangeText={(badge) => setDraft((d) => ({ ...d, badge }))} />
            <WebField
              label="Color badge (hex)"
              value={draft.badgeColor ?? ''}
              onChangeText={(badgeColor) => setDraft((d) => ({ ...d, badgeColor }))}
              autoCapitalize="none"
            />
            <WebField
              label="Texto CTA"
              value={draft.ctaText ?? ''}
              onChangeText={(ctaText) => setDraft((d) => ({ ...d, ctaText }))}
            />
            <WebField
              label="Mensaje WhatsApp"
              value={draft.whatsappMessage ?? ''}
              onChangeText={(whatsappMessage) => setDraft((d) => ({ ...d, whatsappMessage }))}
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
  thumb: { width: 56, height: 56, borderRadius: BorderRadius.md },
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
