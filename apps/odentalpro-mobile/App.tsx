import React from "react";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  OdentalAuthProvider,
  OdentalTenantProvider,
} from "@geemastudio/tenant-config/odental";

import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { RootNavigator } from "@/navigation/RootNavigator";

/**
 * Shell Fase 2: Auth/Tenant + navegación de pacientes con odontograma
 * persistido en `odental_clinical_records`.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <OdentalAuthProvider client={supabase}>
            <OdentalTenantProvider>
              <SafeAreaView style={styles.safe}>
                <StatusBar style="light" />
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </SafeAreaView>
            </OdentalTenantProvider>
          </OdentalAuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#0a0f14" },
});
