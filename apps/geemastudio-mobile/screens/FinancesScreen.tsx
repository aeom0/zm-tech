import React, { useMemo, useState } from 'react'
import { View, ScrollView, Pressable, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'

import { ErrorState } from '@/components/ErrorState'
import { useTheme } from '@/hooks/useTheme'
import { useResponsive } from '@/hooks/useResponsive'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing } from '@/constants/theme'
import { queryClient } from '@/lib/query-client'
import { useAuth } from '@/contexts/AuthContext'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/MainTabNavigator'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'

import { PeriodSelector } from './finances/components/PeriodSelector'
import { ViewToggle } from './finances/components/ViewToggle'
import { RevenueCard } from './finances/components/RevenueCard'
import { EmployeeBreakdown } from './finances/components/EmployeeBreakdown'
import { ServicesRankCard } from './finances/components/ServicesRankCard'
import { PaymentList } from './finances/components/PaymentList'
import { PaymentModal } from './finances/components/PaymentModal'
import { KpiGrid } from './finances/components/executive/KpiGrid'
import { GrowthChart } from './finances/components/executive/GrowthChart'
import { ExpenseList } from './finances/components/executive/ExpenseList'
import { ExpenseModal } from './finances/components/executive/ExpenseModal'
import {
  buildFinancesDateRanges,
  getTenantBillingMonthKey,
  shiftMonth,
} from './finances/lib/billingMonth'
import {
  useFinancesData,
} from './finances/hooks/useFinancesData'
import { usePaymentForm } from './finances/hooks/usePaymentForm'
import {
  useExecutiveSummary,
  type GrowthRange,
} from './finances/hooks/useExecutiveSummary'
import { useExpenses } from './finances/hooks/useExpenses'
import { financesStyles as styles } from './finances/financesStyles'
import type {
  FinanceView,
  FinancesPeriod,
  OperationalExpense,
} from './finances/types'

export default function FinancesScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config } = useTenant()
  const { isAdmin } = useAuth()
  const { isTablet } = useResponsive()
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        NativeStackNavigationProp<MoreStackParamList, 'Finanzas'>,
        BottomTabNavigationProp<MainTabParamList, 'More'>
      >
    >()

  const [period, setPeriod] = useState<FinancesPeriod>('week')
  const [view, setView] = useState<FinanceView>('detalle')
  const [growthRange, setGrowthRange] = useState<GrowthRange>('6m')
  const [expenseModalVisible, setExpenseModalVisible] = useState(false)
  const [editingExpense, setEditingExpense] = useState<OperationalExpense | null>(null)

  const timezone = config.locale.timezone
  const currentMonth = `${getTenantBillingMonthKey(timezone)}-01`
  const growthFrom = useMemo(() => {
    if (growthRange === '12m') return shiftMonth(currentMonth, -11)
    if (growthRange === 'all') return shiftMonth(currentMonth, -35)
    return shiftMonth(currentMonth, -5)
  }, [growthRange, currentMonth])

  const { data: monthlySummary = [], refetch: refetchSummary } = useExecutiveSummary(
    growthFrom,
    currentMonth
  )
  const expensesHook = useExpenses(currentMonth)

  const currentKpi = useMemo(() => {
    const row = monthlySummary.find((r) => r.month.slice(0, 10) === currentMonth)
    return {
      ingresos: row?.revenue ?? 0,
      gastos: row?.expenses ?? 0,
      ads: row?.ads_spend ?? 0,
    }
  }, [monthlySummary, currentMonth])

  const utilidad = currentKpi.ingresos - currentKpi.gastos - currentKpi.ads
  const margenPct =
    currentKpi.ingresos > 0
      ? Math.round((utilidad / currentKpi.ingresos) * 1000) / 10
      : null

  const dateRanges = useMemo(() => buildFinancesDateRanges(timezone), [timezone])
  const currentRange = dateRanges[period]

  const {
    payments,
    recentAppointments,
    serviceNameById,
    abonoPrevioByApt,
    pendienteByAppointmentId,
    desglosePorChica,
    topServicesRanking,
    totalRevenue,
    totalAbono,
    employeeEarningsTotal,
    employeeEarningsAbonoTotal,
    chartDataByPeriod,
    isLoading,
    isError,
    refetch,
  } = useFinancesData(period, currentRange)

  const form = usePaymentForm(recentAppointments, abonoPrevioByApt)

  const appointmentNameById = useMemo(() => {
    const map: Record<string, { client_name: string; service_id: string | null }> = {}
    for (const apt of recentAppointments) {
      map[apt.id] = {
        client_name: apt.client_name,
        service_id: apt.service_id,
      }
    }
    return map
  }, [recentAppointments])

  const isStaffOnly = !isAdmin
  const displayTotal = isStaffOnly ? employeeEarningsTotal : totalRevenue
  const abonoDisplayTotal = isStaffOnly ? employeeEarningsAbonoTotal : totalAbono

  const handleRefresh = () => {
    void refetch()
    void refetchSummary()
    void expensesHook.refetch()
    void queryClient.invalidateQueries({ queryKey: ['payments'] })
    void queryClient.invalidateQueries({ queryKey: ['executive_financial_summary'] })
    void queryClient.invalidateQueries({ queryKey: ['operational_expenses'] })
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {isAdmin && <ViewToggle view={view} onChangeView={setView} />}

        {isError ? (
          <ErrorState
            compact
            message="No pudimos cargar los pagos. Desliza para reintentar o toca el botón."
            onRetry={refetch}
          />
        ) : null}

        {isAdmin && view === 'resumen' ? (
          <>
            <KpiGrid
              ingresos={currentKpi.ingresos}
              gastos={currentKpi.gastos}
              ads={currentKpi.ads}
              utilidad={utilidad}
              margenPct={margenPct}
            />
            <GrowthChart
              data={monthlySummary}
              range={growthRange}
              onChangeRange={setGrowthRange}
            />
            <ExpenseList
              expenses={expensesHook.expenses}
              onEdit={(row) => {
                setEditingExpense(row)
                setExpenseModalVisible(true)
              }}
            />
          </>
        ) : (
          <>
            <PeriodSelector period={period} onChangePeriod={setPeriod} />

            <View style={isTablet ? styles.kpiRowTablet : undefined}>
              <RevenueCard
                period={period}
                displayTotal={displayTotal}
                totalAbono={totalAbono}
                abonoDisplayTotal={abonoDisplayTotal}
                paymentsCount={payments.length}
                isStaffOnly={isStaffOnly}
                chartData={chartDataByPeriod}
                isTablet={isTablet}
              />
            </View>

            {isAdmin && <EmployeeBreakdown desglose={desglosePorChica} />}
            {isAdmin && <ServicesRankCard data={topServicesRanking} />}

            <PaymentList
              payments={payments}
              serviceNameById={serviceNameById}
              pendienteByAppointmentId={pendienteByAppointmentId}
              appointmentNameById={appointmentNameById}
              isAdmin={isAdmin}
              isStaffOnly={isStaffOnly}
              isTablet={isTablet}
              onEditPayment={form.openEditPayment}
              onDeletePayment={form.handleDelete}
              onOpenNewPayment={form.openNewPayment}
            />
          </>
        )}
      </ScrollView>

      {isAdmin && (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => {
            if (view === 'resumen') {
              setEditingExpense(null)
              setExpenseModalVisible(true)
            } else {
              form.openNewPayment()
            }
          }}
        >
          <Feather name="plus" size={24} color={theme.buttonText} />
        </Pressable>
      )}

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

      <ExpenseModal
        visible={expenseModalVisible}
        expenseMonth={currentMonth}
        editing={editingExpense}
        isPending={expensesHook.isSaving || expensesHook.isDeleting}
        isTablet={isTablet}
        onClose={() => {
          setExpenseModalVisible(false)
          setEditingExpense(null)
        }}
        onSubmit={async (data) => {
          try {
            await expensesHook.saveExpense({
              id: editingExpense?.id,
              data: {
                category: data.category,
                label: data.label,
                amount: data.amount,
                expense_month: data.expense_month,
                expense_date: data.amount == null ? null : currentMonth,
              },
            })
            setExpenseModalVisible(false)
            setEditingExpense(null)
          } catch {
            // El error ya se muestra al usuario via Alert en onError de la mutación;
            // se deja el modal abierto para reintentar.
          }
        }}
        onDelete={
          editingExpense
            ? async (id) => {
                try {
                  await expensesHook.deleteExpenseById(id)
                  setExpenseModalVisible(false)
                  setEditingExpense(null)
                } catch {
                  // idem: Alert ya mostrado en onError, modal se mantiene abierto
                }
              }
            : undefined
        }
      />
    </View>
  )
}
