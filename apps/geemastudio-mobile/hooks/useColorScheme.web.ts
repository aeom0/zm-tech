import { useSyncExternalStore } from 'react'
import { useColorScheme as useRNColorScheme } from 'react-native'

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
const noopSubscribe = () => () => {}

export function useColorScheme() {
  // false en el render estático del servidor, true en el cliente.
  const hasHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

  const colorScheme = useRNColorScheme()

  if (hasHydrated) {
    return colorScheme
  }

  return 'light'
}
