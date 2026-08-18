export interface SettingsSectionProps {
  title: string
  footer?: string
  children: React.ReactNode
}

export type SettingsRowVariant = 'value' | 'navigate' | 'action' | 'toggle'
