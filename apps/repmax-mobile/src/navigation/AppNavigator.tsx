// ============================================================
// RepMAX Business Suite — Navegador raíz
// Decide entre Onboarding, Auth y Main según el estado de la sesión.
// La transición al finalizar el onboarding ocurre por renderizado
// condicional — no se navega manualmente — para evitar errores de
// pantallas no registradas en el árbol activo.
// ============================================================

import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { colors } from '../utils/theme';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import OnboardingAuthChoice from '../screens/onboarding/OnboardingAuthChoice';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isLoading, user } = useAuth();
  // isReady = AsyncStorage ya se leyó; state.completed = onboarding terminado
  const { state: onboardingState, isReady } = useOnboarding();
  // Elección del usuario en la pantalla inicial (login vs crear cuenta).
  // Vive aquí, no en OnboardingContext, porque no se persiste: cada vez
  // que la app arranca sin sesión y sin onboarding completado, se vuelve
  // a preguntar.
  const [authChoice, setAuthChoice] = useState<'signup' | 'login' | null>(null);

  // Mostrar spinner mientras cargan Auth y el estado del onboarding
  if (isLoading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={colors.brand.orange} />
      </View>
    );
  }

  // Solo pedimos la elección inicial si no hay sesión y nunca se completó
  // el onboarding de personalización (usuarios recurrentes van directo a Auth).
  const necesitaEleccionInicial = !user && !onboardingState.completed && authChoice === null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Usuario autenticado — ir al dashboard
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : necesitaEleccionInicial ? (
          // Primera pantalla: login o crear cuenta
          <Stack.Screen name="Onboarding">
            {() => (
              <OnboardingAuthChoice
                onChooseSignUp={() => setAuthChoice('signup')}
                onChooseLogin={() => setAuthChoice('login')}
              />
            )}
          </Stack.Screen>
        ) : !onboardingState.completed && authChoice === 'signup' ? (
          // Eligió crear cuenta — wizard de personalización
          <Stack.Screen name="Onboarding">
            {() => <OnboardingNavigator onCancel={() => setAuthChoice(null)} />}
          </Stack.Screen>
        ) : (
          // Eligió iniciar sesión, o ya completó el onboarding antes — login directo
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
