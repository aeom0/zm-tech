import React from 'react'
import { View, StyleSheet, FlatList, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SheetModal } from '@/components/SheetModal'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'
import { MONEDAS_LATAM, type Moneda } from '../constants'

interface CurrencyPickerModalProps {
  visible: boolean
  currentCode: string
  onSelect: (moneda: Moneda) => void
  onClose: () => void
}

export function CurrencyPickerModal({
  visible,
  currentCode,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  const { theme } = useTheme()

  return (
    <SheetModal visible={visible} onClose={onClose} title="Seleccionar moneda">
      <FlatList
        data={MONEDAS_LATAM}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const seleccionada = item.code === currentCode
          return (
            <Pressable
              onPress={() => {
                onSelect(item)
                onClose()
              }}
              style={({ pressed }) => [
                styles.fila,
                {
                  backgroundColor: seleccionada ? `${theme.primary}14` : theme.backgroundDefault,
                  borderColor: seleccionada ? `${theme.primary}40` : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {/* Símbolo */}
              <View
                style={[
                  styles.symbolBox,
                  {
                    backgroundColor: seleccionada ? `${theme.primary}20` : `${theme.textMuted}14`,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.symbol,
                    {
                      color: seleccionada ? theme.primary : theme.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.symbol}
                </ThemedText>
              </View>

              {/* Texto */}
              <View style={styles.textos}>
                <ThemedText
                  style={[
                    styles.nombreMoneda,
                    { color: seleccionada ? theme.primary : theme.text },
                  ]}
                >
                  {item.nombre}
                </ThemedText>
                <ThemedText style={[styles.paisMoneda, { color: theme.textMuted }]}>
                  {item.pais} · {item.code}
                </ThemedText>
              </View>

              {seleccionada && <Feather name="check" size={18} color={theme.primary} />}
            </Pressable>
          )
        }}
      />
    </SheetModal>
  )
}

const styles = StyleSheet.create({
  lista: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.xs,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  symbolBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 15,
    fontWeight: '700',
  },
  textos: {
    flex: 1,
  },
  nombreMoneda: {
    fontSize: 15,
    fontWeight: '500',
  },
  paisMoneda: {
    fontSize: 12,
    marginTop: 2,
  },
})
