import { useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
// push_token sync deshabilitado en modo Express (sin tabla profiles)
import { useTenant } from "@/contexts/TenantContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(
  channelName: string,
  lightColor: string,
): Promise<string | null> {
  if (!Device.isDevice) {
    // eslint-disable-next-line no-console
    console.log(
      "[Notifications] No es un dispositivo físico, se omite registro de push",
    );
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    // eslint-disable-next-line no-console
    console.log(
      "[Notifications] Permisos de notificaciones no concedidos, estado:",
      finalStatus,
    );
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: channelName,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor,
    });
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  // eslint-disable-next-line no-console
  console.log("[Notifications] Push token nativo obtenido:", tokenData.data);
  return tokenData.data;
}

export function useNotifications(userId: string | null) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const { config } = useTenant();

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications(
      config.businessName,
      config.theme.primaryColor,
    ).then(async (token) => {
      if (!token) return;

      // TODO: guardar push_token en BD cuando se implemente auth
      console.log("Push token obtenido:", token);
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "Notificación recibida:",
          notification.request.content.title,
        );
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "Notificación abierta:",
          response.notification.request.content.title,
        );
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);
}
