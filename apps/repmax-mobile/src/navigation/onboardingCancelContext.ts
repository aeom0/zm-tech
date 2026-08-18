import { createContext, useContext } from 'react'

/** Volver de País a OnboardingAuthChoice. No se persiste. */
export const OnboardingCancelContext = createContext<() => void>(() => {})

export function useOnboardingCancel(): () => void {
  return useContext(OnboardingCancelContext)
}
