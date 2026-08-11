// ============================================================
// RepMAX Business Suite — Pantalla de decisión final del onboarding
// Crear cuenta o explorar demo — navega al RootStack al completar
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../components/layout/Screen';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingDecision'>;

// Owner de Repuestos Alfa — ver docs/repmax/supabase/seed/demo_users.md
const DEMO_EMAIL = 'repmax-owner-a@test.local';
const DEMO_PASSWORD = 'TestRepmax123!';

export default function OnboardingDecision(_props: Props) {
  const { completeOnboarding } = useOnboarding();
  const { login } = useAuth();
  const escalaCohete = useRef(new Animated.Value(0.8)).current;

  // Entrada del ícono: ligero overshoot (una sola vez al montar)
  useEffect(() => {
    const secuencia = Animated.sequence([
      Animated.timing(escalaCohete, {
        toValue: 1.1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(escalaCohete, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    secuencia.start();
    return () => {
      secuencia.stop();
    };
  }, [escalaCohete]);

  // Al llamar completeOnboarding(), state.completed pasa a true.
  // AppNavigator observa ese cambio y renderiza Auth automáticamente
  // sin necesidad de navegar manualmente — evita errores de pantalla no registrada.

  /** Completa el onboarding — AppNavigator navegará al flujo de Auth */
  const handleCrearCuenta = async () => {
    try {
      await completeOnboarding();
    } catch (error) {
      console.error('[OnboardingDecision] Error al completar onboarding:', error);
    }
  };

  /** Inicia sesión con el owner demo de Alfa y entra al panel */
  const handleExplorarDemo = async () => {
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      await completeOnboarding();
    } catch (error) {
      console.error('[OnboardingDecision] Error al cargar usuario demo:', error);
      Alert.alert(
        'No se pudo entrar al demo',
        error instanceof Error ? error.message : 'Revisa la conexión o las credenciales demo.',
      );
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.contenedor}>
      {/* Ícono decorativo */}
      <Animated.View
        style={[styles.iconoContenedor, { transform: [{ scale: escalaCohete }] }]}
      >
        <MaterialCommunityIcons
          name="rocket-launch-outline"
          size={72}
          color={colors.brand.orange}
        />
      </Animated.View>

      {/* Título y descripción */}
      <Text style={styles.titulo}>Tu tienda está lista{'\n'}para arrancar</Text>
      <Text style={styles.descripcion}>
        Todo configurado según tus preferencias. Ahora elige cómo continuar.
      </Text>

      {/* Botones de acción */}
      <View style={styles.botones}>
        {/* Primario — crear cuenta (naranja lleno) */}
        <TouchableOpacity
          style={styles.botonPrimario}
          onPress={handleCrearCuenta}
          activeOpacity={0.85}
        >
          <Text style={styles.botonPrimarioTexto}>Crear mi cuenta gratis</Text>
        </TouchableOpacity>

        {/* Secundario — explorar demo (borde naranja, transparente) */}
        <TouchableOpacity
          style={styles.botonSecundario}
          onPress={handleExplorarDemo}
          activeOpacity={0.85}
        >
          <Text style={styles.botonSecundarioTexto}>Explorar con demo</Text>
        </TouchableOpacity>

        <Text style={styles.notaConfianza}>
          Sin tarjeta. Sin enredos. Empiezas en minutos.
        </Text>
      </View>

      {/* Nota tranquilizadora */}
      <Text style={styles.notaLegal}>
        Sin tarjeta de crédito · Cancela cuando quieras
      </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoContenedor: {
    marginBottom: spacing.xl,
  },
  titulo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['3xl'],
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
    marginBottom: spacing.base,
  },
  descripcion: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  botones: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  // Botón primario: naranja lleno
  botonPrimario: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base + 4,
    alignItems: 'center',
  },
  botonPrimarioTexto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.inverse,
  },
  // Botón secundario: borde naranja, fondo transparente
  botonSecundario: {
    borderWidth: 2,
    borderColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base + 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  botonSecundarioTexto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.brand.orange,
  },
  notaConfianza: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  notaLegal: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});
