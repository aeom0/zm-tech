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
  },
  agenda: {
    all: ['appointments'] as const,
    pendingVerificationsCount: ['pending_verifications_count'] as const,
    unassignedAppointmentsCount: ['unassigned_appointments_count'] as const,
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
