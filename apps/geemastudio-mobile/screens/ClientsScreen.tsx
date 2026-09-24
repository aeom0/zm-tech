import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
  type ListRenderItem,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, Colors } from '@/constants/theme'
import type { MainTabParamList } from '@/navigation/MainTabNavigator'
import { useClientsData } from './clients/hooks/useClientsData'
import { useClientsMutations } from './clients/hooks/useClientsMutations'
import type { ClientSegment, ClientSortKey, ClientWithMetrics } from './clients/types'
import { ClientsHeader } from './clients/components/ClientsHeader'
import { ClientFilterBar } from './clients/components/ClientFilterBar'
import { ClientSortBar } from './clients/components/ClientSortBar'
import { ClientKPIStrip } from './clients/components/ClientKPIStrip'
import { ClientCard } from './clients/components/ClientCard'
import { ClientDetailModal } from './clients/components/ClientDetailModal'
import { ClientFormModal } from './clients/components/ClientFormModal'

type Nav = BottomTabNavigationProp<MainTabParamList>

export default function ClientsScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme, shadows } = useTheme()
  const navigation = useNavigation<Nav>()

  const [searchQuery, setSearchQuery] = useState('')
  const [segment, setSegment] = useState<ClientSegment>('all')
  const [sortBy, setSortBy] = useState<ClientSortKey>('last_visit')
  const [selectedClient, setSelectedClient] = useState<ClientWithMetrics | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)

  const { clients, filteredClients, kpis, isLoading, isFetching, isError, refetch } =
    useClientsData(searchQuery, segment, sortBy)
  const { createMutation } = useClientsMutations()

  const handleOpenDetail = useCallback((client: ClientWithMetrics) => {
    setSelectedClient(client)
    setDetailVisible(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false)
    setSelectedClient(null)
  }, [])

  const handleSchedule = useCallback(
    (client: ClientWithMetrics) => {
      setDetailVisible(false)
      setSelectedClient(null)
      setTimeout(() => {
        navigation.navigate('Agenda', {
          prefillClient: {
            name: client.name,
            phone: client.phone ?? undefined,
          },
        })
      }, 280)
    },
    [navigation]
  )

  const handleClientUpdated = useCallback((patch: Partial<ClientWithMetrics>) => {
    setSelectedClient((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const openCreate = useCallback(() => {
    setFormVisible(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [])

  const listHeader = useMemo(
    () => (
      <View>
        <ThemedText style={[styles.title, { color: theme.text }]}>Clientes</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Busca, contacta y agenda desde la ficha.
        </ThemedText>

        <ClientsHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={clients.length}
          onAddClientPress={openCreate}
        />

        <ClientFilterBar segment={segment} onSegmentChange={setSegment} />
        <ClientSortBar sortBy={sortBy} onSortChange={setSortBy} />
        <ClientKPIStrip kpis={kpis} />

        {isError ? (
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            Hubo un problema al cargar los clientes. Intenta de nuevo más tarde.
          </ThemedText>
        ) : null}
      </View>
    ),
    [
      theme.text,
      theme.textSecondary,
      theme.error,
      searchQuery,
      clients.length,
      segment,
      sortBy,
      kpis,
      isError,
      openCreate,
    ]
  )

  const listEmpty = useMemo(() => {
    if (isLoading || isError) return null
    return (
      <View style={styles.emptyState}>
        <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
          Aún no hay clientes registrados
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.textMuted }]}>
          Toca + para dar de alta el primero, o espera a que se registren desde la agenda.
        </ThemedText>
      </View>
    )
  }, [isLoading, isError, theme.textSecondary, theme.textMuted])

  const renderItem: ListRenderItem<ClientWithMetrics> = useCallback(
    ({ item }) => (
      <ClientCard client={item} segment={segment} onPress={() => handleOpenDetail(item)} />
    ),
    [segment, handleOpenDetail]
  )

  const keyExtractor = useCallback((item: ClientWithMetrics) => item.id, [])

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        data={filteredClients}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing['2xl'] + 72,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary }, shadows.lg]}
        onPress={openCreate}
        accessibilityLabel="Agregar cliente"
      >
        <Feather name="plus" size={24} color={Colors.light.buttonText} />
      </Pressable>

      <ClientDetailModal
        visible={detailVisible}
        client={selectedClient}
        onClose={handleCloseDetail}
        onSchedule={handleSchedule}
        onClientUpdated={handleClientUpdated}
      />

      <ClientFormModal
        visible={formVisible}
        mode="create"
        saving={createMutation.isPending}
        onClose={() => setFormVisible(false)}
        onSave={(payload) => {
          createMutation.mutate(payload, {
            onSuccess: () => {
              setFormVisible(false)
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            },
            onError: (e: Error) => Alert.alert('Error', e.message ?? 'No se pudo crear'),
          })
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 13,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  emptyState: {
    paddingVertical: Spacing['2xl'],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
