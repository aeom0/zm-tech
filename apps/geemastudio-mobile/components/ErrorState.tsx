import { StyleSheet, View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

export type ErrorStateProps = {
  message?: string
  onRetry?: () => void
  compact?: boolean
}

/** Estado de error inline para queries fallidas (no reemplaza ErrorFallback, que es para crashes de render). */
export function ErrorState({
  message = 'No pudimos cargar la información.',
  onRetry,
  compact = false,
}: ErrorStateProps) {
  const { theme } = useTheme()

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Feather name="alert-triangle" size={compact ? 20 : 28} color={theme.error} />
      <ThemedText type={compact ? 'small' : 'body'} style={styles.message}>
        {message}
      </ThemedText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            { borderColor: theme.error, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="refresh-cw" size={14} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.error }}>
            Reintentar
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing['2xl'],
  },
  containerCompact: {
    padding: Spacing.lg,
  },
  message: {
    textAlign: 'center',
    opacity: 0.85,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
})
