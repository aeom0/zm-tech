import React, { useState } from 'react'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { NotificationsBell } from '@/components/NotificationsBell'
import { ReferencesInboxSheet } from '@/screens/agenda/components/ReferencesInboxSheet'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { usePendingBadgeCount, type UnreviewedReferenceAppointment } from '@/hooks/usePendingBadgeCount'
import type { MainTabParamList } from '@/navigation/MainTabNavigator'

/** Campana de Agenda: fotos de referencia sin revisar + inbox seleccionable. */
export function AgendaNotifications() {
  const { theme } = useTheme()
  const { config } = useTenant()
  const { unreviewedReferences } = usePendingBadgeCount()
  const navigation = useNavigation<NavigationProp<MainTabParamList>>()
  const [inboxVisible, setInboxVisible] = useState(false)

  const items = [
    {
      key: 'unreviewed-references',
      icon: 'image' as const,
      title: 'Fotos de referencia',
      description:
        unreviewedReferences.length > 0
          ? 'Citas con fotos de referencia subidas por la clienta que todavía no revisaste. Toca para ver la lista.'
          : 'Sin fotos de referencia pendientes por revisar.',
      count: unreviewedReferences.length,
      onPress: unreviewedReferences.length > 0 ? () => setInboxVisible(true) : undefined,
    },
  ]

  const handleSelect = (apt: UnreviewedReferenceAppointment) => {
    setInboxVisible(false)
    navigation.navigate('Agenda', { appointmentId: apt.id })
  }

  return (
    <>
      <NotificationsBell
        items={items}
        theme={{
          text: theme.text,
          textSecondary: theme.textSecondary,
          card: theme.card,
          border: theme.border,
          primary: config.theme.primaryColor,
        }}
      />
      <ReferencesInboxSheet
        visible={inboxVisible}
        appointments={unreviewedReferences}
        onClose={() => setInboxVisible(false)}
        onSelect={handleSelect}
      />
    </>
  )
}
