import React from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import type { TenantConfig } from "@zmtech/tenant-config";
import { formatCurrency } from "@/utils/format";
import { Shadows } from "@/constants/theme";

import type { Promo } from "../types";

interface PromoCardProps {
  promo: Promo;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleActive?: () => void;
  isToggling?: boolean;
  theme: {
    backgroundDefault: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    accent: string;
    success: string;
    error: string;
  };
  config: TenantConfig;
}

function formatExpires(iso: string | null): string {
  if (!iso) {
    return "Sin vencimiento";
  }
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function PromoCard({
  promo,
  onPress,
  onLongPress,
  onToggleActive,
  isToggling,
  theme,
  config,
}: PromoCardProps) {
  const raw = promo.promo_price;
  const n = raw != null ? parseFloat(raw) : NaN;
  const amount = Number.isFinite(n) ? n : 0;
  const badge = (promo.badge ?? "✨").trim() || "✨";
  const accent = promo.accent_color?.trim() || theme.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: promo.is_active ? 1 : 0.65,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.mainPress,
          { transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View style={styles.topRow}>
          <View style={[styles.badgeWrap, { borderColor: accent + "55" }]}>
            <ThemedText style={styles.badgeEmoji}>{badge}</ThemedText>
          </View>
          <View style={styles.titleBlock}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {promo.title}
            </ThemedText>
            <ThemedText style={[styles.expires, { color: theme.textMuted }]}>
              <Feather name="calendar" size={11} color={theme.textMuted} />{" "}
              {formatExpires(promo.expires_at)}
            </ThemedText>
          </View>
          <View style={styles.priceCol}>
            <ThemedText style={[styles.promoPrice, { color: theme.accent }]}>
              {formatCurrency(amount, config)}
            </ThemedText>
            <ThemedText
              style={[
                styles.statusPill,
                {
                  color: promo.is_active ? theme.success : theme.error,
                },
              ]}
            >
              {promo.is_active ? "Activa" : "Inactiva"}
            </ThemedText>
          </View>
        </View>
      </Pressable>
      {onToggleActive && (
        <Pressable
          style={styles.toggleRow}
          onPress={onToggleActive}
          disabled={isToggling}
        >
          <ThemedText style={[styles.toggleLabel, { color: theme.textMuted }]}>
            Activo
          </ThemedText>
          {isToggling ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather
              name={promo.is_active ? "toggle-right" : "toggle-left"}
              size={28}
              color={promo.is_active ? theme.primary : theme.textMuted}
            />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 8,
    overflow: "hidden",
    ...Shadows.sm,
  },
  mainPress: {
    padding: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  badgeWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEmoji: {
    fontSize: 22,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  expires: {
    fontSize: 12,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  promoPrice: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
  },
  toggleLabel: {
    fontSize: 13,
  },
});
