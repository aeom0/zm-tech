// ============================================================
// RepMAX Business Suite — Hook de navegación del onboarding
// Centraliza la lógica de "ir al siguiente paso"
// ============================================================

import { useCallback } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../navigation/types';

// Orden lineal de las pantallas del onboarding
const SCREENS: (keyof OnboardingStackParamList)[] = [
  'OnboardingSplash',
  'OnboardingCountry',
  'OnboardingVehicle',
  'OnboardingBusiness',
  'OnboardingTheme',
  'OnboardingPreview',
  'OnboardingDecision',
];

type OnboardingNavProp = NativeStackNavigationProp<OnboardingStackParamList>;

interface UseOnboardingNavigationResult {
  goNext: () => void;
  goBack: () => void;
  currentStep: number;
  totalSteps: number;
}

/**
 * Recibe la screen actual y el objeto navigation del stack.
 * Calcula el paso actual y expone goNext / goBack.
 */
export function useOnboardingNavigation(
  currentScreen: keyof OnboardingStackParamList,
  navigation: OnboardingNavProp,
): UseOnboardingNavigationResult {
  // Índice base-0; el splash no cuenta como "paso" visible
  const currentIndex = SCREENS.indexOf(currentScreen);

  // El splash se excluye del conteo visible (pasos 1-5 son Country → Decision)
  const visibleScreens = SCREENS.slice(1); // sin Splash
  const totalSteps = visibleScreens.length;
  const currentStep = Math.max(0, currentIndex); // 0 para Splash

  const goNext = useCallback(() => {
    const siguienteIndex = currentIndex + 1;
    if (siguienteIndex < SCREENS.length) {
      const siguientePantalla = SCREENS[siguienteIndex];
      navigation.navigate(siguientePantalla as never);
    }
  }, [currentIndex, navigation]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return { goNext, goBack, currentStep, totalSteps };
}
