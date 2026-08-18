import React, { useState } from 'react'
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native'
import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from 'expo-linear-gradient'
import { DiamondSparkle } from './DiamondSparkle'
import { NebulosaGlow } from './NebulosaGlow'
import { Gradients, Spacing } from '@/constants/theme'

const STACK_SIZE = 320
const GLOW_SIZE = 420
const GLOW_OFFSET = (STACK_SIZE - GLOW_SIZE) / 2
const GLOW_VERTICAL_SHIFT = 20

interface DiamondHeroProps {
  showText?: boolean
}

/**
 * Wordmark centrado:
 * MaskedView no reporta su ancho real al layout — siempre ocupa
 * el ancho del LinearGradient hijo (studioGradient.width).
 * Solución: medimos el ancho real de "Studio" con onLayout en un
 * Text invisible, y usamos ese valor como ancho del gradiente.
 * Así wordmarkRow mide exactamente anchoGeema + anchoStudio y
 * el centrado del container padre lo ubica perfectamente bajo el diamante.
 */
export function DiamondHero({ showText = true }: DiamondHeroProps) {
  // Ancho medido de "Studio" — empieza con valor seguro para evitar flash
  const [studioWidth, setStudioWidth] = useState(135)

  const onStudioLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (w > 0) setStudioWidth(Math.ceil(w))
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoStack}>
        <View style={styles.glowWrapper}>
          <NebulosaGlow size={GLOW_SIZE} />
        </View>
        <View style={styles.diamondWrapper}>
          <DiamondSparkle size={320} />
        </View>
      </View>

      {showText && (
        <>
          {/* Wordmark GeemaStudio */}
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkGeema}>Geema</Text>

            {/*
             * Text invisible que mide el ancho real de "Studio".
             * position:absolute lo saca del flujo, opacity:0 lo oculta.
             * onLayout reporta el ancho tipográfico exacto de la fuente.
             */}
            <Text style={[styles.wordmarkStudio, styles.measurePhantom]} onLayout={onStudioLayout}>
              Studio
            </Text>

            {/* MaskedView con ancho igual al texto medido → centrado perfecto */}
            <MaskedView
              maskElement={
                <Text style={[styles.wordmarkStudio, styles.wordmarkStudioMask]}>Studio</Text>
              }
            >
              <LinearGradient
                colors={[...Gradients.onboarding.colors]}
                locations={[...Gradients.onboarding.locations]}
                start={Gradients.onboarding.linearStart}
                end={Gradients.onboarding.linearEnd}
                style={[styles.studioGradient, { width: studioWidth }]}
              />
            </MaskedView>
          </View>

          <Text style={styles.tagline}>Pule tu negocio · Brilla en cada servicio</Text>
        </>
      )}
    </View>
  )
}

const WORDMARK_SIZE = 38

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.md,
    overflow: 'visible',
  },
  logoStack: {
    width: STACK_SIZE,
    height: STACK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  glowWrapper: {
    position: 'absolute',
    left: GLOW_OFFSET,
    top: GLOW_OFFSET + GLOW_VERTICAL_SHIFT,
  },
  diamondWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0,
  },
  wordmarkGeema: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: WORDMARK_SIZE,
    lineHeight: WORDMARK_SIZE,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  wordmarkStudio: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: WORDMARK_SIZE,
    lineHeight: WORDMARK_SIZE,
    includeFontPadding: false,
  },
  // Texto fantasma para medir el ancho real de "Studio"
  measurePhantom: {
    position: 'absolute',
    opacity: 0,
    // color requerido por RN para que el texto sea medible
    color: '#FFFFFF',
  },
  wordmarkStudioMask: {
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  studioGradient: {
    // width se inyecta dinámicamente desde studioWidth (onLayout)
    // valor inicial 135 evita flash de layout en el primer render
    width: 135,
    height: WORDMARK_SIZE,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
})
