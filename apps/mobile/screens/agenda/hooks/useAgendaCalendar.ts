import { useMemo } from "react";

export function useAgendaCalendar(selectedDate: Date) {
  const weekStart = useMemo(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    return date;
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  return { weekStart, weekDays };
}
