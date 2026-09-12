import React, { useCallback } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'

type NavWithHeader = {
  setOptions: (options: { headerRight?: () => React.ReactNode }) => void
}

export function useWebSaveHeader(
  navigation: NavWithHeader,
  opts: {
    guardando: boolean
    primaryColor: string
    onSave: () => void
  }
) {
  const { guardando, primaryColor, onSave } = opts

  return useCallback(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginRight: Spacing.sm }}>
          {guardando ? (
            <ActivityIndicator color={primaryColor} />
          ) : (
            <ThemedText
              style={{ color: primaryColor, fontSize: 16, fontWeight: '600' }}
              onPress={onSave}
            >
              Guardar
            </ThemedText>
          )}
        </View>
      ),
    })
  }, [guardando, navigation, onSave, primaryColor])
}
