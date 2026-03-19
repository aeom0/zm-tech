import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import type { UnassignedAppointment } from '../types';

interface Employee {
  id: string;
  name: string;
  color: string;
}

interface AsignarRowProps {
  item: UnassignedAppointment;
  employees: Employee[];
  isSaving: boolean;
  onAssign: (employeeId: string) => void;
  locale: string; // config.locale.language
}

export function AsignarRow({
  item,
  employees,
  isSaving,
  onAssign,
  locale,
}: AsignarRowProps) {
  const { theme } = useTheme();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const fecha = new Date(item.date).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const selectedEmployeeName = selectedEmployeeId
    ? employees.find(e => e.id === selectedEmployeeId)?.name.split(' ')[0]
    : undefined;

  const handleConfirm = () => {
    if (!selectedEmployeeId || isSaving) return;
    onAssign(selectedEmployeeId);
    // Resetear selección local tras enviar (la fila desaparecerá si el query invalida)
    setSelectedEmployeeId(null);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Info cita */}
      <View style={styles.infoRow}>
        <View style={styles.infoMain}>
          <ThemedText style={[styles.clientName, { color: theme.text }]}>
            {item.client_name}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: theme.textSecondary }]}>
            {item.serviceName} · {fecha}
          </ThemedText>
        </View>
        <View
          style={[
            styles.warningBadge,
            { backgroundColor: theme.warning + '20' },
          ]}
        >
          <Feather name="alert-circle" size={14} color={theme.warning} />
        </View>
      </View>

      {/* Selector de profesional — chips horizontales */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {employees.map(emp => {
          const isSelected = selectedEmployeeId === emp.id;
          return (
            <Pressable
              key={emp.id}
              onPress={() => setSelectedEmployeeId(emp.id)}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? emp.color + 'CC'
                    : theme.backgroundSecondary,
                  borderColor: isSelected ? emp.color : theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {isSelected && (
                <Feather name="check" size={12} color="#FFFFFF" />
              )}
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? '#FFFFFF' : theme.textSecondary,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {emp.name.split(' ')[0]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Botón confirmar — solo visible si hay selección */}
      {selectedEmployeeId && (
        <Pressable
          onPress={handleConfirm}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.btnConfirm,
            {
              backgroundColor: theme.primary,
              opacity: pressed || isSaving ? 0.7 : 1,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="user-check" size={16} color="#FFFFFF" />
              <ThemedText style={styles.btnText}>
                Asignar a {selectedEmployeeName}
              </ThemedText>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoMain: {
    flex: 1,
    gap: 3,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  warningBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  btnConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: BorderRadius.md,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
