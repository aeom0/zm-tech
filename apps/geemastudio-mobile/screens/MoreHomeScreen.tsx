import React from 'react'
import { View, StyleSheet, ScrollView, Image } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Card } from '@/components/Card'
import { CategoryCard } from '@/components/CategoryCard'
import { useTheme } from '@/hooks/useTheme'
import { useAuth, Role } from '@/contexts/AuthContext'
import { useHaptics } from '@/hooks/useHaptics'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'
import { usePendingBadgeCount } from '@/hooks/usePendingBadgeCount'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreHome'>

const roleDisplay: Record<Role, string> = {
  dev: 'Desarrollador',
  owner: 'Propietaria',
  staff: 'Staff',
}

function ProfileCard() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  const navigation = useNavigation<Nav>()
  const haptics = useHaptics()

  if (!profile) return null

  const profileLabel = `Perfil de ${profile.full_name || 'Usuario'}`

  return (
    <Card
      onPress={() => {
        haptics.light()
        navigation.navigate('Perfil')
      }}
      accessibilityLabel={profileLabel}
      style={{
        padding: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing['2xl'],
      }}
    >
      <Image
        source={{
          uri:
            profile.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              profile.full_name || 'User'
            )}&background=random`,
        }}
        style={[styles.avatar, { backgroundColor: theme.border }]}
        accessibilityIgnoresInvertColors
      />
      <View style={{ flex: 1 }}>
        <ThemedText type="h4">{profile.full_name || 'Usuario'}</ThemedText>
        <ThemedText type="small" style={{ opacity: 0.7 }}>
          {roleDisplay[profile.role]}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textMuted} />
    </Card>
  )
}

export default function MoreHomeScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { isAdmin } = useAuth()
  const navigation = useNavigation<Nav>()
  const { paymentValidationCount, unassignedCount } = usePendingBadgeCount()

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ProfileCard />

      <View style={styles.grid}>
        {isAdmin && (
          <>
            <CategoryCard
              icon="briefcase"
              label="Mi negocio"
              onPress={() => navigation.navigate('MiNegocio')}
            />
            <CategoryCard
              icon="bar-chart-2"
              label="Finanzas"
              onPress={() => navigation.navigate('FinanzasMenu')}
              badgeCount={paymentValidationCount}
            />
            <CategoryCard
              icon="users"
              label="Equipo"
              onPress={() => navigation.navigate('Equipo')}
              badgeCount={unassignedCount}
            />
            <CategoryCard
              icon="send"
              label="Marketing y Redes"
              onPress={() => navigation.navigate('MarketingRedes')}
            />
          </>
        )}

        {!isAdmin && (
          <CategoryCard
            icon="calendar"
            label="Mi turno"
            onPress={() => navigation.getParent()?.navigate('Agenda')}
          />
        )}

        <CategoryCard icon="help-circle" label="Ayuda" onPress={() => navigation.navigate('Ayuda')} />
        <CategoryCard icon="settings" label="Cuenta" onPress={() => navigation.navigate('Cuenta')} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
})
