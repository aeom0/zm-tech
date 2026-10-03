import { View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'

import { av } from './availabilityStyles'

/** Aviso en línea: advertencia, error o dato informativo. */
export function AvailabilityNote({
  kind,
  children,
}: {
  kind: 'warning' | 'error' | 'info'
  children: React.ReactNode
}) {
  const { theme } = useTheme()
  const color = kind === 'error' ? theme.error : kind === 'warning' ? theme.warning : theme.border
  return (
    <View style={[av.note, { borderColor: color, backgroundColor: theme.backgroundSecondary }]}>
      {typeof children === 'string' ? (
        <ThemedText type="small" style={{ color: theme.text }}>
          {children}
        </ThemedText>
      ) : (
        children
      )}
    </View>
  )
}
