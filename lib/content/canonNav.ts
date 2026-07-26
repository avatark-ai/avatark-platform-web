// Centralized Canon destination matrix. avatark.ai/canon is now a full
// reader gateway in its own right -- Sacred Geometry, Operators, Dynamics,
// and Alignment render locally, inside the institutional shell, rather than
// handing off to canon.avatark.ai. That legacy site remains the *complete*
// Canon knowledge environment (more books, plates, and framework pages than
// this gateway curates) and is still reachable via "Enter the Full Canon"
// and the per-page "Open in the Full Canon" fallback -- but it is no longer
// where a click on the local rail sends anyone by default.
//
// Every Canon destination is declared once here so no component (rail,
// cards, footer, gateway blocks, mobile selector) hard-codes a
// canon.avatark.ai URL or a route string independently.

export type CanonContentSource = 'local' | 'adapted-legacy' | 'framed-legacy' | 'external' | 'future'
export type CanonAvailability = 'published' | 'future'
export type CanonGroup = 'published' | 'future' | 'full-canon'
// 'exact' -- active only when pathname === institutionalHref.
// 'prefix' -- active when pathname starts with institutionalHref (covers a
// route's own detail sub-pages, e.g. /canon/sacred-geometry/orientation).
// undefined -- not route-matched at all (the two in-page anchors on /canon,
// whose active state comes from scroll position instead).
export type CanonActiveMatch = 'exact' | 'prefix'

export interface CanonNavItem {
  id: string
  label: string
  shortLabel?: string
  description: string
  institutionalHref?: string
  legacyHref?: string
  contentSource: CanonContentSource
  availability: CanonAvailability
  order: number
  group: CanonGroup
  activeMatch?: CanonActiveMatch
  // Whether the destination page itself should offer a subtle "Open in the
  // Full Canon" link for readers who want the complete legacy environment.
  externalFallback?: boolean
}

// Curated local navigation for the Canon gateway, in display order.
export const CANON_NAV_ITEMS: CanonNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Return to the Canon overview.',
    institutionalHref: '/canon',
    contentSource: 'local',
    availability: 'published',
    order: 1,
    group: 'published',
    activeMatch: 'exact',
  },
  {
    id: 'four-axes',
    label: 'Four Axes',
    description: 'Awareness, Wisdom, Responsibility, Creation.',
    institutionalHref: '/canon#four-axes',
    contentSource: 'local',
    availability: 'published',
    order: 2,
    group: 'published',
  },
  {
    id: 'living-spiral',
    label: 'Living Spiral',
    description: 'The five-stage cycle: Discover, Practice, Reflect, Adapt, Contribute.',
    institutionalHref: '/canon#living-spiral',
    contentSource: 'local',
    availability: 'published',
    order: 3,
    group: 'published',
  },
  {
    id: 'sacred-geometry',
    label: 'Sacred Geometry',
    description: 'Study orientation, symmetry, repetition and the other canonical plates.',
    institutionalHref: '/canon/sacred-geometry',
    legacyHref: 'https://canon.avatark.ai/canon/plates/sacred-geometry/plates',
    contentSource: 'adapted-legacy',
    availability: 'published',
    order: 4,
    group: 'published',
    activeMatch: 'prefix',
    externalFallback: true,
  },
  {
    id: 'operators',
    label: 'Operators',
    description: 'Ground, Dynamics, Structure and Emergence.',
    institutionalHref: '/canon/operators',
    legacyHref: 'https://canon.avatark.ai/canon/operators',
    contentSource: 'adapted-legacy',
    availability: 'published',
    order: 5,
    group: 'published',
    activeMatch: 'prefix',
    externalFallback: true,
  },
  {
    id: 'dynamics',
    label: 'Dynamics',
    description: 'How the Canon moves -- dominance, regimes and change over time.',
    institutionalHref: '/canon/dynamics',
    legacyHref: 'https://canon.avatark.ai/canon/dynamics',
    contentSource: 'adapted-legacy',
    availability: 'published',
    order: 6,
    group: 'published',
    activeMatch: 'prefix',
    externalFallback: true,
  },
  {
    id: 'alignment',
    label: 'Alignment',
    description: 'How canonical coherence is tested under pressure.',
    institutionalHref: '/canon/alignment',
    legacyHref: 'https://canon.avatark.ai/canon/alignment/arena',
    contentSource: 'adapted-legacy',
    availability: 'published',
    order: 7,
    group: 'published',
    activeMatch: 'prefix',
    externalFallback: true,
  },
  {
    id: 'explore-full-canon',
    label: 'Enter the Full Canon',
    shortLabel: 'Full Canon',
    description: 'Enter the complete Canon knowledge environment.',
    legacyHref: 'https://canon.avatark.ai/canon',
    contentSource: 'external',
    availability: 'published',
    order: 8,
    group: 'full-canon',
  },
]

// Chapters with no published Canon destination yet. Rendered as
// unpublished/"Soon" entries only -- never linked, never routed.
export const CANON_FUTURE_ITEMS: CanonNavItem[] = [
  { id: 'archetypes', label: 'Archetypes', description: '', contentSource: 'future', availability: 'future', order: 9, group: 'future' },
  { id: 'practices', label: 'Practices', description: '', contentSource: 'future', availability: 'future', order: 10, group: 'future' },
  { id: 'memory', label: 'Memory', description: '', contentSource: 'future', availability: 'future', order: 11, group: 'future' },
  { id: 'living-echo', label: 'Living Echo', description: '', contentSource: 'future', availability: 'future', order: 12, group: 'future' },
  { id: 'human-development', label: 'Human Development', description: '', contentSource: 'future', availability: 'future', order: 13, group: 'future' },
  { id: 'geometry-of-becoming', label: 'Geometry of Becoming', description: '', contentSource: 'future', availability: 'future', order: 14, group: 'future' },
]

// IDs (in page order) tracked for scroll-based active-state in the local nav
// -- only meaningful on /canon itself, where these are in-page anchors.
export const CANON_INTERNAL_SECTION_IDS = ['four-axes', 'living-spiral'] as const

// The gateway cards shown after the Living Spiral section on /canon reuse
// these ids' labels/descriptions rather than duplicating copy.
export const CANON_GATEWAY_CARD_IDS = ['sacred-geometry', 'operators', 'alignment'] as const

export function findCanonNavItem(id: string): CanonNavItem | undefined {
  return CANON_NAV_ITEMS.find((item) => item.id === id)
}
