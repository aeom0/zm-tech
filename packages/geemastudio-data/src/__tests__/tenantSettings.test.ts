import { describe, expect, it } from 'vitest'
import {
  mapConfigToRow,
  mapRowToConfig,
  normalizePanelRow,
} from '../tenant-settings/tenantSettingsService'
import type { TenantSettingsRow } from '../tenant-settings/types'
import { defaultTenantConfig } from '@zmtech/tenant-config'

describe('tenantSettings mapping', () => {
  it('mapConfigToRow serializes tenant config to DB row format', () => {
    const row = mapConfigToRow(defaultTenantConfig, 'user-123', 'salon-demo')
    expect(row.id).toBe('user-123')
    expect(row.tenant_slug).toBe('salon-demo')
    expect(row.business_name).toBe(defaultTenantConfig.businessName)
    expect(row.is_configured).toBe(true)
  })

  it('mapRowToConfig reconstructs valid TenantConfig from DB row', () => {
    const rawRow: TenantSettingsRow = {
      business_name: 'Glamour Studio',
      business_type: 'spa-nails',
      primary_color: '#40E0D0',
      accent_color: '#FFD700',
      currency_code: 'USD',
      currency_symbol: '$',
      country: 'VE',
      language: 'es-VE',
      timezone: 'America/Caracas',
      time_format: '24',
      client_terminology: 'cliente',
      staff_terminology: 'Especialistas',
      staff_singular_terminology: 'Especialista',
      appointment_terminology: 'cita',
      business_hours: defaultTenantConfig.businessHours,
      contact_info: defaultTenantConfig.contact,
      commission_staff: 60,
      commission_house: 40,
      tagline: 'Lo mejor en uñas',
      features_whatsapp: true,
      logo_url: 'https://example.com/logo.png',
    }

    const config = mapRowToConfig(rawRow)
    expect(config.businessName).toBe('Glamour Studio')
    expect(config.terminology.staff).toBe('Especialistas')
    expect(config.locale.currency.code).toBe('USD')
    expect(config.features?.whatsapp).toBe(true)
  })

  it('normalizePanelRow normalizes panel row with defaults', () => {
    const row = normalizePanelRow({
      id: '123',
      business_name: 'Test',
      web_template: 'modern',
    })
    expect(row.id).toBe('123')
    expect(row.business_name).toBe('Test')
    expect(row.web_template).toBe('modern')
    expect(row.primary_color).toBe('#40E0D0')
  })
})
