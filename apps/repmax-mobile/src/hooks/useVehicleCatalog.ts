import { useState, useEffect, useCallback } from 'react'
import { vehicleCatalogService } from '../services/vehicleCatalogService'
import { useAuth } from '../context/AuthContext'
import type { VehicleCatalogEntry, VehicleType } from '../types/database'

/**
 * Entradas de marca/modelo/años agregadas a mano por la tienda actual,
 * para complementar el seed estático de constants/brands.ts en los pickers
 * de "Vehículo compatible".
 */
export function useVehicleCatalog() {
  const { store } = useAuth()
  const [entries, setEntries] = useState<VehicleCatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!store?.id) {
      setEntries([])
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const data = await vehicleCatalogService.getAll(store.id)
      setEntries(data)
    } catch {
      setError('Error al cargar el catálogo de la tienda')
    } finally {
      setIsLoading(false)
    }
  }, [store?.id])

  useEffect(() => {
    load()
  }, [load])

  const addEntry = useCallback(
    async (entry: {
      brand: string
      model: string
      yearFrom?: number
      yearTo?: number
      vehicleType?: VehicleType
    }) => {
      if (!store?.id) throw new Error('No hay tienda activa')
      const created = await vehicleCatalogService.create({ storeId: store.id, ...entry })
      setEntries((prev) => [...prev, created].sort((a, b) => a.brand.localeCompare(b.brand)))
      return created
    },
    [store?.id]
  )

  return { entries, isLoading, error, refetch: load, addEntry }
}
