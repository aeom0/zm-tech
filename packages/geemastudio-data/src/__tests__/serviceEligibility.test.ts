import { describe, expect, it } from 'vitest'
import {
  employeeCanDoService,
  employeeCanDoServices,
  uniqueServiceIds,
} from '../personal/serviceEligibility'
import type { ServiceEligibilityIndex } from '../personal/types'

describe('serviceEligibility', () => {
  const index: ServiceEligibilityIndex = {
    doesAll: new Set(['emp-all']),
    serviceIdsByEmployee: new Map([
      ['emp-1', new Set(['srv-a', 'srv-b'])],
      ['emp-2', new Set(['srv-c'])],
    ]),
    coverages: [
      {
        coveredId: 'emp-2',
        coveringId: 'emp-1',
        dateFrom: '2026-10-14',
        dateTo: '2026-10-16',
      },
    ],
  }

  it('employee who doesAll can do any service', () => {
    expect(employeeCanDoService(index, 'emp-all', 'srv-x', '2026-10-14')).toBe(true)
  })

  it('employee can do directly assigned service', () => {
    expect(employeeCanDoService(index, 'emp-1', 'srv-a', '2026-10-14')).toBe(true)
    expect(employeeCanDoService(index, 'emp-1', 'srv-c', '2026-10-10')).toBe(false)
  })

  it('employee can do service via active coverage window', () => {
    expect(employeeCanDoService(index, 'emp-1', 'srv-c', '2026-10-15')).toBe(true)
    expect(employeeCanDoService(index, 'emp-1', 'srv-c', '2026-10-20')).toBe(false)
  })

  it('employeeCanDoServices evaluates multiple services', () => {
    expect(employeeCanDoServices(index, 'emp-1', ['srv-a', 'srv-b'], '2026-10-14')).toBe(true)
    expect(employeeCanDoServices(index, 'emp-1', ['srv-a', 'srv-z'], '2026-10-14')).toBe(false)
  })

  it('uniqueServiceIds handles legacy serviceId, array serviceIds, and line items', () => {
    expect(uniqueServiceIds('s1', ['s2', 's3'], ['s4', 's5'])).toEqual(['s4', 's5'])
    expect(uniqueServiceIds('s1', ['s2', 's3'], [])).toEqual(['s2', 's3'])
    expect(uniqueServiceIds('s1', [], [])).toEqual(['s1'])
  })
})
