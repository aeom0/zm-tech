// components/OtaUpdateOverlay.tsx
// Pantalla de marca mientras se descarga/aplica una OTA (misma línea que splash nativo)

import React, { useEffect, useState } from 'react'
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'

import { Gradients, Onboarding, Spacing } from '@/constants/theme'
import { useOtaUpdateUiStore, type OtaFase } from '@/stores/otaUpdateUiStore'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const BARRA_WIDTH = SCREEN_WIDTH * 0.72

const LOGO_SPLASH = require('@/assets/splash-logo.png')

const COLORES = {
  fondo: Onboarding.canvasBackground,
  barraFondo: 'rgba(255,255,255,0.12)',
  barraRelleno: Gradients.onboarding.start,
  texto: 'rgba(255,255,255,0.92)',
  textoSub: Onboarding.textMuted,
  iconoBorde: 'rgba(255,255,255,0.35)',
  iconoFondo: 'rgba(255,255,255,0.08)',
  exito: '#86EFAC',
  exitoFondo: 'rgba(134,239,172,0.18)',
}

const MENSAJES: Record<OtaFase, string> = {
  idle: '',
  buscando: 'Buscando actualización…',
  descargando: 'Descargando actualización…',
  instalando: 'Instalando actualización…',
  reiniciando: 'Aplicando cambios…',
}

const ICONOS: Record<OtaFase, string> = {
  idle: '○',
  buscando: '⟳',
  descargando: '↓',
  instalando: '⚙',
  reiniciando: '✓',
}

export function OtaUpdateOverlay(): React.JSX.Element | null {
  const { visible, fase, progreso, mensajeCustom } = useOtaUpdateUiStore()

  const [fadeAnim] = useState(() => new Animated.Value(0))
  const [barraAnim] = useState(() => new Animated.Value(0))
  const [spinAnim] = useState(() => new Animated.Value(0))
  const [pulseAnim] = useState(() => new Animated.Value(1))

  useEffect(() => {
    if (visible) {
      void SplashScreen.hideAsync()
    }
  }, [visible])

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start()
  }, [visible, fadeAnim])

  useEffect(() => {
    Animated.timing(barraAnim, {
      toValue: (progreso / 100) * BARRA_WIDTH,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [progreso, barraAnim])

  useEffect(() => {
    const enProgreso = fase === 'buscando' || fase === 'descargando'
    if (enProgreso) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start()
    } else {
      spinAnim.stopAnimation()
      spinAnim.setValue(0)
    }
  }, [fase, spinAnim])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [pulseAnim])

  if (!visible && fase === 'idle') return null

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const mensajeFinal = mensajeCustom ?? MENSAJES[fase]
  const icono = ICONOS[fase]
  const esFinal = fase === 'reiniciando'

  const opacityStyle = fase === 'reiniciando' ? { opacity: 1 } : { opacity: fadeAnim }

  return (
    <Animated.View
      style={[styles.contenedor, opacityStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      <Animated.View style={[styles.logoBloque, { transform: [{ scale: pulseAnim }] }]}>
        <Image source={LOGO_SPLASH} style={styles.logoImagen} resizeMode="contain" />
      </Animated.View>

      <View style={styles.estadoBloque}>
        <Animated.View
          style={[
            styles.iconoFase,
            esFinal && styles.iconoFaseExito,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <Text style={[styles.iconoFaseTexto, esFinal && styles.iconoFaseTextoExito]}>
            {icono}
          </Text>
        </Animated.View>

        <Text style={styles.mensaje}>{mensajeFinal}</Text>

        <View style={styles.barraContenedor}>
          <Animated.View
            style={[styles.barraRelleno, { width: barraAnim }, esFinal && styles.barraRellenoExito]}
          />
        </View>

        <Text style={styles.porcentaje}>
          {progreso < 100 ? `${Math.round(progreso)}%` : '¡Listo!'}
        </Text>
      </View>

      <Text style={styles.footer}>No cierres la aplicación</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORES.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    gap: Spacing['3xl'],
  },
  circleTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(64,224,208,0.06)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(64,224,208,0.08)',
  },
  logoBloque: {
    alignItems: 'center',
  },
  logoImagen: {
    width: SCREEN_WIDTH * 0.62,
    height: SCREEN_HEIGHT * 0.18,
    maxWidth: 300,
    maxHeight: 160,
  },
  estadoBloque: {
    width: SCREEN_WIDTH * 0.82,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconoFase: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORES.iconoBorde,
    backgroundColor: COLORES.iconoFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoFaseExito: {
    borderColor: COLORES.exito,
    backgroundColor: COLORES.exitoFondo,
  },
  iconoFaseTexto: {
    fontSize: 22,
    color: COLORES.texto,
  },
  iconoFaseTextoExito: {
    color: COLORES.exito,
  },
  mensaje: {
    fontSize: 15,
    color: COLORES.texto,
    fontWeight: '500',
    textAlign: 'center',
  },
  barraContenedor: {
    width: BARRA_WIDTH,
    height: 6,
    backgroundColor: COLORES.barraFondo,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: 6,
    backgroundColor: COLORES.barraRelleno,
    borderRadius: 3,
  },
  barraRellenoExito: {
    backgroundColor: COLORES.exito,
  },
  porcentaje: {
    fontSize: 12,
    color: COLORES.textoSub,
  },
  footer: {
    fontSize: 12,
    color: COLORES.textoSub,
    letterSpacing: 0.5,
  },
})
