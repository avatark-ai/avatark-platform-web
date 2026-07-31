import type { LocaleDescriptor } from './types.ts'

// Ground truth for which locales exist and how usable they are. `available`
// means the canonical namespaces below are materially translated and
// reviewed; everything else must not be offered to general consumers.
export const LOCALE_REGISTRY: LocaleDescriptor[] = [
  { code: 'en-US', englishName: 'English (United States)', nativeName: 'English (United States)', availability: 'available', region: 'US' },
  { code: 'en-IN', englishName: 'English (India)', nativeName: 'English (India)', availability: 'available', region: 'IN' },
  // Planned candidates: no translated resource bundle exists for any of
  // these yet. Do not flip to `preview`/`available` without a real,
  // reviewed resource bundle -- a placeholder or machine translation does
  // not qualify per mission Part 6.
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', availability: 'planned', region: null },
  { code: 'fr', englishName: 'French', nativeName: 'Français', availability: 'planned', region: null },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', availability: 'planned', region: null },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', availability: 'planned', region: null },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', availability: 'planned', region: null },
]

export const DEFAULT_LOCALE = 'en-US'
