import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { formatoFechaCortaEnZona, formatoFechaLargaEnZona } from '@zmtech/tenant-config'

import { agendaStyles as styles } from '../agendaStyles'
import { isToday } from '../agendaUtils'
import type { OwnerViewMode } from '../types'

interface AgendaHeaderProps {
  isTablet: boolean
  mobileDayMode?: boolean
  /** Solo para owner: modo actual de vista */
  ownerViewMode?: OwnerViewMode
  /** Solo para owner: toggle entre day/week al tocar la fecha */
  onToggleOwnerViewMode?: () => void
  theme: {
    primary: string
    backgroundRoot: string
    text?: string
    textSecondary?: string
  }
  language: string
  timeZone: string
  selectedDate: Date
  weekDays: Date[]
  paddingTop: number
  onChangeWeek: (delta: number) => void
  onChangeDay: (delta: number) => void
  onGoToToday: () => void
}

export function AgendaHeader({
  isTablet,
  mobileDayMode = false,
  ownerViewMode,
  onToggleOwnerViewMode,
  theme,
  language,
  timeZone,
  selectedDate,
  weekDays,
  paddingTop,
  onChangeWeek,
  onChangeDay,
  onGoToToday,
}: AgendaHeaderProps) {
  const isOwner = ownerViewMode !== undefined
  const isWeekMode = ownerViewMode === 'week'

  const handleDatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isOwner && onToggleOwnerViewMode) {
      onToggleOwnerViewMode()
    } else {
      onGoToToday()
    }
  }

  const handleNavPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isWeekMode) {
      onChangeWeek(-1)
    } else if (isTablet || mobileDayMode) {
      onChangeDay(-1)
    } else {
      onChangeWeek(-1)
    }
  }

  const handleNavNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isWeekMode) {
      onChangeWeek(1)
    } else if (isTablet || mobileDayMode) {
      onChangeDay(1)
    } else {
      onChangeWeek(1)
    }
  }

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop,
          backgroundColor: theme.backgroundRoot,
        },
      ]}
    >
      <Pressable onPress={handleNavPrev} style={styles.navButton}>
        <Feather name="chevron-left" size={isTablet ? 28 : 24} color={theme.primary} />
      </Pressable>

      <Pressable
        onPress={handleDatePress}
        style={styles.dayTitleContainer}
        accessibilityRole="button"
        accessibilityHint={
          isOwner ? (isWeekMode ? 'Volver a vista de día' : 'Ver semana completa') : 'Ir a hoy'
        }
      >
        {isWeekMode ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <ThemedText style={[styles.weekTitle, { fontSize: isTablet ? 18 : 15 }]}>
              {formatoFechaCortaEnZona(weekDays[0], language, timeZone)}
              {' – '}
              {formatoFechaCortaEnZona(weekDays[6], language, timeZone)}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: theme.primary,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              Semana · toca para ver día
            </ThemedText>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ alignItems: 'center' }}>
              <ThemedText
                style={[styles.weekTitle, { fontSize: isTablet ? 18 : 15 }]}
                numberOfLines={1}
              >
                {formatoFechaLargaEnZona(selectedDate, language, timeZone)}
              </ThemedText>
              {isOwner && (
                <ThemedText
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: theme.primary,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Día · toca para ver semana
                </ThemedText>
              )}
            </View>
            {!isToday(selectedDate, timeZone) && !isOwner && (
              <ThemedText
                style={[styles.todayBadge, { color: theme.primary, borderColor: theme.primary }]}
              >
                Hoy
              </ThemedText>
            )}
          </View>
        )}
      </Pressable>

      <Pressable onPress={handleNavNext} style={styles.navButton}>
        <Feather name="chevron-right" size={isTablet ? 28 : 24} color={theme.primary} />
      </Pressable>
    </View>
  )
}
