import React from 'react'
import { StyleSheet } from 'react-native'

import { TenantLogoImage } from '@/components/TenantLogoImage'
import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'

const SIZE = 36

/** Logo del negocio en la esquina superior izquierda de los tabs principales. */
export function TabHeaderLogo() {
  const { config } = useTenant()
  const { isDark } = useTheme()

  if (!config.logo) return null

  return (
    <TenantLogoImage
      uri={config.logo}
      size={SIZE}
      bgStyle={isDark ? config.logoBgDark : config.logoBgLight}
      style={styles.wrap}
    />
  )
}

const styles = StyleSheet.create({
  wrap: { marginLeft: 16 },
})
