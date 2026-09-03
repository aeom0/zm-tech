import React from 'react'
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import type { TenantConfig } from '@zmtech/tenant-config'
import { formatCurrency } from '@/utils/format'
import { BorderRadius, Shadows, Spacing } from '@/constants/theme'

import type { Promo } from '../types'

interface PromoCardProps {
  promo: Promo
  onPress: () => void
  onLongPress?: () => void
  onToggleActive?: () => void
  isToggling?: boolean
  theme: {
    backgroundDefault: string
    border: string
    text: string
    textMuted: string
    primary: string
    accent: string
    success: string
    error: string
  }
  config: TenantConfig
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function withAlpha(color: string, alpha: string): string {
  return HEX_COLOR.test(color) ? color + alpha : color
}

function formatExpires(iso: string | null): string {
  if (!iso) {
    return 'Sin vencimiento'
  }
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function PromoCardImpl({
  promo,
  onPress,
  onLongPress,
  onToggleActive,
  isToggling,
  theme,
  config,
}: PromoCardProps) {
  const raw = promo.promo_price
  const n = raw != null ? parseFloat(raw) : NaN
  const amount = Number.isFinite(n) ? n : 0
  const badge = (promo.badge ?? '').trim() || 'PROMO'
  const rawAccent = promo.accent_color?.trim()
  const accent = rawAccent && HEX_COLOR.test(rawAccent) ? rawAccent : theme.primary

  let daysLeft: number | null = null
  if (promo.expires_at) {
    const diff = new Date(promo.expires_at).getTime() - Date.now()
    daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
  const expiringSoon = daysLeft !== null && daysLeft <= 7

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: promo.is_active ? 1 : 0.65,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.mainPress, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View
          style={[
            styles.badgePill,
            { backgroundColor: withAlpha(accent, '22'), borderColor: withAlpha(accent, '55') },
          ]}
        >
          <ThemedText style={[styles.badgeText, { color: accent }]} numberOfLines={1}>
            {badge}
          </ThemedText>
        </View>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {promo.title}
            </ThemedText>
            <ThemedText style={[styles.expires, { color: theme.textMuted }]}>
              <Feather name="calendar" size={11} color={theme.textMuted} />{' '}
              {formatExpires(promo.expires_at)}
            </ThemedText>
          </View>
          <View style={styles.priceCol}>
            <ThemedText style={[styles.promoPrice, { color: theme.accent }]} numberOfLines={1}>
              {formatCurrency(amount, config)}
            </ThemedText>
            <ThemedText
              style={[
                styles.statusPill,
                {
                  color: promo.is_active ? theme.success : theme.error,
                },
              ]}
            >
              {promo.is_active ? 'Activa' : 'Inactiva'}
            </ThemedText>
          </View>
        </View>
        {expiringSoon && (
          <View style={styles.expiryRow}>
            <Feather
              name="clock"
              size={12}
              color={daysLeft !== null && daysLeft <= 2 ? theme.error : theme.textMuted}
            />
            <ThemedText
              style={[
                styles.expiryText,
                { color: daysLeft !== null && daysLeft <= 2 ? theme.error : theme.textMuted },
              ]}
            >
              {daysLeft !== null && daysLeft <= 0
                ? 'Vence hoy'
                : `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
            </ThemedText>
          </View>
        )}
      </Pressable>
      {onToggleActive && (
        <Pressable style={styles.toggleRow} onPress={onToggleActive} disabled={isToggling}>
          <ThemedText style={[styles.toggleLabel, { color: theme.textMuted }]}>Activo</ThemedText>
          {isToggling ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather
              name={promo.is_active ? 'toggle-right' : 'toggle-left'}
              size={28}
              color={promo.is_active ? theme.primary : theme.textMuted}
            />
          )}
        </Pressable>
      )}
    </View>
  )
}

export const PromoCard = React.memo(PromoCardImpl, (prev, next) => {
  return (
    prev.promo === next.promo &&
    prev.isToggling === next.isToggling &&
    prev.theme === next.theme &&
    prev.config === next.config
  )
})

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 8,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  mainPress: {
    padding: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badgePill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  expires: {
    fontSize: 12,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  promoPrice: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: '600',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  toggleLabel: {
    fontSize: 13,
  },
})
