// ============================================================
// RepMAX Business Suite — Pantalla Splash del onboarding
// Animación de entrada y navegación automática (mín. 1800ms)
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors, typography } from '../../utils/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSplash'>;

const DURACION_MINIMA_MS = 1800;
const DURACION_LOGO_MS = 600;
const RETRASO_TAGLINE_MS = 200;
const DURACION_TAGLINE_MS = 400;

export default function OnboardingSplash({ navigation }: Props) {
  const opacidadLogo = useRef(new Animated.Value(0)).current;
  const translateTagline = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const tiempoInicio = Date.now();
    let idNavegacion: ReturnType<typeof setTimeout> | undefined;

    const animacionEntrada = Animated.parallel([
      Animated.timing(opacidadLogo, {
        toValue: 1,
        duration: DURACION_LOGO_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(RETRASO_TAGLINE_MS),
        Animated.timing(translateTagline, {
          toValue: 0,
          duration: DURACION_TAGLINE_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animacionEntrada.start(({ finished }) => {
      if (!finished) {
        return;
      }
      const transcurrido = Date.now() - tiempoInicio;
      const esperaExtra = Math.max(0, DURACION_MINIMA_MS - transcurrido);
      idNavegacion = setTimeout(() => {
        navigation.replace('OnboardingCountry');
      }, esperaExtra);
    });

    return () => {
      animacionEntrada.stop();
      if (idNavegacion !== undefined) {
        clearTimeout(idNavegacion);
      }
    };
  }, [navigation, opacidadLogo, translateTagline]);

  return (
    <View style={styles.contenedor}>
      <View style={styles.logoContenedor}>
        <Animated.View style={{ opacity: opacidadLogo }}>
          <Text style={styles.logo}>
            Rep<Text style={styles.logoAccent}>MAX</Text>
          </Text>
        </Animated.View>
        <Animated.View
          style={{
            transform: [{ translateY: translateTagline }],
          }}
        >
          <Text style={styles.tagline}>Business Suite</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContenedor: {
    alignItems: 'center',
  },
  logo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['4xl'],
    color: colors.text.primary,
    letterSpacing: 6,
  },
  logoAccent: {
    color: colors.brand.orange,
  },
  tagline: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.brand.orange,
    letterSpacing: 3,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});
