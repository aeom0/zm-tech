import React, { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { Spacing } from '@/constants/theme'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'
import { SettingsSection } from './settings/components/SettingsSection'
import { SettingsRow } from './settings/components/SettingsRow'
import { CurrencyPickerModal } from './settings/components/CurrencyPickerModal'
import { CountryPickerModal } from './settings/components/CountryPickerModal'
import { TerminologyEditModal } from './settings/components/TerminologyEditModal'
import type { Moneda } from './settings/constants'
import { getCountryPreset, localeFromCountry, type CountryPreset } from '@zmtech/tenant-config'

type Nav = NativeStackNavigationProp<MoreStackParamList, 'Configuracion'>

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { config, updateTenant } = useTenant()
  const { profile, role } = useAuth()
  const navigation = useNavigation<Nav>()

  const [modalMonedaVisible, setModalMonedaVisible] = useState(false)
  const [modalPaisVisible, setModalPaisVisible] = useState(false)
  const [modalTerminologiaVisible, setModalTerminologiaVisible] = useState(false)

  const isAdmin = role === 'dev' || role === 'owner'
  const paisActual = getCountryPreset(config.locale.country)

  const handleSeleccionarPais = async (pais: CountryPreset) => {
    const locale = localeFromCountry(pais.code)
    if (!locale) return
    await updateTenant({ locale }, { syncRemote: true })
  }

  const handleSeleccionarMoneda = async (moneda: Moneda) => {
    await updateTenant(
      {
        locale: {
          ...config.locale,
          currency: { code: moneda.code, symbol: moneda.symbol },
        },
      },
      { syncRemote: true }
    )
  }

  const handleGuardarTerminologia = async (staff: string, staffSingular: string) => {
    await updateTenant(
      {
        terminology: {
          ...config.terminology,
          staff,
          staffSingular,
        },
      },
      { syncRemote: true }
    )
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isAdmin && (
          <SettingsSection title="Negocio">
            <SettingsRow
              label="Logo del negocio"
              variant="navigate"
              icon="image"
              onPress={() => navigation.navigate('LogoNegocio')}
            />
            <SettingsRow
              label="Colores de marca"
              variant="navigate"
              icon="droplet"
              onPress={() => navigation.navigate('ColoresNegocio')}
            />
            <SettingsRow label="Nombre comercial" value={config.businessName} variant="value" />
            <SettingsRow label="Tipo de negocio" value={config.businessType} variant="value" />
            <SettingsRow
              label="País"
              value={
                paisActual ? `${paisActual.flag} ${paisActual.label}` : config.locale.country || '—'
              }
              variant="navigate"
              icon="globe"
              onPress={() => setModalPaisVisible(true)}
            />
            <SettingsRow
              label="Moneda"
              value={`${config.locale.currency.symbol} · ${config.locale.currency.code}`}
              variant="navigate"
              icon="dollar-sign"
              onPress={() => setModalMonedaVisible(true)}
            />
            <SettingsRow
              label="Nombre del personal"
              value={config.terminology.staff}
              variant="navigate"
              icon="users"
              onPress={() => setModalTerminologiaVisible(true)}
            />
          </SettingsSection>
        )}

        <SettingsSection title="Cuenta">
          <SettingsRow label="Nombre" value={profile?.full_name ?? '—'} variant="value" />
          <SettingsRow label="Rol" value={role ?? '—'} variant="value" />
        </SettingsSection>

        <View style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {config.businessName} · GeemaStudio
          </ThemedText>
        </View>
      </ScrollView>

      <CountryPickerModal
        visible={modalPaisVisible}
        currentCode={config.locale.country}
        onSelect={handleSeleccionarPais}
        onClose={() => setModalPaisVisible(false)}
      />

      <CurrencyPickerModal
        visible={modalMonedaVisible}
        currentCode={config.locale.currency.code}
        onSelect={handleSeleccionarMoneda}
        onClose={() => setModalMonedaVisible(false)}
      />

      <TerminologyEditModal
        visible={modalTerminologiaVisible}
        staff={config.terminology.staff}
        staffSingular={config.terminology.staffSingular}
        onSave={handleGuardarTerminologia}
        onClose={() => setModalTerminologiaVisible(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
