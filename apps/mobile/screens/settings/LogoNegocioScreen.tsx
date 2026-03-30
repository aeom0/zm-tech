/**
 * LogoNegocioScreen — Owner sube/cambia el logo del negocio.
 * Accesible desde Tab Más > Mi negocio > Logo del negocio.
 *
 * Comportamiento:
 * - Muestra logo actual si config.logo tiene valor, o placeholder con iniciales
 * - Botón "Cambiar logo" abre ImagePicker (cámara o galería)
 * - Al seleccionar, sube al bucket tenant-logos con useLogoUpload
 * - Guarda URL en TenantContext (updateTenant + syncRemote)
 * - Feedback visual: spinner durante upload, toast de éxito/error con Alert
 */
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTenant } from "@/contexts/TenantContext";
import { useLogoUpload } from "@/hooks/useLogoUpload";
import { Spacing, BorderRadius } from "@/constants/theme";

const LOGO_SIZE = 120;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function LogoNegocioScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config, updateTenant } = useTenant();
  const { uploading, uploadLogo } = useLogoUpload();
  const [localUri, setLocalUri] = useState<string | null>(null);

  const currentLogo = localUri || config.logo || null;
  const initials = getInitials(config.businessName || "SalonPro");

  const handleUpload = async (uri: string) => {
    setLocalUri(uri);
    const result = await uploadLogo(uri);
    if (result.ok && result.url) {
      await updateTenant({ logo: result.url }, { syncRemote: true });
      Alert.alert("✓ Logo guardado", "El logo se actualizó correctamente.");
    } else {
      setLocalUri(null);
      Alert.alert("Error", result.error ?? "No se pudo subir el logo.");
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería.");
      return;
    }

    Alert.alert("Logo del negocio", "¿De dónde quieres tomar el logo?", [
      {
        text: "Cámara",
        onPress: async () => {
          const cam = await ImagePicker.requestCameraPermissionsAsync();
          if (cam.status !== "granted") return;
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
          });
          if (!result.canceled && result.assets[0]) {
            await handleUpload(result.assets[0].uri);
          }
        },
      },
      {
        text: "Galería",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
          });
          if (!result.canceled && result.assets[0]) {
            await handleUpload(result.assets[0].uri);
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
        alignItems: "center",
      }}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Logo actual
      </ThemedText>

      <Animated.View entering={FadeIn.duration(400)} style={styles.logoWrap}>
        {currentLogo ? (
          <Image
            source={{ uri: currentLogo }}
            style={styles.logoImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.logoPlaceholder,
              { backgroundColor: "rgba(233,30,140,0.15)" },
            ]}
          >
            <ThemedText style={styles.logoInitials}>{initials}</ThemedText>
          </View>
        )}
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}
      </Animated.View>

      <ThemedText style={[styles.hintText, { color: theme.textSecondary }]}>
        Recomendado: imagen cuadrada de al menos 512×512px.{"\n"}
        Se mostrará en la pantalla de login de tu negocio.
      </ThemedText>

      <Pressable
        onPress={handlePickImage}
        disabled={uploading}
        style={({ pressed }) => [
          styles.pickButton,
          {
            borderColor: "rgba(233,30,140,0.6)",
            opacity: pressed || uploading ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="upload" size={18} color="#E91E8C" />
        <ThemedText style={[styles.pickButtonLabel, { color: "#E91E8C" }]}>
          {currentLogo ? "Cambiar logo" : "Subir logo"}
        </ThemedText>
      </Pressable>

      {currentLogo && (
        <Pressable
          onPress={async () => {
            Alert.alert(
              "Quitar logo",
              "¿Seguro que quieres quitar el logo? Se usarán las iniciales como fallback.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Quitar",
                  style: "destructive",
                  onPress: async () => {
                    setLocalUri(null);
                    await updateTenant({ logo: "" }, { syncRemote: true });
                  },
                },
              ],
            );
          }}
          style={styles.removeButton}
        >
          <ThemedText style={{ fontSize: 13, color: theme.error ?? "#E57373" }}>
            Quitar logo
          </ThemedText>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
    alignSelf: "flex-start",
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    position: "relative",
  },
  logoImage: { width: LOGO_SIZE, height: LOGO_SIZE },
  logoPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(233,30,140,0.3)",
  },
  logoInitials: { fontSize: 38, fontWeight: "700", color: "#E91E8C" },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing["2xl"],
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  pickButtonLabel: { fontSize: 15, fontWeight: "600" },
  removeButton: { marginTop: Spacing.sm, padding: Spacing.sm },
});

