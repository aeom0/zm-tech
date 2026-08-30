import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import MoreHomeScreen from '@/screens/MoreHomeScreen'
import FinancesScreen from '@/screens/FinancesScreen'
import InventoryScreen from '@/screens/InventoryScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import { useScreenOptions } from '@/hooks/useScreenOptions'

import PersonalScreen from '@/screens/PersonalScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import HorariosTrabajoScreen from '@/screens/HorariosTrabajoScreen'
import ValidacionPagosScreen from '@/screens/ValidacionPagosScreen'
import AsignarProfesionalesScreen from '@/screens/AsignarProfesionalesScreen'
import LogoNegocioScreen from '@/screens/settings/LogoNegocioScreen'
import MiNegocioScreen from '@/screens/more/MiNegocioScreen'
import FinanzasMenuScreen from '@/screens/more/FinanzasMenuScreen'
import MarketingRedesScreen from '@/screens/more/MarketingRedesScreen'
import AyudaScreen from '@/screens/more/AyudaScreen'
import CuentaScreen from '@/screens/more/CuentaScreen'

export type MoreStackParamList = {
  MoreHome: undefined
  MiNegocio: undefined
  FinanzasMenu: undefined
  MarketingRedes: undefined
  Ayuda: undefined
  Cuenta: undefined
  ValidacionPagos: undefined
  AsignarProfesionales: undefined
  Finanzas: undefined
  Personal: undefined
  Inventario: undefined
  Configuracion: undefined
  HorariosTrabajo: undefined
  LogoNegocio: undefined
  Perfil: undefined
}

const Stack = createNativeStackNavigator<MoreStackParamList>()

export default function MoreStackNavigator() {
  const screenOptions = useScreenOptions()

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MoreHome"
        component={MoreHomeScreen}
        options={{
          title: 'Más',
          headerTitle: 'Menú',
        }}
      />
      <Stack.Screen
        name="MiNegocio"
        component={MiNegocioScreen}
        options={{ title: 'Mi negocio' }}
      />
      <Stack.Screen
        name="FinanzasMenu"
        component={FinanzasMenuScreen}
        options={{ title: 'Finanzas' }}
      />
      <Stack.Screen
        name="MarketingRedes"
        component={MarketingRedesScreen}
        options={{ title: 'Marketing y Redes' }}
      />
      <Stack.Screen name="Ayuda" component={AyudaScreen} options={{ title: 'Ayuda' }} />
      <Stack.Screen name="Cuenta" component={CuentaScreen} options={{ title: 'Cuenta' }} />
      <Stack.Screen
        name="ValidacionPagos"
        component={ValidacionPagosScreen}
        options={{ title: 'Validación de Pagos' }}
      />
      <Stack.Screen
        name="AsignarProfesionales"
        component={AsignarProfesionalesScreen}
        options={{ title: 'Asignar Profesionales' }}
      />
      <Stack.Screen name="Finanzas" component={FinancesScreen} options={{ title: 'Finanzas' }} />
      <Stack.Screen name="Personal" component={PersonalScreen} options={{ title: 'Personal' }} />
      <Stack.Screen
        name="Inventario"
        component={InventoryScreen}
        options={{ title: 'Inventario' }}
      />
      <Stack.Screen
        name="Configuracion"
        component={SettingsScreen}
        options={{ title: 'Datos del negocio' }}
      />
      <Stack.Screen
        name="HorariosTrabajo"
        component={HorariosTrabajoScreen}
        options={{ title: 'Horario de trabajo' }}
      />
      <Stack.Screen
        name="LogoNegocio"
        component={LogoNegocioScreen}
        options={{ title: 'Logo del negocio' }}
      />
      <Stack.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Stack.Navigator>
  )
}
