// Locale-aware formatting. These are the only place `Intl` should be called
// with a locale string derived from user preference -- callers pass a
// registry `code` (e.g. 'en-US', 'en-IN'), not a raw BCP-47 string, so an
// unknown/planned locale can never silently reach `Intl` with untranslated
// surrounding UI (see resolveFormattingLocale).
import { LOCALE_REGISTRY, DEFAULT_LOCALE } from './registry.ts'

// Planned/preview locales fall back to en-US for actual number/date
// formatting until they are promoted to `available` -- formatting without
// translated surrounding copy would be a worse experience than consistent
// English formatting.
export function resolveFormattingLocale(code: string): string {
  const entry = LOCALE_REGISTRY.find((locale) => locale.code === code)
  if (!entry || entry.availability !== 'available') return DEFAULT_LOCALE
  return entry.code
}

export function formatDate(date: Date, code: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(resolveFormattingLocale(code), options ?? { dateStyle: 'long' }).format(date)
}

export function formatTime(date: Date, code: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(resolveFormattingLocale(code), options ?? { timeStyle: 'short' }).format(date)
}

export function formatDateTimeInTimeZone(date: Date, code: string, timeZone: string): string {
  return new Intl.DateTimeFormat(resolveFormattingLocale(code), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date)
}

export function formatNumber(value: number, code: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(resolveFormattingLocale(code), options).format(value)
}
