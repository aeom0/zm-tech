import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, Role } from "@/contexts/AuthContext";
import { useHaptics } from "@/hooks/useHaptics";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { MoreStackParamList } from "@/navigation/MoreStackNavigator";
import { useTenant } from "@/contexts/TenantContext";
import { usePendingBadgeCount } from "@/hooks/usePendingBadgeCount";

type Nav = NativeStackNavigationProp<MoreStackParamList, "MoreHome">;

const roleDisplay: Record<Role, string> = {
  dev: "Desarrollador",
  owner: "Propietaria",
  staff: "Staff",
};

function ProfileCard() {
  const { profile } = useAuth();
  const navigation = useNavigation<Nav>();
  const haptics = useHaptics();

  if (!profile) return null;

  const handlePress = () => {
    haptics.light();
    navigation.navigate("Perfil");
  };

  return (
    <Card
      onPress={handlePress}
      style={{
        padding: Spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: Spacing["2xl"],
      }}
    >
      <Image
        source={{
          uri:
            profile.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              profile.full_name || "User",
            )}&background=random`,
        }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <ThemedText type="h4">{profile.full_name || "Usuario"}</ThemedText>
        <ThemedText type="small" style={{ opacity: 0.7 }}>
          {roleDisplay[profile.role]}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.light.textMuted} />
    </Card>
  );
}

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  badgeCount?: number;
}

function MenuRow({
  icon,
  label,
  onPress,
  isDestructive = false,
  badgeCount,
}: MenuItemProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const iconColor = isDestructive ? theme.error : theme.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View
        style={[styles.menuIconWrap, { backgroundColor: `${iconColor}18` }]}
      >
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.menuLabelContainer}>
        <ThemedText style={[styles.menuLabel, { color: theme.text }]}>
          {label}
        </ThemedText>
        {typeof badgeCount === "number" && badgeCount > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.primary },
            ]}
          >
            <ThemedText style={styles.badgeText}>
              {badgeCount}
            </ThemedText>
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={theme.textMuted} />
    </Pressable>
  );
}

export default function MoreHomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isAdmin, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const haptics = useHaptics();
  const { config } = useTenant();

  const { paymentValidationCount, unassignedCount } = usePendingBadgeCount();

  const handleLogout = () => {
    haptics.warning();
    Alert.alert("Cerrar sesión", "¿Estás seguro de que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ProfileCard />

      {isAdmin && (
        <>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            Administración
          </ThemedText>
          <MenuRow
            icon="credit-card"
            label="Validación de Pagos"
            onPress={() =>
              Alert.alert(
                "Validación de Pagos",
                `Hay ${paymentValidationCount} pago(s) pendiente(s) de aprobación. Esta sección estará disponible próximamente.`,
              )
            }
            badgeCount={paymentValidationCount}
          />
          <MenuRow
            icon="users"
            label={`Asignar ${config.terminology.staff || "Profesionales"}`}
            onPress={() =>
              Alert.alert(
                `Asignar ${config.terminology.staff || "Profesionales"}`,
                `Hay ${unassignedCount} cita(s) sin asignar en los próximos 7 días. Esta sección estará disponible próximamente.`,
              )
            }
            badgeCount={unassignedCount}
          />
          <MenuRow
            icon="bar-chart-2"
            label="Finanzas"
            onPress={() => navigation.navigate("Finanzas")}
          />
          <MenuRow
            icon="user-check"
            label={config.terminology.staff || "Profesionales"}
            onPress={() => navigation.navigate("Personal")}
          />
          <MenuRow
            icon="users"
            label="Clientes"
            onPress={() => navigation.navigate("Clients")}
          />
          <MenuRow
            icon="package"
            label="Inventario"
            onPress={() => navigation.navigate("Inventario")}
          />
          {config.features?.whatsapp && (
            <MenuRow
              icon="megaphone"
              label="Enviar Promo WA"
              onPress={() => {
                Alert.alert(
                  "Próximamente",
                  "El envío masivo de promociones por WhatsApp estará disponible en una próxima versión.",
                );
              }}
            />
          )}
        </>
      )}

      <ThemedText
        style={[
          styles.sectionTitle,
          { marginTop: isAdmin ? Spacing["2xl"] : 0 },
          { color: theme.textSecondary },
        ]}
      >
        Cuenta y Preferencias
      </ThemedText>
      <MenuRow
        icon="settings"
        label="Configuración"
        onPress={() => navigation.navigate("Configuracion")}
      />

      <View style={{ marginTop: Spacing["2xl"] }}>
        <MenuRow
          icon="log-out"
          label="Cerrar sesión"
          onPress={handleLogout}
          isDestructive
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.lg,
    backgroundColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuLabelContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  badge: {
    minWidth: 20,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
