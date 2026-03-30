import React from "react";
import { ScrollView, View } from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

import type { AgendaEmployee } from "../types";
import { abbreviateStaffRole } from "../agendaUtils";

interface OwnerStaffAvatarStripProps {
  employees: AgendaEmployee[];
  theme: {
    text: string;
    textMuted: string;
    border: string;
    backgroundSecondary: string;
  };
  columnWidth: number;
}

export function OwnerStaffAvatarStrip({
  employees,
  theme,
  columnWidth,
}: OwnerStaffAvatarStripProps) {
  if (employees.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        gap: Spacing.md,
        alignItems: "flex-start",
      }}
    >
      {employees.map((emp) => {
        const initial = (emp.name?.trim().split(/\s+/)[0] ?? "?").slice(0, 1);
        const abbr = abbreviateStaffRole(emp.role);
        return (
          <View
            key={emp.id}
            style={{
              width: Math.max(72, Math.min(columnWidth, 120)),
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 2,
                borderColor: emp.color,
                backgroundColor: theme.backgroundSecondary,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {emp.avatar_url?.trim() ? (
                <Image
                  source={{ uri: emp.avatar_url.trim() }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <ThemedText
                  style={{
                    color: emp.color,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  {initial.toUpperCase()}
                </ThemedText>
              )}
            </View>
            <ThemedText
              numberOfLines={1}
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: "600",
                color: theme.text,
                textAlign: "center",
                maxWidth: "100%",
              }}
            >
              {emp.name.split(" ")[0]} ({abbr})
            </ThemedText>
          </View>
        );
      })}
    </ScrollView>
  );
}
