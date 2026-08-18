// ============================================================
// RepMAX Business Suite — Hook de navegación del onboarding
// Centraliza la lógica de "ir al siguiente paso"
// ============================================================

import { useCallback } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../navigation/types';
import { useOnboardingCancel } from '../navigation/onboardingCancelContext';

// Orden lineal de las pantallas del onboarding
const SCREENS: (keyof OnboardingStackParamList)[] = [
  'OnboardingCountry',
  'OnboardingVehicle',
  'OnboardingBusiness',
  'OnboardingTheme',
  'OnboardingPreview',
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
  const onCancel = useOnboardingCancel();
  const currentIndex = SCREENS.indexOf(currentScreen);
  const totalSteps = SCREENS.length;
  const currentStep = Math.max(0, currentIndex);

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
    } else {
      onCancel();
    }
  }, [navigation, onCancel]);

  return { goNext, goBack, currentStep, totalSteps };
}
