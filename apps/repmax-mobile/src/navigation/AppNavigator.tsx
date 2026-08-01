// ============================================================
// RepMAX Business Suite — Navegador raíz
// Decide entre Onboarding, Auth y Main según el estado de la sesión.
// La transición al finalizar el onboarding ocurre por renderizado
// condicional — no se navega manualmente — para evitar errores de
// pantallas no registradas en el árbol activo.
// ============================================================

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { colors } from '../utils/theme';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isLoading, user } = useAuth();
  // isReady = AsyncStorage ya se leyó; state.completed = onboarding terminado
  const { state: onboardingState, isReady } = useOnboarding();

  // Mostrar spinner mientras cargan Auth y el estado del onboarding
  if (isLoading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={colors.brand.orange} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingState.completed ? (
          // Primera apertura — mostrar flujo de onboarding
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : user ? (
          // Usuario autenticado — ir al dashboard
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          // Sin sesión activa — ir al login
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
