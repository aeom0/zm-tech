import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { ThemedText } from '@/components/ThemedText'
import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'

import { AusenciasTab } from './components/AusenciasTab'
import { HorarioTab } from './components/HorarioTab'
import { ServiciosTab } from './components/ServiciosTab'

type Props = NativeStackScreenProps<MoreStackParamList, 'DisponibilidadPersonal'>
type TabKey = 'servicios' | 'horario' | 'ausencias'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'servicios', label: 'Servicios' },
  { key: 'horario', label: 'Horario' },
  { key: 'ausencias', label: 'Ausencias' },
]

/** Servicios, horario semanal, ausencias y coberturas de una profesional (Plan 18). */
export default function DisponibilidadPersonalScreen({ route }: Props) {
  const { employeeId, employeeName } = route.params
  const { theme } = useTheme()
  const headerHeight = useHeaderHeight()
  const { config } = useTenant()
  const staffSingular = config.terminology.staffSingular || 'Profesional'
  const [tab, setTab] = useState<TabKey>('servicios')

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: headerHeight + Spacing.md }]}>
        <ThemedText type="h4">{employeeName}</ThemedText>
        <View
          style={[
            styles.segment,
            { borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
          ]}
        >
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segmentItem, active && { backgroundColor: theme.primary }]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: active ? theme.buttonText : theme.textSecondary,
                    fontWeight: '600',
                  }}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            )
          })}
        </View>
      </View>

      {tab === 'servicios' && (
        <ServiciosTab employeeId={employeeId} staffSingular={staffSingular} />
      )}
      {tab === 'horario' && <HorarioTab employeeId={employeeId} staffSingular={staffSingular} />}
      {tab === 'ausencias' && (
        <AusenciasTab
          employeeId={employeeId}
          employeeName={employeeName}
          staffSingular={staffSingular}
          timezone={config.locale.timezone}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: BorderRadius.md, padding: 3 },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm + 4,
  },
})
