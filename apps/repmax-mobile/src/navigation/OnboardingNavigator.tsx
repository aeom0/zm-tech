// ============================================================
// RepMAX Business Suite — Navegador del flujo de onboarding
// Stack sin header — Country → Vehicle → Business → Theme → Preview
// La elección login/crear cuenta ocurre antes, en AppNavigator
// (OnboardingAuthChoice). Al terminar Preview se llama
// completeOnboarding() directamente — ya no hay pantalla de decisión.
// (splash nativo en app.json; sin pantalla JS duplicada)
// ============================================================

import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { OnboardingStackParamList } from './types'
import { OnboardingCancelContext } from './onboardingCancelContext'

import OnboardingCountry from '../screens/onboarding/OnboardingCountry'
import OnboardingVehicle from '../screens/onboarding/OnboardingVehicle'
import OnboardingBusiness from '../screens/onboarding/OnboardingBusiness'
import OnboardingTheme from '../screens/onboarding/OnboardingTheme'
import OnboardingPreview from '../screens/onboarding/OnboardingPreview'

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

interface Props {
  onCancel: () => void
}

export default function OnboardingNavigator({ onCancel }: Props) {
  return (
    <OnboardingCancelContext.Provider value={onCancel}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="OnboardingCountry" component={OnboardingCountry} />
        <Stack.Screen name="OnboardingVehicle" component={OnboardingVehicle} />
        <Stack.Screen name="OnboardingBusiness" component={OnboardingBusiness} />
        <Stack.Screen name="OnboardingTheme" component={OnboardingTheme} />
        <Stack.Screen name="OnboardingPreview" component={OnboardingPreview} />
      </Stack.Navigator>
    </OnboardingCancelContext.Provider>
  )
}
