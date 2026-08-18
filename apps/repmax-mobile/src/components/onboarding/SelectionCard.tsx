// ============================================================
// RepMAX Business Suite — Card de selección genérica
// Usada en Vehicle, Business y Theme
// ============================================================

import React, { useRef } from 'react'
import { TouchableOpacity, View, Text, Animated, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme'

interface SelectionCardProps {
  /** Nombre de icono de MaterialCommunityIcons */
  iconName: string
  title: string
  description: string
  selected: boolean
  onPress: () => void
  /** Color de acento del borde y el icono cuando está seleccionado. Por defecto: brand.orange */
  accentColor?: string
}

export default function SelectionCard({
  iconName,
  title,
  description,
  selected,
  onPress,
  accentColor = colors.brand.orange,
}: SelectionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  // Animación de presión sutil
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start()
  }

  // El icono usa el color de acento si está seleccionado, gris acero si no
  const iconColor = selected ? accentColor : colors.brand.steel

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        style={[
          styles.card,
          selected && { borderColor: accentColor, backgroundColor: colors.bg.elevated },
          shadows.md,
        ]}
      >
        {/* Contenedor del icono: capa con opacidad 0.15 sobre el acento si está seleccionado */}
        <View style={styles.iconoContenedor}>
          {selected ? (
            <View
              style={[styles.iconoFondoAcento, { backgroundColor: accentColor }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
          <MaterialCommunityIcons name={iconName as never} size={32} color={iconColor} />
        </View>

        <View style={styles.textos}>
          <Text style={[styles.titulo, selected && { color: accentColor }]}>{title}</Text>
          <Text style={styles.descripcion}>{description}</Text>
        </View>

        {/* Check visible solo al seleccionar */}
        {selected ? (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={accentColor}
            style={styles.checkDerecha}
          />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.bg.border,
    padding: spacing.base,
    gap: spacing.md,
  },
  iconoContenedor: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconoFondoAcento: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.text.primary,
    marginBottom: 2,
  },
  descripcion: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  checkDerecha: {
    marginLeft: spacing.xs,
  },
})
