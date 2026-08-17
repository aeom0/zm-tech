// Selector de categoría ML manual (sin predictor API) + campo color condicional.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  buscarCategoriasManual,
  categoriaManualPorId,
  type MlManualCategory,
} from '../../constants/mlManualCategories';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

interface Props {
  categoryId: string;
  categoryName: string;
  color: string;
  onSelectCategory: (category: MlManualCategory) => void;
  onColorChange: (value: string) => void;
}

export function MlCategoryManualSection({
  categoryId,
  categoryName,
  color,
  onSelectCategory,
  onColorChange,
}: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const selected = categoriaManualPorId(categoryId);
  const requiresColor = selected?.requiresColor ?? false;
  const resultados = useMemo(() => buscarCategoriasManual(search), [search]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>MercadoLibre — categoría manual</Text>
      <Text style={styles.hint}>
        Sin API en Venezuela eliges la categoría del publicador masivo. Si no está en la lista,
        pega el ID que ves en ML.
      </Text>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={categoryName ? styles.selectorValue : styles.selectorPlaceholder}>
            {categoryName || 'Seleccionar categoría ML…'}
          </Text>
          {categoryId ? <Text style={styles.selectorMeta}>{categoryId}</Text> : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.text.secondary}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.picker}>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar categoría o ID MLV…"
            placeholderTextColor={colors.text.disabled}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {resultados.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.option, cat.id === categoryId && styles.optionActive]}
                onPress={() => {
                  onSelectCategory(cat);
                  setExpanded(false);
                  setSearch('');
                }}
              >
                <Text style={styles.optionName}>{cat.name}</Text>
                <Text style={styles.optionId}>{cat.id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Text style={styles.label}>ID categoría ML (opcional)</Text>
      <TextInput
        style={styles.input}
        value={categoryId}
        onChangeText={(id) => {
          const trimmed = id.trim().toUpperCase();
          const known = categoriaManualPorId(trimmed);
          onSelectCategory(
            known ?? { id: trimmed, name: trimmed ? 'Categoría personalizada' : '' },
          );
        }}
        placeholder="Ej: MLV438380"
        placeholderTextColor={colors.text.disabled}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {requiresColor ? (
        <>
          <Text style={styles.label}>Color *</Text>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={onColorChange}
            placeholder="Ej: Negro, Plateado, Rojo"
            placeholderTextColor={colors.text.disabled}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>Esta categoría suele exigir el atributo COLOR en ML.</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.size.sm,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectorValue: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  selectorPlaceholder: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
  },
  selectorMeta: {
    marginTop: 2,
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
  },
  picker: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    marginBottom: spacing.sm,
    maxHeight: 220,
  },
  search: {
    padding: spacing.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  list: {
    maxHeight: 180,
  },
  option: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bg.border,
  },
  optionActive: {
    backgroundColor: colors.brand.orange + '22',
  },
  optionName: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  optionId: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
    marginTop: 2,
  },
  label: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
});
