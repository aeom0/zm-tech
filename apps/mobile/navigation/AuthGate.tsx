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
import OnboardingAuthScreen from "@/screens/onboarding/OnboardingAuthScreen";
import OnboardingEntryScreen from "@/screens/onboarding/OnboardingEntryScreen";

/** Pasos wizard: 1 = Tipo negocio, 2 = Datos básicos, 3 = Equipo, 4 = Servicios, 5 = Registro/Login, 6 = Listo */
type PasoOnboarding = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Flujo completo de la app:
 *   Splash → (no configurado) Onboarding pasos 1-4 (tipo/datos/equipo/servicios) → paso 5 Login → paso 6 Listo
 *           → (configurado, no auth) Login
 *           → (configurado, auth) MainTabNavigator
 * Tras el splash el usuario ve primero el onboarding; el login es un paso interno antes de guardar en la nube.
 */
export default function AuthGate() {
  const { isAuthenticated } = useAuth();
  const { isConfigured, isLoading: tenantLoading } = useTenant();
  const [splashDone, setSplashDone] = useState(false);
  const [paso, setPaso] = useState<PasoOnboarding>(1);
  const [onboardingSessionDone, setOnboardingSessionDone] = useState(false);

  type EntryChoice = "none" | "new" | "existing";
  const [entryChoice, setEntryChoice] = useState<EntryChoice>("none");

  // Flag de desarrollo para obligar a pasar por el onboarding completo
  const forceOnboardingDev =
    __DEV__ && process.env.EXPO_PUBLIC_FORCE_ONBOARDING === "true";

  // Mientras el TenantContext carga AsyncStorage, mostramos el splash
  if (!splashDone || tenantLoading) {
    return <SplashScreenComponent onFinish={() => setSplashDone(true)} />;
  }

  // Primero: si no está configurado, o si en desarrollo forzamos onboarding
  // (forceOnboardingDev solo fuerza mientras no se haya completado esta sesión)
  if (!isConfigured || (forceOnboardingDev && !onboardingSessionDone)) {
    // Pantalla de entrada: elegir entre nuevo negocio o ya tengo cuenta
    if (entryChoice === "none") {
      return (
        <OnboardingEntryScreen
          onCreateNew={() => setEntryChoice("new")}
          onLoginExisting={() => setEntryChoice("existing")}
        />
      );
    }

    // Usuario indica que ya tiene cuenta → pantalla de login clásica,
    // pero envuelta en el flujo de onboarding.
    if (entryChoice === "existing") {
      return (
        <LoginScreen
          onSuccess={() => {
            // Si al iniciar sesión el tenant ya está configurado,
            // TenantContext marcará isConfigured=true y este branch dejará de ejecutarse.
            // Si no lo está (caso raro), continuamos por el wizard desde el principio.
            setEntryChoice("new");
            setPaso(1);
          }}
        />
      );
    }

    // entryChoice === "new" → flujo de wizard completo
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
    // Paso 5: crear cuenta / iniciar sesión antes de guardar en la nube
    if (paso === 5) {
      if (!isAuthenticated) {
        return (
          <OnboardingAuthScreen
            onSuccess={() => setPaso(6)}
            onBack={() => setPaso(4)}
          />
        );
      }
      // Si ya hay sesión (por ejemplo, usuario vuelve al onboarding), saltamos al último paso
      return (
        <OnboardingCompleteScreen
          onFinish={() => {
            setPaso(1);
            setOnboardingSessionDone(true);
          }}
        />
      );
    }
    // paso === 6: pantalla de confirmación final
    return (
      <OnboardingCompleteScreen
        onFinish={() => {
          setPaso(1);
          setOnboardingSessionDone(true);
        }}
      />
    );
  }

  // Ya configurado pero sin sesión → login para volver a entrar
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainTabNavigator />;
}
