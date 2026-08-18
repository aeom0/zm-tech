import { useState, useEffect } from 'react'
import { analyticsService, type DashboardKPIs } from '../services/analyticsService'

export function useDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await analyticsService.getDashboard()
        setKpis(data)
      } catch {
        setError('Error al cargar dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return { kpis, isLoading, error }
}
