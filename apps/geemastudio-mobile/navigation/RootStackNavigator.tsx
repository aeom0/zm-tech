import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AuthGate from '@/navigation/AuthGate'
import { useScreenOptions } from '@/hooks/useScreenOptions'

export type RootStackParamList = {
  Auth: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions()

  return (
    <Stack.Navigator
      screenOptions={{ ...screenOptions, headerShown: false }}
      initialRouteName="Auth"
    >
      <Stack.Screen name="Auth" component={AuthGate} />
    </Stack.Navigator>
  )
}
