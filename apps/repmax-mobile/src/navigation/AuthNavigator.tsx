// ============================================================
// RepMAX Business Suite — Navegador de autenticación
// initialRouteName es dinámico: si el usuario acaba de completar
// el onboarding (ya eligió tema/país/vehículo/negocio), abre en
// Register para no repetir preguntas. Si no, abre en Login.
// ============================================================
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import { useOnboarding } from '../context/OnboardingContext'
import type { AuthStackParamList } from './types'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export default function AuthNavigator() {
  const { justCompleted } = useOnboarding()

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={justCompleted ? 'Register' : 'Login'}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  )
}
