import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  formatoFechaCortaEnZona,
  formatoFechaLargaEnZona,
} from "@salonpro/tenant-config";

import { agendaStyles as styles } from "../agendaStyles";
import { isToday } from "../agendaUtils";

interface AgendaHeaderProps {
  isTablet: boolean;
  theme: {
    primary: string;
    backgroundRoot: string;
  };
  language: string;
  timeZone: string;
  selectedDate: Date;
  weekDays: Date[];
  paddingTop: number;
  onChangeWeek: (delta: number) => void;
  onChangeDay: (delta: number) => void;
  onGoToToday: () => void;
}

export function AgendaHeader({
  isTablet,
  theme,
  language,
  timeZone,
  selectedDate,
  weekDays,
  paddingTop,
  onChangeWeek,
  onChangeDay,
  onGoToToday,
}: AgendaHeaderProps) {
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
      {isTablet ? (
        <>
          <Pressable onPress={() => onChangeDay(-1)} style={styles.navButton}>
            <Feather name="chevron-left" size={28} color={theme.primary} />
          </Pressable>
          <Pressable onPress={onGoToToday} style={styles.dayTitleContainer}>
            <ThemedText style={[styles.weekTitle, { fontSize: 18 }]}>
              {formatoFechaLargaEnZona(selectedDate, language, timeZone)}
            </ThemedText>
            {!isToday(selectedDate, timeZone) && (
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
          <Pressable onPress={() => onChangeDay(1)} style={styles.navButton}>
            <Feather name="chevron-right" size={28} color={theme.primary} />
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
