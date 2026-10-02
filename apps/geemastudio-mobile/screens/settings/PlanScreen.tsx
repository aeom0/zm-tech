/**
 * PlanScreen — Plan de suscripción del tenant, uso frente a límites y planes disponibles.
 * Accesible desde Tab Más > Mi negocio > Mi plan. Solo informa (sin cobro ni bloqueos).
 */
import React from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'
import {
  getUsageStatus,
  type Plan,
  type SubscriptionStatus,
  type UsageStatus,
} from '@geemastudio/shared-schema'

import { ThemedText } from '@/components/ThemedText'
import { PlanLimitBanner } from '@/components/PlanLimitBanner'
import { useTheme } from '@/hooks/useTheme'
import { usePlan, usePublicPlans } from '@/hooks/usePlan'
import { Spacing, BorderRadius } from '@/constants/theme'

const CONTACT_URL = 'https://wa.me/51932535512'

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: 'Prueba',
  active: 'Activo',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
}

function UsageBar({ label, usage, limit }: { label: string; usage: number; limit: number | null }) {
  const { theme } = useTheme()
  const status: UsageStatus = getUsageStatus(usage, limit)
  const color = status === 'over' ? theme.warning : status === 'near' ? theme.primary : theme.success
  const pct = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((usage / limit) * 100))

  return (
    <View style={styles.usage}>
      <View style={styles.usageHeader}>
        <ThemedText style={styles.usageLabel}>{label}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
          {usage} / {limit === null ? 'ilimitado' : limit}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function PlanCard({ plan, current, annual }: { plan: Plan; current: boolean; annual: boolean }) {
  const { theme } = useTheme()
  const price = annual ? plan.annual_price : plan.monthly_price

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: current ? `${theme.primary}14` : theme.card,
          borderColor: current ? `${theme.primary}66` : theme.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{plan.name}</ThemedText>
        {current ? (
          <ThemedText style={[styles.currentTag, { color: theme.primary }]}>Tu plan</ThemedText>
        ) : null}
      </View>
      <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{plan.description}</ThemedText>
      <ThemedText style={styles.price}>
        ${price}
        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}> /mes</ThemedText>
      </ThemedText>
      {plan.features.map((f) => (
        <View key={f} style={styles.featureRow}>
          <Feather name="check" size={15} color={theme.success} />
          <ThemedText style={styles.featureText}>{f}</ThemedText>
        </View>
      ))}
    </View>
  )
}

export default function PlanScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { subscription: sub, staffStatus, isLoading, error } = usePlan()
  const plansQuery = usePublicPlans()

  const annual = sub?.billing_cycle === 'annual'
  const trialEnd = sub?.trial_ends_at
    ? new Date(sub.trial_ends_at).toLocaleDateString('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {isLoading ? <ActivityIndicator color={theme.primary} /> : null}

      {error ? (
        <ThemedText style={{ color: theme.error }}>{(error as Error).message}</ThemedText>
      ) : null}

      {!isLoading && !error && !sub ? (
        <ThemedText style={{ color: theme.textSecondary }}>
          No encontramos una suscripción para este negocio. Escríbenos y la activamos.
        </ThemedText>
      ) : null}

      {sub ? (
        <>
          <PlanLimitBanner
            status={staffStatus}
            resource="profesionales"
            usage={sub.staff_count}
            limit={sub.max_staff}
            planName={sub.plan_name}
          />

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Plan {sub.plan_name}</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                {STATUS_LABEL[sub.subscription_status]}
              </ThemedText>
            </View>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              Facturación {annual ? 'anual' : 'mensual'}
              {trialEnd && sub.subscription_status === 'trial' ? ` · Prueba hasta el ${trialEnd}` : ''}
            </ThemedText>

            <UsageBar label="Profesionales activos" usage={sub.staff_count} limit={sub.max_staff} />

            <ThemedText style={styles.meta}>
              Sedes: {sub.max_branches === null ? 'ilimitadas' : sub.max_branches}
            </ThemedText>
            <ThemedText style={styles.meta}>
              Conversaciones de WhatsApp por mes:{' '}
              {sub.waba_conversations === null ? 'ilimitadas' : `${sub.waba_conversations} incluidas`}
            </ThemedText>
          </View>

          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Planes disponibles
          </ThemedText>
          {(plansQuery.data ?? []).map((p) => (
            <PlanCard key={p.code} plan={p} current={p.code === sub.plan_code} annual={annual} />
          ))}

          <Pressable
            onPress={() => void Linking.openURL(CONTACT_URL)}
            style={[styles.cta, { backgroundColor: theme.primary }]}
            accessibilityRole="button"
          >
            <Feather name="message-circle" size={18} color={theme.buttonText} />
            <ThemedText style={[styles.ctaLabel, { color: theme.buttonText }]}>
              Contactar para cambiar de plan
            </ThemedText>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  currentTag: { fontSize: 12, fontWeight: '700' },
  price: { fontSize: 24, fontWeight: '700', marginVertical: Spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  featureText: { flex: 1, fontSize: 13 },
  usage: { marginTop: Spacing.sm, gap: Spacing.xs },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { fontSize: 14 },
  track: { height: 8, borderRadius: BorderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: BorderRadius.full },
  meta: { fontSize: 13 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  ctaLabel: { fontSize: 15, fontWeight: '700' },
})
