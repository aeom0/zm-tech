import { createShadows, createTheme, createBrandGradient } from '@/constants/theme'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTenant } from '@/contexts/TenantContext'

export function useTheme() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { config } = useTenant()
  const theme = createTheme(config, isDark)
  const shadows = createShadows(theme.primary)
  const brandGradient = createBrandGradient(config)

  return {
    theme,
    isDark,
    shadows,
    brandGradient,
  }
}
