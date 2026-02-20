import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MoreHomeScreen from "@/screens/MoreHomeScreen";
import FinancesScreen from "@/screens/FinancesScreen";
import InventoryScreen from "@/screens/InventoryScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import PersonalScreen from "@/screens/PersonalScreen";
import SettingsScreen from "@/screens/SettingsScreen";

export type MoreStackParamList = {
  MoreHome: undefined;
  Finanzas: undefined;
  Chicas: undefined;
  Inventario: undefined;
  Configuracion: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MoreHome"
        component={MoreHomeScreen}
        options={{
          title: "Más",
          headerTitle: "Menú",
        }}
      />
      <Stack.Screen
        name="Finanzas"
        component={FinancesScreen}
        options={{ title: "Finanzas" }}
      />
      <Stack.Screen
        name="Chicas"
        component={PersonalScreen}
        options={{ title: "Chicas" }}
      />
      <Stack.Screen
        name="Inventario"
        component={InventoryScreen}
        options={{ title: "Inventario" }}
      />
      <Stack.Screen
        name="Configuracion"
        component={SettingsScreen}
        options={{ title: "Configuración" }}
      />
      <Stack.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ title: "Perfil" }}
      />
    </Stack.Navigator>
  );
}
