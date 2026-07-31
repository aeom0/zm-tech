import type { Locale } from './locales'
import type { Messages } from './messages'
import { es } from './es'
import { en } from './en'

const byLocale: Record<Locale, Messages> = { es, en }

export function getMessages(locale: Locale): Messages {
  return byLocale[locale]
}

export type { Locale, Messages }
export { locales, defaultLocale, isLocale } from './locales'
