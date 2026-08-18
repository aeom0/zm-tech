import { useThemePreference } from '@/contexts/ThemeContext'

export function useColorScheme(): 'light' | 'dark' {
  const { resolved } = useThemePreference()
  return resolved
}
