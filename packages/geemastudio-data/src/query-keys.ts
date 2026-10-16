/**
 * Query keys canónicas de TanStack Query para GeemaStudio (web y mobile).
 */
export const queryKeys = {
  auth: {
    profile: (userId?: string | null) => ['auth', 'profile', userId] as const,
  },
  tenant: {
    settings: (userId?: string | null) => ['tenant_settings', userId] as const,
    webSettings: (slugOrId?: string | null) => ['web_settings', slugOrId] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    categories: ['service_categories'] as const,
    services: ['services'] as const,
    packs: ['packs'] as const,
    promos: ['promotions'] as const,
    products: (tenantId?: string | null) => ['sales_products', tenantId] as const,
    productOrders: (tenantId?: string | null) => ['sales_orders', tenantId] as const,
  },
  employees: {
    all: ['employees'] as const,
    active: ['employees', 'active'] as const,
    detail: (id: string) => ['employees', id] as const,
    timeOffs: (employeeId?: string | null) => ['employee_time_offs', employeeId] as const,
    coverages: ['employee_coverages'] as const,
    workShifts: (employeeId?: string | null) => ['employee_work_shifts', employeeId] as const,
    services: (employeeId?: string | null) => ['employee_services', employeeId] as const,
    serviceEligibility: ['service_eligibility'] as const,
  },
  agenda: {
    all: ['appointments'] as const,
    pendingVerificationsCount: ['pending_verifications_count'] as const,
    unassignedAppointmentsCount: ['unassigned_appointments_count'] as const,
    unreviewedReferences: ['unreviewed_references'] as const,
    assignWindow: (timeZone?: string | null) =>
      ['appointments', 'assign_window', timeZone] as const,
    availabilityCheck: ['availability_check'] as const,
    referenceImageUrls: (values: readonly string[]) => ['reference_image_urls', ...values] as const,
  },
  holidays: {
    all: ['salon_holidays'] as const,
    list: (tenantId?: string | null) => ['salon_holidays', tenantId] as const,
  },
  verifications: {
    all: ['payment_verifications'] as const,
    list: (filter: string) => ['payment_verifications', filter] as const,
  },
  inventory: {
    items: (tenantId?: string | null) => ['inventory_items', tenantId] as const,
    movements: (tenantId?: string | null, limit?: number) =>
      ['inventory_movements', tenantId, limit] as const,
    categories: (tenantId?: string | null) => ['inventory_categories', tenantId] as const,
  },
  dashboard: {
    stats: (...range: string[]) => ['dashboard_stats', ...range] as const,
    appointments: (from: string, to: string) => ['appointments_upcoming', from, to] as const,
    completedServices: (period: string, since?: string | null) =>
      ['dashboard_completed_services', period, since ?? null] as const,
    payments: (ids: string[]) => ['dashboard_payments_by_appointments', ids] as const,
  },
  promos: {
    all: ['promo_broadcasts'] as const,
    history: (tenantId?: string | null) => ['promo_broadcasts', tenantId] as const,
    segment: (tenantId: string | null, timeZone: string, category: string | null, inactiveOnly: boolean) =>
      ['promo_segment', tenantId, timeZone, category ?? 'all', inactiveOnly] as const,
  },
  onboarding: {
    all: ['onboarding_status'] as const,
    status: (tenantId?: string | null) => ['onboarding_status', tenantId] as const,
  },
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['client_detail', id] as const,
  },
  finances: {
    payments: ['payments'] as const,
    expenses: ['expenses'] as const,
    stats: ['dashboard_stats'] as const,
    revenue: ['dashboard_revenue'] as const,
  },
} as const
