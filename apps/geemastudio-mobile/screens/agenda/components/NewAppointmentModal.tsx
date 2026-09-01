import React from 'react'
import { View, Modal, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'

import type { TenantConfig, TimeFormatPreference } from '@zmtech/tenant-config'
import {
  formatoHoraInstanteEnZona,
  instanteCitaEnZona,
  zonaIANASegura,
} from '@zmtech/tenant-config'

import type {
  AgendaEmployee,
  AgendaFormState,
  AgendaPack,
  AgendaService,
  AgendaServiceCategory,
} from '../types'
import { agendaStyles as styles } from '../agendaStyles'
import { CategoriaSection } from './newAppointment/CategoriaSection'
import { ClienteSection } from './newAppointment/ClienteSection'
import { FechaHoraSection } from './newAppointment/FechaHoraSection'
import type { NewAppointmentModalTheme } from './newAppointment/modalTheme'
import { ServicioSection } from './newAppointment/ServicioSection'
import { StaffSection } from './newAppointment/StaffSection'
import { SummaryCard } from './newAppointment/SummaryCard'

export type { NewAppointmentModalTheme }

interface NewAppointmentModalProps {
  visible: boolean
  onClose: () => void
  isTablet: boolean
  theme: NewAppointmentModalTheme
  currencySymbol: string
  selectedDate: Date
  selectedHour: number
  selectedMinute: number
  agendaHours: number[]
  businessHours: TenantConfig['businessHours']
  timeZone: string
  language: TenantConfig['locale']['language']
  timeFormat: TimeFormatPreference
  onChangeDate: (d: Date) => void
  onChangeHour: (h: number) => void
  onChangeMinute: (m: number) => void
  formData: AgendaFormState
  setFormData: React.Dispatch<React.SetStateAction<AgendaFormState>>
  categories: AgendaServiceCategory[]
  services: AgendaService[]
  servicesByCategory: AgendaService[]
  selectedCategory: AgendaServiceCategory | undefined
  servicesLoading: boolean
  servicesError: unknown
  employeesLoading: boolean
  employeesError: unknown
  employees: AgendaEmployee[]
  packs: AgendaPack[]
  packsLoading: boolean
  formatDateLabel: (d: Date) => string
  onSubmit: () => void
  createPending: boolean
  availabilityStatus?: 'idle' | 'checking' | 'free' | 'busy' | 'error'
  busyUntilLabel?: string | null
  isBusy?: boolean
  staffSingular: string
  staffPlural: string
  /** p. ej. terminology.client — "clienta" / "cliente" */
  clientLabel: string
}

export function NewAppointmentModal({
  visible,
  onClose,
  isTablet,
  theme,
  currencySymbol,
  selectedDate,
  selectedHour,
  selectedMinute,
  agendaHours,
  businessHours,
  timeZone,
  language,
  timeFormat,
  onChangeDate,
  onChangeHour,
  onChangeMinute,
  formData,
  setFormData,
  categories,
  services,
  servicesByCategory,
  selectedCategory,
  servicesLoading,
  servicesError,
  employeesLoading,
  employeesError,
  employees,
  packs,
  packsLoading,
  formatDateLabel,
  onSubmit,
  createPending,
  availabilityStatus = 'idle',
  busyUntilLabel = null,
  isBusy = false,
  staffSingular,
  staffPlural,
  clientLabel,
}: NewAppointmentModalProps) {
  const clientSectionTitle = clientLabel.charAt(0).toUpperCase() + clientLabel.slice(1)

  const disableSubmit = createPending || isBusy || availabilityStatus === 'checking'

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.backgroundDefault },
            isTablet && styles.modalContentTablet,
          ]}
        >
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>Nueva Cita</ThemedText>
              <ThemedText style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                {formatDateLabel(selectedDate)} a las{' '}
                {formatoHoraInstanteEnZona(
                  instanteCitaEnZona(
                    selectedDate,
                    selectedHour,
                    zonaIANASegura(timeZone),
                    selectedMinute
                  ),
                  zonaIANASegura(timeZone),
                  language,
                  timeFormat
                )}
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
          >
            <ClienteSection
              theme={theme}
              formData={formData}
              setFormData={setFormData}
              clientLabel={clientSectionTitle}
            />

            <FechaHoraSection
              theme={theme}
              selectedDate={selectedDate}
              selectedHour={selectedHour}
              selectedMinute={selectedMinute}
              agendaHours={agendaHours}
              businessHours={businessHours}
              timeZone={timeZone}
              language={language}
              timeFormat={timeFormat}
              onChangeDate={onChangeDate}
              onChangeHour={onChangeHour}
              onChangeMinute={onChangeMinute}
            />

            <CategoriaSection
              theme={theme}
              formData={formData}
              setFormData={setFormData}
              categories={categories}
            />

            <ServicioSection
              theme={theme}
              currencySymbol={currencySymbol}
              formData={formData}
              setFormData={setFormData}
              servicesByCategory={servicesByCategory}
              selectedCategory={selectedCategory}
              servicesLoading={servicesLoading}
              servicesError={servicesError}
              packs={packs}
              packsLoading={packsLoading}
            />

            <StaffSection
              theme={theme}
              formData={formData}
              setFormData={setFormData}
              employees={employees}
              employeesLoading={employeesLoading}
              employeesError={employeesError}
              staffSingular={staffSingular}
              staffPlural={staffPlural}
            />

            {formData.serviceLines.length > 0 ? (
              <SummaryCard
                theme={theme}
                currencySymbol={currencySymbol}
                serviceLines={formData.serviceLines}
                services={services}
                employees={employees}
                staffSingular={staffSingular}
              />
            ) : null}

            {availabilityStatus === 'busy' ? (
              <View
                style={[
                  styles.availabilityBanner,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Feather name="alert-triangle" size={18} color={theme.text} />
                <ThemedText style={[styles.availabilityBannerText, { color: theme.text }]}>
                  Horario ocupado
                  {busyUntilLabel ? `. Termina a las ${busyUntilLabel}` : ''}.
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary },
              disableSubmit && { opacity: 0.65 },
            ]}
            onPress={onSubmit}
            disabled={disableSubmit}
          >
            {createPending || availabilityStatus === 'checking' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="calendar" size={18} color="#FFFFFF" />
                <ThemedText style={styles.submitButtonText}>
                  {isBusy ? 'Horario ocupado' : 'Crear Cita'}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
