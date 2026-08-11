// ============================================================
// Barra de búsqueda reutilizable
// ============================================================
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius } from '../../utils/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.bar, style]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={colors.text.secondary}
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          accessibilityLabel="Limpiar búsqueda"
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
});
