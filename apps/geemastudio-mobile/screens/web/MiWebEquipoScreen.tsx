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
import type { WebTeamMember } from '@/types/web-landing'
import { WebAssetPicker } from '@/screens/web/components/WebAssetPicker'
import { WebField } from '@/screens/web/components/WebField'

const emptyMember = (): WebTeamMember => ({
  name: '',
  role: '',
  speciality: '',
  phrase: '',
  photoUrl: '',
  color: '',
})

export default function MiWebEquipoScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { data, isLoading } = useWebSettings()
  const update = useUpdateWebSettings()

  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<WebTeamMember>(emptyMember())
  const [saving, setSaving] = useState(false)

  const tenantSlug = data?.tenantSlug || data?.slug || 'tenant'
  const items = useMemo(() => data?.team ?? [], [data?.team])

  const persist = useCallback(
    async (next: WebTeamMember[]) => {
      if (!data) return
      setSaving(true)
      try {
        await update.mutateAsync({ rowId: data.rowId, patch: { team: next } })
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
    if (!draft.name.trim() || !draft.role.trim()) {
      Alert.alert('Datos incompletos', 'Nombre y rol son obligatorios.')
      return
    }
    const item: WebTeamMember = {
      name: draft.name.trim(),
      role: draft.role.trim(),
      speciality: draft.speciality?.trim() || undefined,
      phrase: draft.phrase?.trim() || undefined,
      photoUrl: draft.photoUrl?.trim() || undefined,
      color: draft.color?.trim() || undefined,
    }
    const next = [...items]
    if (editIndex == null) next.push(item)
    else next[editIndex] = item
    await persist(next)
  }

  const removeItem = (index: number) => {
    const item = items[index]
    Alert.alert('Eliminar', `¿Sacamos a ${item.name} del equipo en la web?`, [
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
        keyExtractor={(item, i) => `${item.name}-${i}`}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + 80,
          paddingHorizontal: Spacing.lg,
        }}
        ListEmptyComponent={
          <ThemedText style={{ color: theme.textMuted, textAlign: 'center', marginTop: Spacing['2xl'] }}>
            Sin miembros en la landing. Toca + para agregar.
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
              <View style={[styles.thumb, { backgroundColor: item.color || theme.border, alignItems: 'center', justifyContent: 'center' }]}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
                  {item.name.slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: theme.text, fontWeight: '600' }}>{item.name}</ThemedText>
              <ThemedText style={{ color: theme.textMuted, fontSize: 13 }}>{item.role}</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => {
          setEditIndex(null)
          setDraft(emptyMember())
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
              {editIndex == null ? 'Nuevo miembro' : 'Editar miembro'}
            </ThemedText>
            <WebAssetPicker
              label="Foto"
              imageUrl={draft.photoUrl || null}
              tenantSlug={tenantSlug}
              folder="team"
              onUploaded={(url) => setDraft((d) => ({ ...d, photoUrl: url }))}
              onCleared={() => setDraft((d) => ({ ...d, photoUrl: '' }))}
            />
            <WebField label="Nombre" value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} />
            <WebField label="Rol" value={draft.role} onChangeText={(role) => setDraft((d) => ({ ...d, role }))} />
            <WebField
              label="Especialidad"
              value={draft.speciality ?? ''}
              onChangeText={(speciality) => setDraft((d) => ({ ...d, speciality }))}
            />
            <WebField
              label="Frase"
              value={draft.phrase ?? ''}
              onChangeText={(phrase) => setDraft((d) => ({ ...d, phrase }))}
              multiline
            />
            <WebField
              label="Color (hex, opcional)"
              value={draft.color ?? ''}
              onChangeText={(color) => setDraft((d) => ({ ...d, color }))}
              autoCapitalize="none"
              placeholder="#D4AF37"
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
  thumb: { width: 56, height: 56, borderRadius: 28 },
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
