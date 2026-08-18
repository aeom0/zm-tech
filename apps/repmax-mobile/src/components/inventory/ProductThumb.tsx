// ============================================================
// Miniatura de catálogo — portada o placeholder (no depende de ML)
// ============================================================
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'

import { colors, borderRadius } from '../../utils/theme'

const TAMANOS = { sm: 40, md: 56, lg: 72 } as const

type Tamano = keyof typeof TAMANOS | 'cover'

interface ProductThumbProps {
  uri?: string | null
  size?: Tamano
  accessibilityLabel?: string
}

export function ProductThumb({ uri, size = 'md', accessibilityLabel }: ProductThumbProps) {
  if (size === 'cover') {
    return (
      <View style={styles.coverWrap} accessibilityLabel={accessibilityLabel}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.fill}
            contentFit="cover"
            recyclingKey={uri}
            transition={150}
          />
        ) : (
          <Placeholder iconSize={28} />
        )}
      </View>
    )
  }

  const dim = TAMANOS[size]
  return (
    <View
      style={[styles.square, { width: dim, height: dim }]}
      accessibilityLabel={accessibilityLabel}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.fill}
          contentFit="cover"
          recyclingKey={uri}
          transition={150}
        />
      ) : (
        <Placeholder iconSize={size === 'sm' ? 16 : 22} />
      )}
    </View>
  )
}

function Placeholder({ iconSize }: { iconSize: number }) {
  return (
    <View style={styles.placeholder}>
      <Ionicons name="cube-outline" size={iconSize} color={colors.brand.steel} />
    </View>
  )
}

const styles = StyleSheet.create({
  square: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg.elevated,
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bg.elevated,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.elevated,
  },
})
