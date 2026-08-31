import React from 'react'
import { Pressable, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'

import { DashboardAnimatedView, type DashboardAnimatedStyle } from '../hooks/useStaggeredAnimation'
import { dashboardStyles as styles } from '../dashboardStyles'

interface DashboardQuickLinksCardProps {
  theme: {
    backgroundDefault: string
    border: string
    primary: string
    gold: string
    text: string
    textSecondary: string
    textMuted: string
  }
  animatedStyle?: DashboardAnimatedStyle
  onOpenClients: () => void
  onOpenFinances: () => void
}

export function DashboardQuickLinksCard({
  theme,
  animatedStyle,
  onOpenClients,
  onOpenFinances,
}: DashboardQuickLinksCardProps) {
  return (
    <DashboardAnimatedView
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <Pressable style={styles.quickLinkRow} onPress={onOpenClients}>
        <View style={[styles.quickLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
          <Feather name="users" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.quickLinkTitle, { color: theme.text }]}>Clientes</ThemedText>
          <ThemedText style={[styles.quickLinkSub, { color: theme.textSecondary }]}>
            Historial, notas y segmentos
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={16} color={theme.textMuted} />
      </Pressable>
      <Pressable
        style={[styles.quickLinkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
        onPress={onOpenFinances}
      >
        <View style={[styles.quickLinkIcon, { backgroundColor: `${theme.gold}15` }]}>
          <Feather name="trending-up" size={20} color={theme.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.quickLinkTitle, { color: theme.text }]}>Finanzas</ThemedText>
          <ThemedText style={[styles.quickLinkSub, { color: theme.textSecondary }]}>
            Ingresos, pagos y comisiones
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={16} color={theme.textMuted} />
      </Pressable>
    </DashboardAnimatedView>
  )
}
