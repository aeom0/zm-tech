import { useState } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { DatePickerModal } from '@/components/DatePickerModal'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'
import { formatIsoDate, isValidIsoDate } from '@/lib/isoDate'

interface DateFieldProps {
  label: string
  /** 'YYYY-MM-DD' o null. */
  value: string | null
  onChange: (iso: string) => void
  minDate?: string
  maxDate?: string
  disabled?: boolean
  /** Texto cuando no hay fecha (o el campo está deshabilitado). */
  placeholder?: string
  /** Si se pasa, muestra una X para dejar el campo sin fecha (campos opcionales). */
  onClear?: () => void
  /** Fondo de la caja; por defecto el de la pantalla. */
  backgroundColor?: string
  /** Estilo del contenedor (p. ej. `flex: 1` dentro de una fila). */
  style?: StyleProp<ViewStyle>
}

/** Campo de fecha que abre un calendario; reemplaza escribir 'AAAA-MM-DD' a mano. */
export function DateField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = 'Elegir fecha',
  onClear,
  backgroundColor,
  style,
}: DateFieldProps) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const hasValue = !disabled && value !== null && isValidIsoDate(value)

  return (
    <View style={style}>
      <ThemedText style={[styles.label, { color: theme.textMuted }]}>{label}</ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${hasValue ? formatIsoDate(value) : placeholder}`}
        style={({ pressed }) => [
          styles.box,
          {
            borderColor: theme.border,
            backgroundColor: backgroundColor ?? theme.backgroundRoot,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText
          numberOfLines={1}
          style={[styles.value, { color: hasValue ? theme.text : theme.textMuted }]}
        >
          {hasValue ? formatIsoDate(value) : placeholder}
        </ThemedText>
        {hasValue && onClear ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${label.toLowerCase()}`}
            hitSlop={10}
          >
            <Feather name="x" size={16} color={theme.textMuted} />
          </Pressable>
        ) : null}
        <Feather name="calendar" size={16} color={disabled ? theme.textMuted : theme.primary} />
      </Pressable>
      <DatePickerModal
        visible={open}
        onClose={() => setOpen(false)}
        value={value}
        onSelect={onChange}
        minDate={minDate}
        maxDate={maxDate}
        title={label}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  value: { flex: 1, fontSize: 15 },
})
