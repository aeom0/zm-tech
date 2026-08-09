// ============================================================
// RepMAX Business Suite — Contexto global del onboarding
// Accesible desde cualquier pantalla del flujo
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { OnboardingState, CountryCode, VehicleType, BusinessType, ThemeKey } from '../types/onboarding';
import {
  saveOnboarding,
  markOnboardingComplete,
} from '../services/onboardingService';

// Estado inicial vacío
const INITIAL_STATE: OnboardingState = {
  country: null,
  vehicleType: null,
  businessType: null,
  theme: null,
  completed: false,
};

interface OnboardingContextValue {
  state: OnboardingState;
  setCountry: (country: CountryCode) => void;
  setVehicleType: (type: VehicleType) => void;
  setBusinessType: (type: BusinessType) => void;
  setTheme: (theme: ThemeKey) => void;
  completeOnboarding: () => Promise<void>;
  /** true cuando ya se cargó el estado desde AsyncStorage */
  isReady: boolean;
  /**
   * true solo durante la sesión actual, desde que se llama
   * completeOnboarding() hasta que se recarga la app. No se persiste.
   * AuthNavigator lo usa para decidir si abrir en Register (viene del
   * onboarding, ya eligió tema/país/vehículo/negocio) o en Login
   * (usuario recurrente sin sesión activa).
   */
  justCompleted: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [isReady, setIsReady] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  // DEV: no cargar estado persistido — siempre mostrar onboarding al iniciar
  useEffect(() => {
    setIsReady(true);
  }, []);

  /** Actualiza el estado y lo persiste en AsyncStorage */
  const actualizarYPersistir = (parcial: Partial<OnboardingState>) => {
    setState(prev => {
      const nuevo = { ...prev, ...parcial };
      // Persistir de forma asíncrona sin bloquear la UI
      saveOnboarding(nuevo).catch(err =>
        console.error('[OnboardingContext] Error al persistir:', err)
      );
      return nuevo;
    });
  };

  const setCountry = (country: CountryCode) => actualizarYPersistir({ country });
  const setVehicleType = (vehicleType: VehicleType) => actualizarYPersistir({ vehicleType });
  const setBusinessType = (businessType: BusinessType) => actualizarYPersistir({ businessType });
  const setTheme = (theme: ThemeKey) => actualizarYPersistir({ theme });

  /** Marca el onboarding como completado y persiste */
  const completeOnboarding = async (): Promise<void> => {
    try {
      await markOnboardingComplete();
      setState(prev => ({ ...prev, completed: true }));
      setJustCompleted(true);
    } catch (error) {
      console.error('[OnboardingContext] Error al completar onboarding:', error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{ state, setCountry, setVehicleType, setBusinessType, setTheme, completeOnboarding, isReady, justCompleted }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

/** Hook para consumir el contexto de onboarding */
export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding debe usarse dentro de OnboardingProvider');
  return ctx;
}
