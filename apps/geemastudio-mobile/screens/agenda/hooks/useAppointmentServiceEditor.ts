import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

import { addPackServiceLines } from '../agendaUtils'
import type { AgendaPack, AgendaService, AgendaServiceLine } from '../types'

/**
 * Estado del picker y líneas editables al modificar servicios de una cita existente
 * (p. ej. clienta en salón que pide una depilación extra).
 */
export function useAppointmentServiceEditor(services: AgendaService[]) {
  const [editServiceLines, setEditServiceLines] = useState<AgendaServiceLine[]>([])
  const [svcPickerVisible, setSvcPickerVisible] = useState(false)
  const [svcPickerCatId, setSvcPickerCatId] = useState('')
  const [svcPickerEmployeeId, setSvcPickerEmployeeId] = useState('')

  const openSvcPicker = (defaultEmployeeId: string, categories: { id: string }[]) => {
    if (categories.length > 0) {
      setSvcPickerCatId(categories[0].id)
    }
    if (defaultEmployeeId) {
      setSvcPickerEmployeeId(defaultEmployeeId)
    }
    setSvcPickerVisible(true)
  }

  const closeSvcPicker = () => setSvcPickerVisible(false)

  const toggleSvcInPicker = (serviceId: string, employeeId: string) => {
    setEditServiceLines((prev) => {
      const exists = prev.find((l) => l.serviceId === serviceId && !l.packId)
      if (exists) {
        return prev.filter((l) => !(l.serviceId === serviceId && !l.packId))
      }
      return [...prev, { serviceId, employeeId }]
    })
  }

  const addPackToLines = (pack: AgendaPack, employeeId: string) => {
    const newLines = addPackServiceLines(pack, employeeId)
    if (newLines.length === 0) return
    setEditServiceLines((prev) => [...prev, ...newLines])
  }

  const pickerSelectedIds = useMemo(
    () => editServiceLines.map((l) => l.serviceId),
    [editServiceLines]
  )

  const editTotals = useMemo(() => {
    let totalPrice = 0
    let totalDuration = 0
    for (const line of editServiceLines) {
      const svc = services.find((s) => s.id === line.serviceId)
      if (!svc) continue
      const unitPrice =
        typeof line.priceOverride === 'number' && Number.isFinite(line.priceOverride)
          ? line.priceOverride
          : parseFloat(svc.price)
      totalPrice += Number.isFinite(unitPrice) ? unitPrice : 0
      totalDuration += svc.duration
    }
    return { totalPrice, totalDuration }
  }, [editServiceLines, services])

  const resetEditor = () => {
    setEditServiceLines([])
    setSvcPickerVisible(false)
  }

  return {
    editServiceLines,
    setEditServiceLines,
    svcPickerVisible,
    svcPickerCatId,
    setSvcPickerCatId,
    svcPickerEmployeeId,
    setSvcPickerEmployeeId,
    pickerSelectedIds,
    openSvcPicker,
    closeSvcPicker,
    toggleSvcInPicker,
    addPackToLines,
    resetEditor,
    editTotalPrice: editTotals.totalPrice,
    editTotalDuration: editTotals.totalDuration,
  }
}

/** Sincroniza líneas editables cuando llega el fetch de appointment_services */
export function useSyncEditLinesFromQuery(
  lines: Array<{
    service_id: string | null
    employee_id: string | null
    pack_id: string | null
    price: string
  }>,
  fallbackEmployeeId: string,
  setEditServiceLines: Dispatch<SetStateAction<AgendaServiceLine[]>>
) {
  useEffect(() => {
    if (lines.length === 0) return
    setEditServiceLines(
      lines
        .filter((l) => l.service_id)
        .map((line) => ({
          serviceId: line.service_id as string,
          employeeId: line.employee_id ?? fallbackEmployeeId,
          packId: line.pack_id ?? undefined,
          priceOverride:
            line.price != null ? parseFloat(String(line.price)) : undefined,
        }))
    )
  }, [lines, fallbackEmployeeId, setEditServiceLines])
}
