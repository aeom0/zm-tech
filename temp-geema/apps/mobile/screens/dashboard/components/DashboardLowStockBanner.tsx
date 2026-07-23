import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import {
  DashboardAnimatedView,
  type DashboardAnimatedStyle,
} from "../hooks/useStaggeredAnimation";
import { dashboardStyles as styles } from "../dashboardStyles";

interface DashboardLowStockBannerProps {
  count: number;
  isDark: boolean;
  theme: {
    gold: string;
    textSecondary: string;
  };
  animatedStyle?: DashboardAnimatedStyle;
}

export function DashboardLowStockBanner({
  count,
  isDark,
  theme,
  animatedStyle,
}: DashboardLowStockBannerProps) {
  return (
    <DashboardAnimatedView
      style={[
        styles.alertBanner,
        {
          backgroundColor: isDark ? "#3A2800" : "#FFF8E7",
          borderColor: theme.gold,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.alertIcon, { backgroundColor: `${theme.gold}20` }]}>
        <Feather name="alert-triangle" size={16} color={theme.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.alertTitle, { color: theme.gold }]}>
          Stock bajo
        </ThemedText>
        <ThemedText style={[styles.alertBody, { color: theme.textSecondary }]}>
          {count} producto{count > 1 ? "s" : ""} necesitan reposición
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={16} color={theme.gold} />
    </DashboardAnimatedView>
  );
}
