import React from 'react'
import { View, ScrollView, Pressable, Modal, Platform, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'

import { financesStyles as financesModalStyles } from '../financesStyles'
import { PeriodSelector } from './PeriodSelector'
import { PaymentList } from './PaymentList'
import type { FinancesPayment, FinancesPaymentType, FinancesPeriod } from '../types'

interface Props {
  visible: boolean
  period: FinancesPeriod
  payments: FinancesPayment[]
  serviceNameById: Record<string, string>
  pendienteByAppointmentId: Record<string, number>
  appointmentNameById: Record<string, { client_name: string; service_id: string | null }>
  isAdmin: boolean
  isStaffOnly: boolean
  isTablet: boolean
  onChangePeriod: (p: FinancesPeriod) => void
  onClose: () => void
  onEditPayment: (payment: FinancesPayment) => void
  onDeletePayment: (payment: FinancesPayment) => void
  onOpenNewPayment: (aptId?: string, type?: FinancesPaymentType) => void
}

export function PaymentHistoryModal({
  visible,
  period,
  onChangePeriod,
  onClose,
  ...listProps
}: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: (Platform.OS === 'android' ? insets.top : 0) + Spacing.lg }]}>
          <ThemedText style={financesModalStyles.modalTitle}>
            {listProps.isStaffOnly ? 'Mis pagos' : 'Historial de pagos'}
          </ThemedText>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Cerrar"
            style={[
              financesModalStyles.closeButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="x" size={18} color={theme.text} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + Spacing['3xl'],
          }}
          showsVerticalScrollIndicator={false}
        >
          <PeriodSelector period={period} onChangePeriod={onChangePeriod} />
          <PaymentList {...listProps} showTitle={false} />
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
})
