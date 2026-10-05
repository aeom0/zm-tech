import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { MenuRow } from '@/components/MenuRow'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'
import { usePendingBadgeCount } from '@/hooks/usePendingBadgeCount'
import { useResponsive } from '@/hooks/useResponsive'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'
import { buildFinancesDateRanges, useFinancesData } from '@/screens/finances/hooks/useFinancesData'
import { usePaymentForm } from '@/screens/finances/hooks/usePaymentForm'
import { PaymentModal } from '@/screens/finances/components/PaymentModal'
import { PaymentHistoryModal } from '@/screens/finances/components/PaymentHistoryModal'
import { ProductSaleModal } from '@/screens/finances/components/ProductSaleModal'
import type { FinancesPeriod } from '@/screens/finances/types'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'FinanzasMenu'>

export default function FinanzasMenuScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const navigation = useNavigation<Nav>()
  const { paymentValidationCount } = usePendingBadgeCount()
  const { isAdmin } = useAuth()
  const { config } = useTenant()
  const { isTablet } = useResponsive()

  const [period, setPeriod] = useState<FinancesPeriod>('week')
  const [historyVisible, setHistoryVisible] = useState(false)
  const [productSaleVisible, setProductSaleVisible] = useState(false)
  /** iOS no apila dos Modal: al editar desde el historial se oculta y se reabre al cerrar el pago. */
  const reopenHistoryRef = useRef(false)

  const dateRanges = useMemo(
    () => buildFinancesDateRanges(config.locale.timezone),
    [config.locale.timezone]
  )
  const {
    payments,
    recentAppointments,
    serviceNameById,
    abonoPrevioByApt,
    pendienteByAppointmentId,
  } = useFinancesData(period, dateRanges[period])
  const form = usePaymentForm(recentAppointments, abonoPrevioByApt)

  const appointmentNameById = useMemo(() => {
    const map: Record<string, { client_name: string; service_id: string | null }> = {}
    for (const apt of recentAppointments) {
      map[apt.id] = { client_name: apt.client_name, service_id: apt.service_id }
    }
    return map
  }, [recentAppointments])

  useEffect(() => {
    if (!form.modalVisible && reopenHistoryRef.current) {
      reopenHistoryRef.current = false
      setHistoryVisible(true)
    }
  }, [form.modalVisible])

  const openFromHistory = (open: () => void) => {
    reopenHistoryRef.current = true
    setHistoryVisible(false)
    open()
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isAdmin ? (
          <MenuRow icon="plus-circle" label="Nuevo pago" onPress={() => form.openNewPayment()} />
        ) : null}
        {isAdmin ? (
          <MenuRow
            icon="shopping-bag"
            label="Venta de producto"
            onPress={() => setProductSaleVisible(true)}
          />
        ) : null}
        <MenuRow
          icon="list"
          label={isAdmin ? 'Historial de pagos' : 'Mis pagos'}
          onPress={() => setHistoryVisible(true)}
        />
        <MenuRow
          icon="bar-chart-2"
          label="Finanzas"
          onPress={() => navigation.navigate('Finanzas')}
        />
        <MenuRow
          icon="credit-card"
          label="Validación de Pagos"
          onPress={() => navigation.navigate('ValidacionPagos')}
          badgeCount={paymentValidationCount}
        />
      </ScrollView>

      <PaymentHistoryModal
        visible={historyVisible}
        period={period}
        payments={payments}
        serviceNameById={serviceNameById}
        pendienteByAppointmentId={pendienteByAppointmentId}
        appointmentNameById={appointmentNameById}
        isAdmin={isAdmin}
        isStaffOnly={!isAdmin}
        isTablet={isTablet}
        onChangePeriod={setPeriod}
        onClose={() => setHistoryVisible(false)}
        onEditPayment={(payment) => openFromHistory(() => form.openEditPayment(payment))}
        onDeletePayment={form.handleDelete}
        onOpenNewPayment={(aptId, type) => openFromHistory(() => form.openNewPayment(aptId, type))}
      />

      <PaymentModal
        visible={form.modalVisible}
        editingPayment={form.editingPayment}
        paymentType={form.paymentType}
        formData={form.formData}
        setFormData={form.setFormData}
        selectedAppointmentId={form.selectedAppointmentId}
        abonoAmount={form.abonoAmount}
        currencySymbol={form.currencySymbol}
        recentAppointments={recentAppointments}
        abonoPrevioByApt={abonoPrevioByApt}
        isPending={form.isPending}
        isTablet={isTablet}
        navigation={navigation}
        onClose={form.closeModal}
        onChangePaymentType={form.onChangePaymentType}
        onSelectAppointment={form.onSelectAppointment}
        onSubmit={form.handleSubmit}
        onDelete={form.handleDelete}
      />

      {productSaleVisible ? (
        <ProductSaleModal
          visible
          appointments={recentAppointments}
          isTablet={isTablet}
          onClose={() => setProductSaleVisible(false)}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
