// ============================================================
// RepMAX Business Suite — Navegador del flujo de onboarding
// Stack sin header — Country → Vehicle → Business → Theme → Preview → Decision
// (splash nativo en app.json; sin pantalla JS duplicada)
// ============================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';

import OnboardingCountry from '../screens/onboarding/OnboardingCountry';
import OnboardingVehicle from '../screens/onboarding/OnboardingVehicle';
import OnboardingBusiness from '../screens/onboarding/OnboardingBusiness';
import OnboardingTheme from '../screens/onboarding/OnboardingTheme';
import OnboardingPreview from '../screens/onboarding/OnboardingPreview';
import OnboardingDecision from '../screens/onboarding/OnboardingDecision';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Animación de slide horizontal estándar
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="OnboardingCountry" component={OnboardingCountry} />
      <Stack.Screen name="OnboardingVehicle" component={OnboardingVehicle} />
      <Stack.Screen name="OnboardingBusiness" component={OnboardingBusiness} />
      <Stack.Screen name="OnboardingTheme"   component={OnboardingTheme} />
      <Stack.Screen name="OnboardingPreview" component={OnboardingPreview} />
      <Stack.Screen name="OnboardingDecision" component={OnboardingDecision} />
    </Stack.Navigator>
  );
}
