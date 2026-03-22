import React from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { ThemedText } from "@/components/ThemedText";

import { DashboardAnimatedView } from "../hooks/useStaggeredAnimation";
import { dashboardStyles as styles } from "../dashboardStyles";

interface DashboardHeaderProps {
  greeting: string;
  displayNameSuffix: string;
  dateLabel: string;
  businessInitials: string;
  primaryColor: string;
  theme: {
    text: string;
    textSecondary: string;
  };
  animatedStyle?: StyleProp<ViewStyle>;
}

export function DashboardHeader({
  greeting,
  displayNameSuffix,
  dateLabel,
  businessInitials,
  primaryColor,
  theme,
  animatedStyle,
}: DashboardHeaderProps) {
  return (
    <DashboardAnimatedView style={[styles.header, animatedStyle]}>
      <View>
        <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>
          {greeting}
          {displayNameSuffix}
        </ThemedText>
        <ThemedText
          style={[styles.dateText, { color: theme.text }]}
          numberOfLines={1}
        >
          {dateLabel}
        </ThemedText>
      </View>
      <View style={[styles.logoMark, { backgroundColor: `${primaryColor}12` }]}>
        <ThemedText style={[styles.logoLetter, { color: primaryColor }]}>
          {businessInitials}
        </ThemedText>
      </View>
    </DashboardAnimatedView>
  );
}
