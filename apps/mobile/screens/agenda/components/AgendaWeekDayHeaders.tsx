import React from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius } from "@/constants/theme";

import { DAYS_ES } from "../constants";
import { agendaStyles as styles } from "../agendaStyles";
import { isToday } from "../agendaUtils";

interface AgendaWeekDayHeadersProps {
  weekDays: Date[];
  timeColWidth: number;
  theme: {
    primary: string;
    textMuted: string;
    border: string;
  };
}

export function AgendaWeekDayHeaders({
  weekDays,
  timeColWidth,
  theme,
}: AgendaWeekDayHeadersProps) {
  return (
    <View style={[styles.dayHeaders, { borderBottomColor: theme.border }]}>
      <View style={[styles.timeColumn, { width: timeColWidth }]} />
      {weekDays.map((date, index) => (
        <View
          key={index}
          style={[
            styles.dayHeader,
            isToday(date) && {
              backgroundColor: theme.primary + "12",
              borderRadius: BorderRadius.xs,
            },
          ]}
        >
          <ThemedText style={[styles.dayName, { color: theme.textMuted }]}>
            {DAYS_ES[date.getDay()]}
          </ThemedText>
          <ThemedText
            style={[
              styles.dayNumber,
              isToday(date) && {
                color: theme.primary,
                fontWeight: "700",
              },
            ]}
          >
            {date.getDate()}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}
