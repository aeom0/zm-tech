import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useOdentalAuth } from "@zmtech/tenant-config/odental";
import { PatientsListScreen } from "@/screens/patients/PatientsListScreen";
import { PatientDetailScreen } from "@/screens/patients/PatientDetailScreen";
import type { PatientsStackParamList } from "@/screens/patients/types";

import { LoginScreen } from "./LoginScreen";

const Stack = createNativeStackNavigator<PatientsStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: "#0a0f14" },
  headerTintColor: "#f0f4f8",
  contentStyle: { backgroundColor: "#0a0f14" },
};

/** AuthGate + stack principal de pacientes. Fase 2: sin agenda/finanzas todavía. */
export function RootNavigator() {
  const { isAuthenticated, isLoading } = useOdentalAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0f14" }}>
        <ActivityIndicator color="#2dd4bf" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName="PatientsList">
      <Stack.Screen
        name="PatientsList"
        component={PatientsListScreen}
        options={{ title: "Pacientes", headerShown: false }}
      />
      <Stack.Screen
        name="PatientDetail"
        component={PatientDetailScreen}
        options={{ title: "Ficha del paciente" }}
      />
    </Stack.Navigator>
  );
}
