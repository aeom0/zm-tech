import { describe, expect, it } from 'vitest'
import {
  isMissingColumnError,
  parseServiceIds,
  serializeServiceIds,
  sortCatalogList,
  toIsoOrNull,
} from '../catalog/catalogAdapter'

describe('catalogAdapter', () => {
  it('parseServiceIds parses array and JSON strings correctly', () => {
    expect(parseServiceIds(['s1', 's2'])).toEqual(['s1', 's2'])
    expect(parseServiceIds('["s1", "s2"]')).toEqual(['s1', 's2'])
    expect(parseServiceIds('not-json')).toEqual([])
    expect(parseServiceIds(null)).toEqual([])
  })

  it('serializeServiceIds serializes according to dialect', () => {
    expect(serializeServiceIds(['s1', 's2'], 'zm')).toBe('["s1","s2"]')
    expect(serializeServiceIds(['s1', 's2'], 'geema')).toEqual(['s1', 's2'])
  })

  it('toIsoOrNull normalizes dates safely', () => {
    expect(toIsoOrNull(null)).toBeNull()
    expect(toIsoOrNull('2026-10-14')).toBe('2026-10-14T12:00:00.000Z')
    expect(toIsoOrNull('invalid-date')).toBeNull()
  })

  it('isMissingColumnError detects missing column indicators', () => {
    expect(isMissingColumnError({ message: 'column title does not exist' })).toBe(true)
    expect(isMissingColumnError({ code: 'PGRST204' })).toBe(true)
    expect(isMissingColumnError({ message: 'connection timeout' })).toBe(false)
  })

  it('sortCatalogList orders by active first, then display_order, then name', () => {
    const items = [
      { id: '1', name: 'Zeta', is_active: true, display_order: 2 },
      { id: '2', name: 'Alfa', is_active: false, display_order: 1 },
      { id: '3', name: 'Beta', is_active: true, display_order: 1 },
    ]
    const sorted = sortCatalogList(items, {
      getActive: (i) => i.is_active,
      getOrder: (i) => i.display_order,
      getName: (i) => i.name,
    })
    expect(sorted.map((i) => i.id)).toEqual(['3', '1', '2'])
  })
})
