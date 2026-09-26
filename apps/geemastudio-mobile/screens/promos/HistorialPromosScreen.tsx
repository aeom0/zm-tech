import React from 'react'
import { View, StyleSheet, FlatList, Image, Alert, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Card } from '@/components/Card'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useHaptics } from '@/hooks/useHaptics'
import { Spacing, BorderRadius } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import type { PromoBroadcast } from './types'
import { formatoInstanteEnZona } from '@zmtech/tenant-config'

function extractPromoImagePath(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  const marker = '/promo-images/'
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return imageUrl.slice(idx + marker.length)
}

export default function HistorialPromosScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const { theme } = useTheme()
  const { isAdmin } = useAuth()
  const { config } = useTenant()
  const haptics = useHaptics()

  const [items, setItems] = React.useState<PromoBroadcast[]>([])
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase
        .from('promo_broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (error) {
        console.error('[HistorialPromosScreen] Error cargando historial:', error)
        return
      }
      setItems((data ?? []) as PromoBroadcast[])
    }
    if (isAdmin) {
      load()
    }
    return () => {
      mounted = false
    }
  }, [isAdmin])

  const deleteBroadcast = async (item: PromoBroadcast) => {
    setDeletingId(item.id)
    try {
      const imagePath = extractPromoImagePath(item.image_url)
      if (imagePath) {
        const { error: storageError } = await supabase.storage.from('promo-images').remove([imagePath])
        if (storageError) {
          console.error('[HistorialPromosScreen] Error eliminando imagen de Storage:', storageError)
        }
      }
      const { error } = await supabase.from('promo_broadcasts').delete().eq('id', item.id)
      if (error) throw error
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      haptics.success()
    } catch (error) {
      console.error('[HistorialPromosScreen] Error eliminando campaña:', error)
      Alert.alert('Error', 'No se pudo eliminar la campaña. Intenta de nuevo.')
      haptics.error()
    } finally {
      setDeletingId(null)
    }
  }

  const handleDelete = (item: PromoBroadcast) => {
    Alert.alert('Eliminar campaña', `¿Eliminar "${item.title}" del historial? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteBroadcast(item),
      },
    ])
  }

  const renderStatusBadge = (status: PromoBroadcast['status']) => {
    let bg = theme.border
    let color = theme.text
    let label: string = status
    if (status === 'draft') {
      bg = theme.border
      color = theme.textSecondary
      label = 'Borrador'
    } else if (status === 'sending') {
      bg = theme.warning + '22'
      color = theme.warning
      label = 'Enviando'
    } else if (status === 'done') {
      bg = theme.success + '22'
      color = theme.success
      label = 'Enviada'
    } else if (status === 'failed') {
      bg = theme.error + '22'
      color = theme.error
      label = 'Fallida'
    }
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <ThemedText type="small" style={{ color, fontWeight: '600' }}>
          {label}
        </ThemedText>
      </View>
    )
  }

  const formatDate = (value: string | null) => {
    if (!value) return 'Sin fecha'
    return formatoInstanteEnZona(value, config.locale.timezone, config.locale.language, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {!isAdmin ? (
        <ThemedText style={{ paddingTop: headerHeight + Spacing.lg, paddingHorizontal: Spacing.lg }}>
          Solo administración puede ver el historial de campañas.
        </ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing['2xl'],
            paddingHorizontal: Spacing.lg,
          }}
          renderItem={({ item }) => (
            <Card elevation={1} style={{ marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg }}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" /> : null}
              <View style={styles.row}>
                <ThemedText style={{ fontWeight: '600', flex: 1 }}>{item.title}</ThemedText>
                {renderStatusBadge(item.status)}
                <Pressable
                  onPress={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  hitSlop={8}
                  style={{ marginLeft: Spacing.sm, opacity: deletingId === item.id ? 0.4 : 1 }}
                >
                  <Feather name="trash-2" size={18} color={theme.error} />
                </Pressable>
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {formatDate(item.sent_at ?? item.created_at)}
              </ThemedText>
              <ThemedText type="small" style={{ marginTop: Spacing.xs, color: theme.textSecondary }}>
                {item.total_sent} enviadas · {item.total_failed} fallidas
              </ThemedText>
            </Card>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
})
