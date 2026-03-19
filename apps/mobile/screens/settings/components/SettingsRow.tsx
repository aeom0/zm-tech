import React from "react";
import { View, StyleSheet, Pressable, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { SettingsRowVariant } from "../types";

interface SettingsRowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  value?: string;
  variant?: SettingsRowVariant;
  onPress?: () => void;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  disabled?: boolean;
}

export function SettingsRow({
  icon,
  label,
  description,
  value,
  variant = "navigate",
  onPress,
  toggleValue = false,
  onToggleChange,
  disabled = false,
}: SettingsRowProps) {
  const { theme } = useTheme();

  const content = (
    <View style={styles.row}>
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: `${theme.primary}18` },
          ]}
        >
          <Feather name={icon} size={18} color={theme.primary} />
        </View>
      ) : null}
      <View style={styles.textContainer}>
        <ThemedText style={[styles.label, { color: theme.text }]}>
          {label}
        </ThemedText>
        {description ? (
          <ThemedText
            type="small"
            style={[styles.description, { color: theme.textMuted }]}
          >
            {description}
          </ThemedText>
        ) : null}
      </View>
      {variant === "value" && value ? (
        <ThemedText
          style={[styles.value, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {value}
        </ThemedText>
      ) : null}
      {variant === "navigate" ? (
        <Feather name="chevron-right" size={18} color={theme.textMuted} />
      ) : null}
      {variant === "toggle" ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          thumbColor={theme.primary}
        />
      ) : null}
    </View>
  );

  const isPressable = (variant === "navigate" || variant === "action") && !!onPress;

  if (!isPressable) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  description: {
    marginTop: 2,
  },
  value: {
    marginLeft: Spacing.md,
    fontSize: 13,
  },
});

