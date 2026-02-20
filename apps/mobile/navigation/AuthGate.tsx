import React, { useState } from "react";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { SplashScreenComponent } from "@/screens/SplashScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Flujo de auth para móvil: Splash → Login | Main
 * Al iniciar sesión, useAuth actualiza isAuthenticated y se muestra Main.
 */
export default function AuthGate() {
  const { isAuthenticated } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreenComponent onFinish={() => setSplashDone(true)} />;
  }
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  return <MainTabNavigator />;
}
