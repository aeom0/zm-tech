import React from 'react'
import { View } from 'react-native'

import type { LogoBackgroundStyle } from '@zmtech/tenant-config'
import { ThemedText } from '@/components/ThemedText'
import { TenantLogoImage } from '@/components/TenantLogoImage'

import { DashboardAnimatedView, type DashboardAnimatedStyle } from '../hooks/useStaggeredAnimation'
import { dashboardStyles as styles } from '../dashboardStyles'

interface DashboardHeaderProps {
  greeting: string
  displayNameSuffix: string
  motivationalMessage: string
  dateLabel: string
  businessInitials: string
  logoUri?: string
  logoBgStyle?: LogoBackgroundStyle
  primaryColor: string
  theme: {
    text: string
    textSecondary: string
  }
  animatedStyle?: DashboardAnimatedStyle
}

export function DashboardHeader({
  greeting,
  displayNameSuffix,
  motivationalMessage,
  dateLabel,
  businessInitials,
  logoUri,
  logoBgStyle,
  primaryColor,
  theme,
  animatedStyle,
}: DashboardHeaderProps) {
  return (
    <DashboardAnimatedView style={[styles.header, animatedStyle]}>
      <View>
        <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>
          {greeting}
          {displayNameSuffix}
        </ThemedText>
        <ThemedText style={[styles.dateText, { color: theme.text }]} numberOfLines={1}>
          {dateLabel}
        </ThemedText>
        <ThemedText
          style={[styles.motivationalText, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {motivationalMessage}
        </ThemedText>
      </View>
      <View style={[styles.logoMarkRing, { borderColor: `${primaryColor}40` }]}>
        {logoUri ? (
          <TenantLogoImage uri={logoUri} size={40} bgStyle={logoBgStyle} />
        ) : (
          <View style={[styles.logoMark, { backgroundColor: `${primaryColor}12` }]}>
            <ThemedText style={[styles.logoLetter, { color: primaryColor }]}>
              {businessInitials}
            </ThemedText>
          </View>
        )}
      </View>
    </DashboardAnimatedView>
  )
}
