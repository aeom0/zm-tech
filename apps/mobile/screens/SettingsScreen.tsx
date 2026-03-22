import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { SettingsSection } from "./settings/components/SettingsSection";
import { SettingsRow } from "./settings/components/SettingsRow";
import { ThemeRow } from "./settings/components/ThemeRow";
import { BuildInfoCard } from "./settings/components/BuildInfoCard";
import { TokenWarningBanner } from "./settings/components/TokenWarningBanner";
import { useAppInfo } from "./settings/hooks/useAppInfo";

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config } = useTenant();
  const { profile, role } = useAuth();
  const appInfo = useAppInfo();

  const isAdmin = role === "dev" || role === "owner";

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
        },
      ]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <SettingsSection title="Apariencia">
        <ThemeRow />
      </SettingsSection>

      {isAdmin && (
        <SettingsSection title="Negocio">
          <SettingsRow
            label="Nombre comercial"
            value={config.businessName}
            variant="value"
          />
          <SettingsRow
            label="Tipo de negocio"
            value={config.businessType}
            variant="value"
          />
          <SettingsRow
            label="Moneda"
            value={config.locale.currency.symbol}
            variant="value"
          />
        </SettingsSection>
      )}

      <SettingsSection title="Cuenta">
        <SettingsRow
          label="Nombre"
          value={profile?.full_name ?? "—"}
          variant="value"
        />
        <SettingsRow label="Rol" value={role ?? "—"} variant="value" />
      </SettingsSection>

      {isAdmin && (
        <SettingsSection title="Sistema">
          <SettingsRow
            label="Versión app"
            value={appInfo.appVersion}
            variant="value"
          />
          <SettingsRow
            label="Canal EAS"
            value={appInfo.channel}
            variant="value"
          />
          <SettingsRow
            label="Runtime"
            value={appInfo.runtimeVersion}
            variant="value"
          />
          <BuildInfoCard visible={isAdmin} />
        </SettingsSection>
      )}

      {config.features?.whatsapp && (
        <SettingsSection title="WhatsApp">
          <TokenWarningBanner />
        </SettingsSection>
      )}

      <View style={{ marginTop: Spacing.lg, alignItems: "center" }}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {config.businessName} · SalonPro
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
