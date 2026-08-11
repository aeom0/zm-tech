// ============================================================
// Empty state centrado para listas
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing } from '../../utils/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = 'cube-outline',
  title,
  subtitle,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name={icon} size={48} color={colors.text.disabled} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    textAlign: 'center',
    opacity: 0.8,
  },
});
