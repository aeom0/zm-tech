import { View, StyleSheet, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Spacing } from "@/constants/theme";

export default function ProfileScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { config } = useTenant();

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <ThemedText type="h3" style={styles.title}>
          Perfil
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Panel de gestión {config.businessName}
        </ThemedText>

        <View style={styles.logoutSection}>
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.logoutButton,
              {
                borderColor: theme.error,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="log-out" size={20} color={theme.error} />
            <ThemedText style={[styles.logoutText, { color: theme.error }]}>
              Cerrar sesión
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: Spacing["3xl"],
  },
  logoutSection: {
    marginTop: Spacing.xl,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "transparent",
    borderWidth: 1,
    height: 52,
    borderRadius: 9999,
  },
  logoutText: {
    fontWeight: "600",
  },
});
