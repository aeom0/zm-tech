import React from "react";
import { ScrollView, View, Pressable } from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

import type { AgendaEmployee } from "../types";

interface OwnerStaffAvatarStripProps {
  employees: AgendaEmployee[];
  theme: {
    text: string;
    textMuted: string;
    border: string;
    backgroundSecondary: string;
  };
  columnWidth: number;
  scrollRef?: React.RefObject<ScrollView>;
  onScroll?: (x: number) => void;
  onEmployeePress?: (employeeId: string, index: number) => void;
}

export function OwnerStaffAvatarStrip({
  employees,
  theme,
  columnWidth,
  scrollRef,
  onScroll,
  onEmployeePress,
}: OwnerStaffAvatarStripProps) {
  if (employees.length === 0) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll ? (e) => onScroll(e.nativeEvent.contentOffset.x) : undefined}
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.md,
        paddingTop: 2,
        paddingBottom: 2,
        gap: Spacing.sm,
        alignItems: "flex-start",
      }}
    >
      {employees.map((emp, index) => {
        const firstName = (emp.name?.trim().split(/\s+/)[0] ?? "?");
        const initial = firstName.slice(0, 1).toUpperCase();

        return (
          <Pressable
            key={emp.id}
            onPress={() => onEmployeePress?.(emp.id, index)}
            style={({ pressed }) => ({
              width: Math.max(72, Math.min(columnWidth, 120)),
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
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
                  {initial}
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
              {firstName}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
