// ============================================================
// RepMAX Business Suite — Selección de tema visual (paso 4)
// Reordena Turbo primero si el usuario eligió MOTOS
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { THEMES } from '../../constants/onboarding';
import OnboardingProgressBar from '../../components/onboarding/OnboardingProgressBar';
import { Screen } from '../../components/layout/Screen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { ThemeKey } from '../../types/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingTheme'>;

export default function OnboardingTheme({ navigation }: Props) {
  const { state, setTheme } = useOnboarding();
  const [seleccionado, setSeleccionado] = useState<ThemeKey | null>(state.theme);

  // Si eligió motos, Turbo va primero (más relevante para moteros)
  const temasOrdenados =
    state.vehicleType === 'MOTOS'
      ? [...THEMES].sort((a, b) => (a.key === 'turbo' ? -1 : b.key === 'turbo' ? 1 : 0))
      : THEMES;

  const confirmar = () => {
    if (!seleccionado) return;
    setTheme(seleccionado);
    navigation.navigate('OnboardingPreview');
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      {/* Barra de progreso: paso 4 de 5 */}
      <OnboardingProgressBar currentStep={4} totalSteps={5} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>Escoge tu identidad visual</Text>
        <Text style={styles.subtitulo}>
          El tema es solo tu color — RepMAX funciona igual para motos, carros o ambos.
        </Text>

        {/* Cards horizontales de tema */}
        <View style={styles.cards}>
          {temasOrdenados.map(tema => {
            const activo = seleccionado === tema.key;
            return (
              <TouchableOpacity
                key={tema.key}
                style={[
                  styles.cardTema,
                  activo && { borderColor: tema.color, backgroundColor: colors.bg.elevated },
                  shadows.sm,
                ]}
                onPress={() => setSeleccionado(tema.key)}
                activeOpacity={0.85}
              >
                {/* Círculo de color */}
                <View style={[styles.circuloColor, { backgroundColor: tema.color }]}>
                  {activo && (
                    <MaterialCommunityIcons name="check" size={22} color="#FFFFFF" />
                  )}
                </View>

                <View style={styles.infoTema}>
                  <Text style={[styles.nombreTema, activo && { color: tema.color }]}>
                    {tema.name}
                  </Text>
                  <Text style={styles.descTema}>{tema.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Botón de confirmación */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.botonContinuar, !seleccionado && styles.botonDeshabilitado]}
          onPress={confirmar}
          disabled={!seleccionado}
          activeOpacity={0.85}
        >
          <Text style={styles.botonTexto}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing.lg,
  },
  titulo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  subtitulo: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
  },
  cards: {
    gap: spacing.md,
  },
  cardTema: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.bg.border,
    padding: spacing.base,
    gap: spacing.base,
  },
  circuloColor: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTema: {
    flex: 1,
  },
  nombreTema: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.text.primary,
    marginBottom: 2,
  },
  descTema: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  footer: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
  },
  botonContinuar: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.4,
  },
  botonTexto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.inverse,
  },
});
