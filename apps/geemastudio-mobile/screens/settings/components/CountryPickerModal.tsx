import React from 'react'
import { Modal, Pressable, FlatList, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ThemedText } from '@/components/ThemedText'
import { CountryFlag } from '@/components/CountryFlag'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'
import { countriesForPicker, type CountryPreset } from '@zmtech/tenant-config'

interface CountryPickerModalProps {
  visible: boolean
  currentCode: string
  onSelect: (pais: CountryPreset) => void
  onClose: () => void
}

export function CountryPickerModal({
  visible,
  currentCode,
  onSelect,
  onClose,
}: CountryPickerModalProps) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const data = countriesForPicker()

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>País del negocio</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = item.code === currentCode
              return (
                <Pressable
                  style={[
                    styles.row,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? `${theme.primary}12` : theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => {
                    onSelect(item)
                    onClose()
                  }}
                >
                  <CountryFlag
                    code={item.code}
                    width={40}
                    borderRadius={9}
                    borderColor={selected ? theme.primary : theme.border}
                  />
                  <View style={styles.texts}>
                    <ThemedText style={[styles.name, { color: theme.text }]}>{item.label}</ThemedText>
                    <ThemedText style={[styles.sub, { color: theme.textMuted }]}>
                      {item.currency.symbol} {item.currency.code} · {item.timezone.replace('America/', '')}
                    </ThemedText>
                  </View>
                  {selected ? <Feather name="check" size={18} color={theme.primary} /> : null}
                </Pressable>
              )
            }}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  texts: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
})
