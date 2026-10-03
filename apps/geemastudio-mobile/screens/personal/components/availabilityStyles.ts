import { StyleSheet } from 'react-native'

import { BorderRadius, Spacing } from '@/constants/theme'

/** Estilos compartidos por las pestañas de disponibilidad (los colores vienen del tema). */
export const av = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['3xl'] },
  card: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  grow: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    minHeight: 44,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  iconBtn: {
    minHeight: 44,
    minWidth: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: Spacing.sm },
})
