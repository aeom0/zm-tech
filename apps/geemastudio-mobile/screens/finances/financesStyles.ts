import { StyleSheet } from "react-native";

import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

import { CHART_PADDING } from "./constants";

export const financesStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
  },
  revenueCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  revenueCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  revenueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: "700",
  },
  revenueMeta: {
    marginTop: Spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  periodLabel: {
    fontSize: 12,
  },
  transactionCount: {
    fontSize: 12,
  },
  abonoIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  abonoIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chartCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  chartCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  chartSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  desgloseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  desgloseName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  desgloseAmounts: {
    alignItems: "flex-end",
    gap: 2,
  },
  desgloseLabel: {
    fontSize: 12,
  },
  chartWrapper: {
    position: "relative",
  },
  chartYLabel: {
    position: "absolute",
    top: CHART_PADDING.top,
    right: 0,
    zIndex: 1,
  },
  chartYLabelText: {
    fontSize: 10,
    fontWeight: "600",
  },
  chartSvg: {
    alignSelf: "center",
  },
  chartXLabels: {
    flexDirection: "row",
    marginTop: -CHART_PADDING.bottom + Spacing.xs,
    paddingHorizontal: CHART_PADDING.left,
  },
  chartXLabelItem: {
    alignItems: "center",
  },
  chartXLabelText: {
    fontSize: 10,
    fontWeight: "500",
  },
  noChartData: {
    justifyContent: "center",
    alignItems: "center",
  },
  noChartText: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  paymentCount: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    backgroundColor: "#E5E7EB40",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  methodBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethod: {
    fontSize: 15,
    fontWeight: "600",
  },
  abonoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  abonoBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  paymentDate: {
    fontSize: 12,
    marginLeft: 36,
  },
  paymentNotes: {
    fontSize: 12,
    marginLeft: 36,
    marginTop: 2,
  },
  paymentLinkedAppointment: {
    fontSize: 12,
    marginLeft: 36,
    marginTop: 2,
    fontStyle: "italic",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
  kpiRowTablet: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  paymentsGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayTablet: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    maxHeight: "90%",
  },
  modalContentTablet: {
    borderRadius: BorderRadius.xl,
    width: 560,
    maxHeight: "80%",
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentTypeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
  },
  paymentTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    flex: 1,
    minWidth: 100,
    justifyContent: "center",
  },
  paymentTypeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  abonoChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.light.gold,
    marginBottom: 2,
  },
  pendienteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginLeft: 36,
    marginTop: 2,
    flexWrap: "wrap",
  },
  completarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  completarBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  abonoToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  abonoToggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 72,
    paddingVertical: Spacing.md,
  },
  abonoResult: {
    flexDirection: "row",
    alignItems: "baseline",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  abonoResultLabel: {
    fontSize: 14,
  },
  abonoResultAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  noAppointmentsText: {
    fontSize: 13,
  },
  appointmentChipsContainer: {
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  appointmentChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
    maxWidth: 220,
  },
  appointmentChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  appointmentChipSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  linkAppointmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  linkAppointmentButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing["3xl"],
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
