import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useHaptics } from '@/hooks/useHaptics'
import { Spacing } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import type { MoreStackParamList } from '@/navigation/MoreStackNavigator'

import type { ClienteSegmento, PromoBroadcast, PromoBroadcastItem, PromoStep } from './types'
import { StepConfig } from './components/StepConfig'
import { StepClientes } from './components/StepClientes'
import { StepPreview } from './components/StepPreview'
import { StepEnviando } from './components/StepEnviando'
import { StepResultado } from './components/StepResultado'
import { usePromoBroadcast } from './hooks/usePromoBroadcast'

const STEP_LABELS: Record<PromoStep, string> = {
  config: 'Configura la promo',
  clientes: 'Selecciona las clientas',
  preview: 'Revisa el mensaje',
  enviando: 'Enviando promo',
  resultado: 'Resultado',
}

const STEP_INDEX: Record<PromoStep, number> = {
  config: 1,
  clientes: 2,
  preview: 3,
  enviando: 4,
  resultado: 5,
}

const DEFAULT_TITLE = ''
const DEFAULT_BODY = ''

function normalizeTemplateBody(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export default function PromoMasivaScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const haptics = useHaptics()
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>()

  const [step, setStep] = useState<PromoStep>('config')
  const [titulo, setTitulo] = useState(DEFAULT_TITLE)
  const [bodyText, setBodyText] = useState(DEFAULT_BODY)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [selectedClients, setSelectedClients] = useState<ClienteSegmento[]>([])
  const [activeBroadcast, setActiveBroadcast] = useState<PromoBroadcast | null>(null)
  const [failedItems, setFailedItems] = useState<PromoBroadcastItem[]>([])

  const { createBroadcast, sendBroadcast, pollBroadcastStatus } = usePromoBroadcast()

  useEffect(() => {
    if (createBroadcast.isError) {
      Alert.alert('Error', (createBroadcast.error as Error).message ?? 'No se pudo crear la campaña')
    }
  }, [createBroadcast.isError, createBroadcast.error])

  useEffect(() => {
    if (sendBroadcast.isError) {
      Alert.alert('Error', (sendBroadcast.error as Error).message ?? 'No se pudo enviar la promo')
    }
  }, [sendBroadcast.isError, sendBroadcast.error])

  const resetAll = () => {
    setStep('config')
    setTitulo(DEFAULT_TITLE)
    setBodyText(DEFAULT_BODY)
    setImageUri(null)
    setImageUrl(null)
    setSelectedClients([])
    setActiveBroadcast(null)
    setFailedItems([])
  }

  const handleConfigNext = () => {
    setStep('clientes')
  }

  const handleClientesNext = () => {
    if (!selectedClients.length) return
    setStep('preview')
  }

  const handleConfirmSend = async () => {
    if (!imageUrl || !selectedClients.length) {
      Alert.alert('Falta info', 'Completa el texto, imagen y selección de clientas antes de enviar.')
      return
    }

    const normalizedBodyText = normalizeTemplateBody(bodyText)

    Alert.alert(
      'Confirmar envío',
      `Se enviará esta promo a ${selectedClients.length} clientas por WhatsApp. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          style: 'destructive',
          onPress: async () => {
            try {
              haptics.warning()
              const broadcast = await createBroadcast.mutateAsync({
                title: titulo.trim() || 'Promo',
                bodyText: normalizedBodyText,
                imageUrl,
                clients: selectedClients,
              })
              setActiveBroadcast(broadcast)
              setStep('enviando')

              let sendRequestLost = false
              try {
                await sendBroadcast.mutateAsync(broadcast.id)
              } catch (sendError) {
                // La función puede seguir procesando aunque el cliente pierda
                // la respuesta HTTP por la duración del envío masivo.
                sendRequestLost = true
                console.warn(
                  '[PromoMasivaScreen] Respuesta de envío no recibida; consultando estado:',
                  sendError
                )
              }

              const final = await pollBroadcastStatus(
                broadcast.id,
                (b) => setActiveBroadcast(b),
                sendRequestLost
              )

              const { data: items } = await supabase
                .from('promo_broadcast_items')
                .select('*')
                .eq('broadcast_id', final.id)
                .eq('status', 'failed')

              setFailedItems((items ?? []) as PromoBroadcastItem[])
              setActiveBroadcast(final)
              setStep('resultado')
              haptics.success()
            } catch (err) {
              console.error('[PromoMasivaScreen] Error enviando promo:', err)
              Alert.alert('Error', 'Algo falló al enviar la promo. Revisa tu conexión o inténtalo de nuevo.')
              setStep('resultado')
            }
          },
        },
      ]
    )
  }

  const currentStepIndex = STEP_INDEX[step]

  const total = selectedClients.length
  const sent = activeBroadcast?.total_sent ?? 0
  const failed = activeBroadcast?.total_failed ?? 0

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        },
      ]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing['2xl'],
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Paso {currentStepIndex} de 5
          </ThemedText>
          <ThemedText type="h2" style={{ marginTop: Spacing.xs }}>
            {STEP_LABELS[step]}
          </ThemedText>
        </View>

        <View style={{ marginTop: Spacing['2xl'] }}>
          {step === 'config' && (
            <StepConfig
              titulo={titulo}
              bodyText={bodyText}
              imageUri={imageUri}
              imageUrl={imageUrl}
              onChangeTitulo={setTitulo}
              onChangeBodyText={setBodyText}
              onChangeImage={(uri, url) => {
                setImageUri(uri)
                setImageUrl(url)
              }}
              onValidNext={handleConfigNext}
            />
          )}

          {step === 'clientes' && (
            <StepClientes
              selectedClients={selectedClients}
              onChangeSelected={setSelectedClients}
              onNext={handleClientesNext}
            />
          )}

          {step === 'preview' && (
            <StepPreview
              titulo={titulo}
              bodyText={normalizeTemplateBody(bodyText)}
              imageUrl={imageUrl}
              selectedCount={selectedClients.length}
              onConfirmSend={handleConfirmSend}
            />
          )}

          {step === 'enviando' && <StepEnviando total={total} sent={sent} failed={failed} />}

          {step === 'resultado' && (
            <StepResultado
              totalSent={sent}
              totalFailed={failed}
              failedItems={failedItems}
              onNuevaPromo={resetAll}
              onVerHistorial={() => navigation.navigate('HistorialPromos')}
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.md,
  },
})
