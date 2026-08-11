// ============================================================
// Chips de filtro (exclusivos + chip suelto)
// ============================================================
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import { hapticLight } from '../../utils/haptics';

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'warning';
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'warning';
}

export function FilterChip({
  label,
  selected,
  onPress,
  icon,
  tone = 'default',
}: FilterChipProps) {
  const isWarning = tone === 'warning';
  const active = selected;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && !isWarning && styles.chipActive,
        active && isWarning && styles.chipWarningActive,
        !active && isWarning && styles.chipWarningIdle,
      ]}
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      activeOpacity={0.8}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={
            active && isWarning
              ? colors.semantic.warning
              : active
                ? colors.text.inverse
                : isWarning
                  ? colors.text.secondary
                  : colors.text.secondary
          }
        />
      ) : null}
      <Text
        style={[
          styles.chipText,
          active && !isWarning && styles.chipTextActive,
          active && isWarning && { color: colors.semantic.warning },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface FilterChipsProps<T extends string> {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  style,
}: FilterChipsProps<T>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          icon={opt.icon}
          tone={opt.tone}
          selected={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.bg.border,
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  chipWarningIdle: {
    borderColor: colors.bg.border,
  },
  chipWarningActive: {
    borderColor: colors.semantic.warning,
    backgroundColor: colors.semantic.warning + '18',
  },
  chipText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  chipTextActive: {
    color: colors.text.inverse,
  },
});
