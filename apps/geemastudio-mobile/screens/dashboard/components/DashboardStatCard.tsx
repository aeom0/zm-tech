import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import {
  DashboardAnimatedView,
  type DashboardAnimatedStyle,
} from "../hooks/useStaggeredAnimation";
import { dashboardStyles as styles } from "../dashboardStyles";

interface DashboardStatCardProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
  style?: DashboardAnimatedStyle;
  isTablet: boolean;
  theme: {
    backgroundDefault: string;
    border: string;
    textSecondary: string;
    textMuted: string;
  };
}

export function DashboardStatCard({
  icon,
  label,
  value,
  color,
  subtitle,
  style,
  isTablet,
  theme,
}: DashboardStatCardProps) {
  return (
    <DashboardAnimatedView
      style={[
        styles.statCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        isTablet && styles.statCardTablet,
        style,
      ]}
    >
      <View style={[styles.statIconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={isTablet ? 22 : 18} color={color} />
      </View>
      <ThemedText
        style={[styles.statValue, { color, fontSize: isTablet ? 26 : 22 }]}
      >
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.statSubtitle, { color: theme.textMuted }]}>
          {subtitle}
        </ThemedText>
      ) : null}
    </DashboardAnimatedView>
  );
}
