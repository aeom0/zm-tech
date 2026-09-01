import { StyleSheet } from 'react-native'

import { BorderRadius, Spacing } from '@/constants/theme'

export const agendaStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  navButton: {
    padding: Spacing.sm,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexGrow: 0,
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
    paddingBottom: 4,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  dayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  todayBadge: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  employeeHeaders: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  empHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 3,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  empDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empHeaderName: {
    fontSize: 13,
    fontWeight: '600',
  },
  empSlot: {
    borderLeftWidth: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  aptBlock: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 6,
    marginBottom: 4,
  },
  aptClient: {
    fontSize: 13,
    fontWeight: '600',
  },
  aptService: {
    fontSize: 11,
    marginTop: 1,
  },
  aptSub: {
    fontSize: 10,
    marginTop: 1,
  },
  timeColumn: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  calendarContainer: {
    flex: 1,
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 0,
  },
  timeText: {
    fontSize: 11,
  },
  timeSlot: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 4,
    margin: 1,
    padding: 2,
    minHeight: 56,
  },
  appointmentChip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderLeftWidth: 3,
    marginBottom: 2,
  },
  chipName: {
    fontSize: 10,
    fontWeight: '600',
  },
  chipSub: {
    fontSize: 8,
    fontWeight: '500',
    marginTop: 1,
  },
  chipEmployee: {
    fontSize: 8,
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTablet: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    maxHeight: '85%',
  },
  modalContentTablet: {
    borderRadius: BorderRadius.xl,
    width: 560,
    maxHeight: '80%',
  },
  contentWithPicker: {
    flex: 1,
    maxHeight: '92%',
    paddingHorizontal: 0,
  },
  svcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  svcName: { fontSize: 14, fontWeight: '500' },
  svcDetail: { fontSize: 12, marginTop: 2 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  totalLabel: { fontSize: 13 },
  totalPrice: { fontSize: 15, fontWeight: '700' },
  addSvcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    justifyContent: 'center',
  },
  addSvcBtnText: { fontSize: 14, fontWeight: '600' },
  detailScroll: {
    flexGrow: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  chipsContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  emptyText: {
    fontSize: 13,
    flex: 1,
  },

  serviceChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 120,
  },

  pickerTabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pickerTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pickerTabText: {
    fontSize: 12,
    fontWeight: '600',
  },

  summaryLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  summaryLineInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  serviceChipName: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceChipDetail: {
    fontSize: 11,
    marginTop: 2,
  },

  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  employeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInitial: {
    fontSize: 13,
    fontWeight: '700',
  },
  employeeChipName: {
    fontSize: 14,
    fontWeight: '600',
  },

  summaryCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryEmployeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
  },

  submitButton: {
    height: 52,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing['3xl'],
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  availabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  availabilityBannerText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },

  // Selector de método de pago (al marcar cita completada) — mismo patrón que Dashboard
  payMethodBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  payMethodTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  payMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  payMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  payMethodActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  payMethodCancel: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  payMethodCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
