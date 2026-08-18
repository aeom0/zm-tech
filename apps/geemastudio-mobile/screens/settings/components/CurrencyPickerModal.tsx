import React from 'react'
import { Modal, View, StyleSheet, FlatList, Pressable, SafeAreaView } from 'react-native'
import { Feather } from '@expo/vector-icons'
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Cabecera */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText style={[styles.titulo, { color: theme.text }]}>Seleccionar moneda</ThemedText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="x" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

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
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titulo: {
    fontSize: 17,
    fontWeight: '600',
  },
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
