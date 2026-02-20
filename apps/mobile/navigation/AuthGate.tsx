import React, { useState } from "react";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { SplashScreenComponent } from "@/screens/SplashScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

import OnboardingBusinessTypeScreen from "@/screens/onboarding/OnboardingBusinessTypeScreen";
import OnboardingBasicInfoScreen from "@/screens/onboarding/OnboardingBasicInfoScreen";
import OnboardingTeamScreen from "@/screens/onboarding/OnboardingTeamScreen";
import OnboardingServicesScreen from "@/screens/onboarding/OnboardingServicesScreen";
import OnboardingCompleteScreen from "@/screens/onboarding/OnboardingCompleteScreen";

type PasoOnboarding = 1 | 2 | 3 | 4 | 5;

/**
 * Flujo completo de la app:
 *   Splash → (no auth) Login
 *           → (auth, no configurado) Onboarding pasos 1-5
 *           → (auth, configurado) MainTabNavigator
 */
export default function AuthGate() {
  const { isAuthenticated } = useAuth();
  const { isConfigured, isLoading: tenantLoading } = useTenant();
  const [splashDone, setSplashDone] = useState(false);
  const [paso, setPaso] = useState<PasoOnboarding>(1);

  // Mientras el TenantContext carga AsyncStorage, mostramos el splash
  if (!splashDone || tenantLoading) {
    return <SplashScreenComponent onFinish={() => setSplashDone(true)} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Onboarding solo cuando no hay config guardada
  if (!isConfigured) {
    if (paso === 1) {
      return <OnboardingBusinessTypeScreen onNext={() => setPaso(2)} />;
    }
    if (paso === 2) {
      return (
        <OnboardingBasicInfoScreen
          onNext={() => setPaso(3)}
          onBack={() => setPaso(1)}
        />
      );
    }
    if (paso === 3) {
      return (
        <OnboardingTeamScreen
          onNext={() => setPaso(4)}
          onBack={() => setPaso(2)}
        />
      );
    }
    if (paso === 4) {
      return (
        <OnboardingServicesScreen
          onNext={() => setPaso(5)}
          onBack={() => setPaso(3)}
        />
      );
    }
    // paso === 5: pantalla de confirmación final
    return <OnboardingCompleteScreen onFinish={() => setPaso(1)} />;
  }

  return <MainTabNavigator />;
}
