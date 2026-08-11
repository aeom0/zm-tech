// ============================================================
// RepMAX Business Suite — Pantalla Splash del onboarding
// Animación de entrada y navegación automática (mín. 1800ms)
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { Screen } from '../../components/layout/Screen';
import { colors, typography } from '../../utils/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSplash'>;

const DURACION_MINIMA_MS = 1800;
const DURACION_LOGO_MS = 600;
const RETRASO_TAGLINE_MS = 200;
const DURACION_TAGLINE_MS = 400;

export default function OnboardingSplash({ navigation }: Props) {
  const opacidadLogo = useRef(new Animated.Value(0)).current;
  const translateTagline = useRef(new Animated.Value(12)).current;
  const opacidadTagline = useRef(new Animated.Value(0)).current;

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
        Animated.parallel([
          Animated.timing(translateTagline, {
            toValue: 0,
            duration: DURACION_TAGLINE_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacidadTagline, {
            toValue: 1,
            duration: DURACION_TAGLINE_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
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
  }, [navigation, opacidadLogo, translateTagline, opacidadTagline]);

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.contenedor}>
        <View style={styles.logoContenedor}>
          <Animated.View style={{ opacity: opacidadLogo }}>
            <BrandLogo variant="wordmark" width={260} />
          </Animated.View>
          <Animated.View
            style={{
              opacity: opacidadTagline,
              transform: [{ translateY: translateTagline }],
            }}
          >
            <Text style={styles.tagline}>repuestos al máximo</Text>
          </Animated.View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContenedor: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tagline: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    fontStyle: 'italic',
    color: colors.brand.orange,
    letterSpacing: 1.5,
    marginTop: 16,
  },
});
