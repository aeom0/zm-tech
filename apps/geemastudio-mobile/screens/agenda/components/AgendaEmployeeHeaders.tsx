import React from 'react'
import { View, Pressable } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'

import type { AgendaEmployee } from '../types'
import { agendaStyles as styles } from '../agendaStyles'

interface AgendaEmployeeHeadersProps {
  employees: AgendaEmployee[]
  timeColWidth: number
  columnWidth: number
  theme: {
    text: string
    border: string
    backgroundDefault: string
    backgroundSecondary: string
    primary: string
  }
  /** Toca un empleado para filtrar solo sus citas; null = todos */
  selectedEmployeeId?: string | null
  onEmployeePress?: (employeeId: string) => void
}

export function AgendaEmployeeHeaders({
  employees,
  timeColWidth,
  columnWidth,
  theme,
  selectedEmployeeId = null,
  onEmployeePress,
}: AgendaEmployeeHeadersProps) {
  return (
    <View
      style={[
        styles.employeeHeaders,
        {
          borderBottomColor: theme.border,
          backgroundColor: theme.backgroundDefault,
        },
      ]}
    >
      <View style={{ width: timeColWidth }} />
      {employees.map((emp) => {
        const initial = (emp.name?.trim().split(/\s+/)[0] ?? '?').slice(0, 1)
        const uri = emp.avatar_url?.trim()
        const selected = selectedEmployeeId === emp.id

        const inner = (
          <>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: selected ? 3 : 2,
                borderColor: selected ? theme.primary : emp.color,
                backgroundColor: theme.backgroundSecondary,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <ThemedText
                  style={{
                    color: emp.color,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {initial.toUpperCase()}
                </ThemedText>
              )}
            </View>
            <ThemedText style={[styles.empHeaderName, { color: theme.text }]} numberOfLines={1}>
              {emp.name.split(' ')[0]}
            </ThemedText>
          </>
        )

        return (
          <View
            key={emp.id}
            style={[
              styles.empHeader,
              {
                width: columnWidth,
                borderLeftColor: emp.color,
              },
            ]}
          >
            {onEmployeePress ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onEmployeePress(emp.id)
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filtrar citas de ${emp.name}`}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {inner}
              </Pressable>
            ) : (
              inner
            )}
          </View>
        )
      })}
    </View>
  )
}
