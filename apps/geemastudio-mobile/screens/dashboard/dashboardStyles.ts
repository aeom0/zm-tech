import { StyleSheet } from 'react-native'

import { BorderRadius, Spacing, Shadows } from '@/constants/theme'

export const dashboardStyles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 3,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  logoMarkRing: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Stats row
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statsRowTablet: {
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statCardTablet: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  statCardPressable: {
    width: '100%',
    alignItems: 'center',
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },

  // Card
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Appointment row
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  rowTime: {
    width: 56,
    marginRight: Spacing.sm,
  },
  rowTimeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  rowInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  rowClient: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowService: {
    fontSize: 12,
    marginTop: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowDuration: {
    fontSize: 11,
    marginTop: 1,
  },

  // Day header (agrupación de próximas citas por día)
  dayHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Quick links (accesos rápidos admin: Clientes / Finanzas)
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  quickLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinkTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickLinkSub: {
    fontSize: 12,
  },

  // View more
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertBody: {
    fontSize: 12,
    marginTop: 1,
  },

  // Tablet layout
  tabletLayout: {
    flexDirection: 'row',
    gap: Spacing['2xl'],
    alignItems: 'flex-start',
  },
  tabletLeft: {
    flex: 3,
  },
  tabletRight: {
    flex: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.md,
  },
  modalContentTablet: {
    borderRadius: BorderRadius.xl,
    width: 460,
    paddingBottom: Spacing.xl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C0C0C0',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
  },
  modalClient: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalService: {
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  modalMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  modalMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  modalMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  modalBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  modalBtnOutlineText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Selector de método de pago (al marcar cita completada)
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
