import type { ReactNode } from 'react'
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'

interface SheetModalProps {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  /** Reserva el inset inferior (barra de gestos). Desactivar si el contenido ya lo maneja. */
  padBottom?: boolean
}

/**
 * Hoja modal a pantalla completa con cabecera estándar (título + cerrar).
 * En Android el `pageSheet` ocupa toda la pantalla (edge-to-edge): sin el inset
 * superior la barra de estado tapa la cabecera. `SafeAreaView` de react-native
 * solo funciona en iOS, por eso se usa el inset de safe-area-context.
 */
export function SheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  padBottom = true,
}: SheetModalProps) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const top = Platform.OS === 'android' ? insets.top : 0

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          { backgroundColor: theme.backgroundRoot, paddingBottom: padBottom ? insets.bottom : 0 },
        ]}
      >
        <View
          style={[styles.header, { paddingTop: top + Spacing.md, borderBottomColor: theme.border }]}
        >
          <View style={styles.titles}>
            <ThemedText type="h4" numberOfLines={1}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText type="small" style={{ color: theme.textMuted }} numberOfLines={2}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={8}
            style={({ pressed }) => [
              styles.close,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="x" size={18} color={theme.text} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titles: { flex: 1, gap: 2 },
  close: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
