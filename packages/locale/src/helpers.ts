import { LOCALE_REGISTRY, DEFAULT_LOCALE } from './registry.ts'
import { EN_US } from './resources/en-US.ts'
import type { CanonicalNamespace, LocaleDescriptor, LocaleResourceBundle } from './types.ts'

// The only locales safe to offer in a general-consumer locale picker.
export function getSelectableLocales(): LocaleDescriptor[] {
  return LOCALE_REGISTRY.filter((locale) => locale.availability === 'available')
}

export function isLocaleSelectable(code: string): boolean {
  return LOCALE_REGISTRY.some((locale) => locale.code === code && locale.availability === 'available')
}

export function getLocaleDescriptor(code: string): LocaleDescriptor | undefined {
  return LOCALE_REGISTRY.find((locale) => locale.code === code)
}

// en-IN is the same language as en-US with no translated-string divergence
// today -- it reuses en-US's resource bundle verbatim. Formatting (dates,
// numbers, timezone presentation) still differs via format.ts, which keys
// off the locale `code`, not the resource bundle.
const RESOURCE_BUNDLES: Partial<Record<string, LocaleResourceBundle>> = {
  'en-US': EN_US,
  'en-IN': EN_US,
}

export function getResourceBundle(code: string): LocaleResourceBundle {
  return RESOURCE_BUNDLES[code] ?? RESOURCE_BUNDLES[DEFAULT_LOCALE]!
}

export function translate(code: string, namespace: CanonicalNamespace, key: string): string {
  const bundle = getResourceBundle(code)
  return bundle[namespace]?.[key] ?? EN_US[namespace]?.[key] ?? key
}

// A locale is only safe to mark `available` once every available locale's
// resource bundle has the exact same key set as en-US in every canonical
// namespace -- this guards against silently shipping a half-translated
// locale.
export function validateResourceCompleteness(code: string): { complete: boolean; missing: string[] } {
  const bundle = RESOURCE_BUNDLES[code]
  if (!bundle) return { complete: false, missing: ['(no resource bundle registered)'] }
  const missing: string[] = []
  for (const namespace of Object.keys(EN_US) as CanonicalNamespace[]) {
    const referenceKeys = Object.keys(EN_US[namespace])
    const localeKeys = new Set(Object.keys(bundle[namespace] ?? {}))
    for (const key of referenceKeys) {
      if (!localeKeys.has(key)) missing.push(`${namespace}.${key}`)
    }
  }
  return { complete: missing.length === 0, missing }
}
