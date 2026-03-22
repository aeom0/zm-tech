import React from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/ThemedText";

import type { AgendaEmployee } from "../types";
import { agendaStyles as styles } from "../agendaStyles";

interface AgendaEmployeeHeadersProps {
  employees: AgendaEmployee[];
  timeColWidth: number;
  columnWidth: number;
  theme: {
    text: string;
    border: string;
    backgroundDefault: string;
  };
}

export function AgendaEmployeeHeaders({
  employees,
  timeColWidth,
  columnWidth,
  theme,
}: AgendaEmployeeHeadersProps) {
  return (
    <View
      style={[
        styles.employeeHeaders,
        {
          borderBottomColor: theme.border,
          backgroundColor: theme.backgroundDefault,
        },
      ]}
    >
      <View style={{ width: timeColWidth }} />
      {employees.map((emp) => (
        <View
          key={emp.id}
          style={[
            styles.empHeader,
            {
              width: columnWidth,
              borderLeftColor: emp.color,
            },
          ]}
        >
          <View style={[styles.empDot, { backgroundColor: emp.color }]} />
          <ThemedText
            style={[styles.empHeaderName, { color: theme.text }]}
            numberOfLines={1}
          >
            {emp.name.split(" ")[0]}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}
