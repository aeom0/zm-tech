import { useState, useEffect, useCallback } from 'react'
import { customerService } from '../services/customerService'
import type { Customer } from '../types/database'

export function useCustomers(q?: string) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await customerService.getAll(q)
      setCustomers(data)
    } catch {
      setError('Error al cargar clientes')
    } finally {
      setIsLoading(false)
    }
  }, [q])

  useEffect(() => {
    load()
  }, [load])

  return { customers, isLoading, error, refetch: load }
}
