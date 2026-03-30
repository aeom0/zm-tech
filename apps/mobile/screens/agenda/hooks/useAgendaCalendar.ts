import { useMemo } from "react";

import { calcularSemanaAgenda } from "@salonpro/tenant-config";

export function useAgendaCalendar(selectedDate: Date, timeZone: string) {
  const { weekStart, weekDays } = useMemo(
    () => calcularSemanaAgenda(selectedDate, timeZone),
    [selectedDate, timeZone],
  );

  return { weekStart, weekDays };
}
