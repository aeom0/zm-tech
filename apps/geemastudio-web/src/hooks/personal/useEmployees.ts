'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteAvatarIfStorage,
  deleteEmployee,
  detectEmployeesDialect,
  fetchAllEmployees,
  insertEmployee,
  updateEmployee,
  uploadEmployeeAvatar,
} from './employeesService'
import type { EmployeeWriteInput } from './types'

export const WEB_EMPLOYEES_KEY = ['web_employees'] as const

export function useEmployeesDialect() {
  return useQuery({
    queryKey: ['web_employees_dialect'],
    queryFn: detectEmployeesDialect,
    staleTime: Infinity,
  })
}

export function useEmployees() {
  return useQuery({
    queryKey: WEB_EMPLOYEES_KEY,
    queryFn: fetchAllEmployees,
    staleTime: 60_000,
  })
}

export function useUpsertEmployee() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      id?: string
      data: EmployeeWriteInput
      avatarFile?: File | null
      removeAvatar?: boolean
    }) => {
      let avatar_url = args.data.avatar_url

      if (args.removeAvatar) {
        await deleteAvatarIfStorage(avatar_url)
        avatar_url = null
      } else if (args.avatarFile) {
        const empId = args.id ?? `temp_${Date.now()}`
        if (args.id) await deleteAvatarIfStorage(avatar_url)
        avatar_url = await uploadEmployeeAvatar(empId, args.avatarFile)
      }

      const payload: EmployeeWriteInput = { ...args.data, avatar_url }

      if (args.id) {
        await updateEmployee(args.id, payload)
        return args.id
      }
      const created = await insertEmployee(payload)
      return created.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEB_EMPLOYEES_KEY })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (args: { id: string; avatar_url: string | null }) => {
      await deleteAvatarIfStorage(args.avatar_url)
      await deleteEmployee(args.id)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEB_EMPLOYEES_KEY })
    },
  })
}
