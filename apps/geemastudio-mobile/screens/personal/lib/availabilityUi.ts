import { formatIsoDate } from '@/lib/isoDate'

export { formatIsoDate, isValidIsoDate, todayIso } from '@/lib/isoDate'

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function rangeLabel(from: string, to: string | null): string {
  if (to === null) return `Desde el ${formatIsoDate(from)}, hasta nuevo aviso`
  return from === to ? formatIsoDate(from) : `${formatIsoDate(from)} al ${formatIsoDate(to)}`
}
