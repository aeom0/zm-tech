/**
 * Registro de notificaciones push y guardado del token en profiles.push_token.
 * Usa getDevicePushTokenAsync() → token nativo (FCM en Android, APNs en iOS).
 * Envío: Edge Function send-notification (FCM v1) en el proyecto Supabase compartido
 * (desplegada desde repo ZM; Opción A — no portar a geemastudio-server).
 *
 * Tipos de data:
 * - waba_chat → abre panel web /panel/waba/mensajes
 * - appointment_reference → se encola cuando exista deep link Agenda (P19)
 */
import { useEffect, useRef } from 'react'
import * as Device from 'expo-device'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'

/** Panel Geema (prod temporal hasta geemastudio.app). Override con EXPO_PUBLIC_SITE_URL. */
const PANEL_BASE =
  (typeof process.env.EXPO_PUBLIC_SITE_URL === 'string' &&
  process.env.EXPO_PUBLIC_SITE_URL.trim()
    ? process.env.EXPO_PUBLIC_SITE_URL.trim().replace(/\/$/, '')
    : 'https://geema.zmtechdev.com') + '/panel/waba/mensajes'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function registerForPushNotifications(
  businessName: string,
  lightColor: string
): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] No es un dispositivo físico, se omite registro de push')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permisos de notificaciones no concedidos, estado:', finalStatus)
    return null
  }

  if (Platform.OS === 'android') {
    const channels = [
      { id: 'default', name: 'General' },
      { id: 'waba-chat', name: 'Chats de clientas' },
      { id: 'waba-alerts', name: 'Alertas importantes' },
      { id: 'waba-appointments', name: 'Citas y referencias' },
    ]
    await Promise.all(
      channels.map(({ id, name }) =>
        Notifications.setNotificationChannelAsync(id, {
          name: `${businessName} · ${name}`,
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor,
        })
      )
    )
  }

  const tokenData = await Notifications.getDevicePushTokenAsync()
  return tokenData.data
}

function handleNotificationData(data: Record<string, unknown> | undefined): void {
  if (!data || typeof data.type !== 'string') return

  if (data.type === 'waba_chat') {
    // Preferir phone → panel Geema (el payload del bot ZM trae url zmlashnails.com).
    const phone =
      typeof data.phone === 'string' && data.phone.trim() ? data.phone.trim() : ''
    const url = phone
      ? `${PANEL_BASE}?phone=${encodeURIComponent(phone)}`
      : typeof data.url === 'string' && data.url.trim()
        ? data.url
        : PANEL_BASE
    void Linking.openURL(url)
  }
}

export function useNotifications(userId: string | null) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)
  const { config } = useTenant()

  useEffect(() => {
    if (!userId) return

    registerForPushNotifications(config.businessName, config.theme.primaryColor).then(
      async (token) => {
        if (!token) return

        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId)

        if (error) {
          console.error('[Notifications] No se pudo guardar push_token:', error.message)
          return
        }
        console.log('[Notifications] push_token guardado en profiles')
      }
    )

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      handleNotificationData(
        response.notification.request.content.data as Record<string, unknown> | undefined
      )
    })

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notificación recibida:', notification.request.content.title)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationData(
        response.notification.request.content.data as Record<string, unknown> | undefined
      )
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [userId, config.businessName, config.theme.primaryColor])
}
