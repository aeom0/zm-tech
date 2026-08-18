// ============================================================
// /dashboard → resumen por defecto
// ============================================================

import { redirect } from 'next/navigation'

export default function DashboardIndexPage() {
  redirect('/dashboard/overview')
}
