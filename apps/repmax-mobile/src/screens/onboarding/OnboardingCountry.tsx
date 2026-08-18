// ============================================================
// RepMAX Business Suite — Selección de país (paso 1)
// Venezuela destacada arriba, el resto en grid 2 columnas
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useOnboardingCancel } from '../../navigation/onboardingCancelContext';
import { COUNTRIES } from '../../constants/onboarding';
import OnboardingProgressBar from '../../components/onboarding/OnboardingProgressBar';
import { Screen } from '../../components/layout/Screen';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { CountryCode } from '../../types/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingCountry'>;

export default function OnboardingCountry({ navigation }: Props) {
  const { setCountry } = useOnboarding();
  const onCancel = useOnboardingCancel();
  const escalaVenezuela = useRef(new Animated.Value(1)).current;

  const venezuela = COUNTRIES.find(c => c.featured)!;
  const otros = COUNTRIES.filter(c => !c.featured);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [onCancel]);

  const seleccionarPais = (code: CountryCode) => {
    setCountry(code);
    navigation.navigate('OnboardingVehicle');
  };

  /** Animación de escala antes de navegar (solo UX; misma lógica de negocio) */
  const presionarVenezuela = () => {
    Animated.spring(escalaVenezuela, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start(({ finished }) => {
      if (finished) {
        seleccionarPais(venezuela.code);
      }
    });
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <TouchableOpacity
        onPress={onCancel}
        style={styles.volver}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Volver a crear cuenta o iniciar sesión"
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text.secondary} />
        <Text style={styles.volverTexto}>Volver</Text>
      </TouchableOpacity>
      {/* Barra de progreso: paso 1 de 5 */}
      <OnboardingProgressBar currentStep={1} totalSteps={5} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>¿Desde dónde operas?</Text>

        {/* Venezuela — card grande destacada */}
        <TouchableOpacity
          onPress={presionarVenezuela}
          activeOpacity={0.85}
        >
          <Animated.View style={[styles.cardDestacada, { transform: [{ scale: escalaVenezuela }] }]}>
            <Text style={styles.flagGrande}>{venezuela.flag}</Text>
            <Text style={styles.labelDestacado}>{venezuela.label}</Text>
            <Text style={styles.subDestacado}>Optimizado para el mercado venezolano</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Otros países en grid 2 columnas */}
        <Text style={styles.subtituloOtros}>Otros países</Text>
        <View style={styles.grid}>
          {otros.map(pais => (
            <TouchableOpacity
              key={pais.code}
              style={[styles.cardPais, shadows.sm]}
              onPress={() => seleccionarPais(pais.code)}
              activeOpacity={0.85}
            >
              <Text style={styles.flagPequeno}>{pais.flag}</Text>
              <Text style={styles.labelPais}>{pais.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  volver: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  volverTexto: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  titulo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.text.primary,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  // Card destacada Venezuela
  cardDestacada: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.brand.orange,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.brand.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  flagGrande: {
    fontSize: 60,
    marginBottom: spacing.sm,
  },
  labelDestacado: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subDestacado: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.brand.orange,
    opacity: 0.8,
    textAlign: 'center',
  },
  // Otros países
  subtituloOtros: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardPais: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
  },
  flagPequeno: {
    fontSize: 32,
  },
  labelPais: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
});
