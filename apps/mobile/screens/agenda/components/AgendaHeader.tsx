import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  formatoFechaCortaEnZona,
  formatoFechaLargaEnZona,
} from "@salonpro/tenant-config";
import { Spacing } from "@/constants/theme";

import { agendaStyles as styles } from "../agendaStyles";
import { isToday } from "../agendaUtils";

export type OwnerViewMode = "day" | "week";

interface AgendaHeaderProps {
  isTablet: boolean;
  /** En teléfono: navegar día a día (vista dueño/profesional) en lugar de saltar semana. */
  mobileDayMode?: boolean;
  theme: {
    primary: string;
    backgroundRoot: string;
    border: string;
    textMuted: string;
  };
  language: string;
  timeZone: string;
  selectedDate: Date;
  weekDays: Date[];
  paddingTop: number;
  onChangeWeek: (delta: number) => void;
  onChangeDay: (delta: number) => void;
  onGoToToday: () => void;
  /** Solo para el owner: modo actual de la vista */
  ownerViewMode?: OwnerViewMode;
  /** Callback al tocar la etiqueta de fecha — toggle day/week para el owner */
  onToggleOwnerView?: () => void;
}

export function AgendaHeader({
  isTablet,
  mobileDayMode = false,
  theme,
  language,
  timeZone,
  selectedDate,
  weekDays,
  paddingTop,
  onChangeWeek,
  onChangeDay,
  onGoToToday,
  ownerViewMode,
  onToggleOwnerView,
}: AgendaHeaderProps) {
  const showOwnerToggle = ownerViewMode !== undefined && !!onToggleOwnerView;
  const isWeekMode = ownerViewMode === "week";

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop,
          backgroundColor: theme.backgroundRoot,
        },
      ]}
    >
      {isTablet || mobileDayMode ? (
        <>
          {/* Flecha izquierda */}
          <Pressable
            onPress={() => isWeekMode ? onChangeWeek(-1) : onChangeDay(-1)}
            style={styles.navButton}
          >
            <Feather
              name="chevron-left"
              size={isTablet ? 28 : 24}
              color={theme.primary}
            />
          </Pressable>

          {/* Centro: fecha + badge Hoy + pill de modo (day/week) */}
          <View style={[styles.dayTitleContainer, { gap: Spacing.xs }]}>
            <Pressable
              onPress={showOwnerToggle ? onToggleOwnerView : onGoToToday}
              style={styles.dayTitleContainer}
            >
              <ThemedText
                style={[
                  styles.weekTitle,
                  { fontSize: isTablet ? 18 : 16 },
                ]}
              >
                {isWeekMode
                  ? `${formatoFechaCortaEnZona(weekDays[0], language, timeZone)} – ${formatoFechaCortaEnZona(weekDays[6], language, timeZone)}`
                  : formatoFechaLargaEnZona(selectedDate, language, timeZone)}
              </ThemedText>
              {!isWeekMode && !isToday(selectedDate, timeZone) && (
                <ThemedText
                  style={[
                    styles.todayBadge,
                    { color: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  Hoy
                </ThemedText>
              )}
            </Pressable>

            {/* Pill modo — solo para owner */}
            {showOwnerToggle && (
              <Pressable
                onPress={onToggleOwnerView}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: theme.primary + "18",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Feather
                  name={isWeekMode ? "calendar" : "grid"}
                  size={12}
                  color={theme.primary}
                />
                <ThemedText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: theme.primary,
                  }}
                >
                  {isWeekMode ? "Semana" : "Día"}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* Flecha derecha */}
          <Pressable
            onPress={() => isWeekMode ? onChangeWeek(1) : onChangeDay(1)}
            style={styles.navButton}
          >
            <Feather
              name="chevron-right"
              size={isTablet ? 28 : 24}
              color={theme.primary}
            />
          </Pressable>
        </>
      ) : (
        <>
          <Pressable onPress={() => onChangeWeek(-1)} style={styles.navButton}>
            <Feather name="chevron-left" size={24} color={theme.primary} />
          </Pressable>
          <Pressable onPress={onGoToToday}>
            <ThemedText style={styles.weekTitle}>
              {formatoFechaCortaEnZona(weekDays[0], language, timeZone)}{" "}
              -{" "}
              {formatoFechaCortaEnZona(weekDays[6], language, timeZone)}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => onChangeWeek(1)} style={styles.navButton}>
            <Feather name="chevron-right" size={24} color={theme.primary} />
          </Pressable>
        </>
      )}
    </View>
  );
}
