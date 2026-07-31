// Canonical locale contract. A locale is either genuinely usable by a general
// consumer today (`available`), being validated for a small audience
// (`preview`), or merely on the roadmap with no translated strings yet
// (`planned`). Never promote a locale to `available` by editing this file
// alone -- promotion requires the shared namespaces below to be materially
// translated, tested for date/number/timezone correctness, and reviewed for
// accessibility text, not just declared.
export type LocaleAvailability = 'available' | 'preview' | 'planned'

export interface LocaleDescriptor {
  code: string
  englishName: string
  nativeName: string
  availability: LocaleAvailability
  /** BCP-47 region, used for Intl.DateTimeFormat/NumberFormat, distinct from language. */
  region: string | null
}

// Shared translation namespaces owned by the canonical identity/account core.
// Product extensions own their own product-specific namespaces (e.g.
// `prometheusk.livingEcho`) and must not add entries here.
export const CANONICAL_NAMESPACES = [
  'auth',
  'account',
  'membership',
  'products',
  'preferences',
  'privacy',
  'security',
  'dataExport',
  'notifications',
  'organizations',
  'diagnostics',
] as const

export type CanonicalNamespace = (typeof CANONICAL_NAMESPACES)[number]

// A resource bundle for one locale: one flat string-keyed dictionary per
// canonical namespace. Only `en-US` is required to be materially complete;
// other `available`/`preview` locales must match its key set exactly (see
// `validateResourceCompleteness` in helpers.ts).
export type NamespaceResource = Record<string, string>

export type LocaleResourceBundle = Record<CanonicalNamespace, NamespaceResource>
