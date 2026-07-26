// Centralized Canon destination matrix. canon.avatark.ai is the full Canon
// knowledge environment; avatark.ai/canon is only the institutional gateway
// and overview. Every Canon destination -- internal anchor, deep link into
// the live Canon site, or the Canon root -- is declared once here so no
// component hard-codes a canon.avatark.ai URL directly.

export type CanonNavItemType = 'internal-anchor' | 'canon-deep-link' | 'canon-root'
export type CanonNavAvailability = 'visible' | 'future'

export interface CanonNavItem {
  id: string
  label: string
  description: string
  href: string
  type: CanonNavItemType
  availability: CanonNavAvailability
  order: number
}

// Curated local navigation for the /canon gateway page, in display order.
// "Overview" and "Four Axes"/"Living Spiral" stay internal (anchors on this
// page); everything past that is a deep link into the live Canon
// environment, which already has substantial published content for these
// destinations.
export const CANON_NAV_ITEMS: CanonNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Return to the Canon overview.',
    href: '/canon',
    type: 'internal-anchor',
    availability: 'visible',
    order: 1,
  },
  {
    id: 'four-axes',
    label: 'Four Axes',
    description: 'Awareness, Wisdom, Responsibility, Creation.',
    href: '/canon#four-axes',
    type: 'internal-anchor',
    availability: 'visible',
    order: 2,
  },
  {
    id: 'living-spiral',
    label: 'Living Spiral',
    description: 'The five-stage cycle: Discover, Practice, Reflect, Adapt, Contribute.',
    href: '/canon#living-spiral',
    type: 'internal-anchor',
    availability: 'visible',
    order: 3,
  },
  {
    id: 'sacred-geometry',
    label: 'Sacred Geometry',
    description: 'Study orientation, axis, boundary, rhythm, symmetry and the other canonical plates.',
    href: 'https://canon.avatark.ai/canon/plates/sacred-geometry/plates',
    type: 'canon-deep-link',
    availability: 'visible',
    order: 4,
  },
  {
    id: 'operators',
    label: 'Operators',
    description: 'Explore Ground, Dynamics, Structure and Emergence.',
    href: 'https://canon.avatark.ai/canon/operators',
    type: 'canon-deep-link',
    availability: 'visible',
    order: 5,
  },
  {
    id: 'dynamics',
    label: 'Dynamics',
    description: 'How the Canon moves -- forces, feedback and change over time.',
    href: 'https://canon.avatark.ai/canon/dynamics',
    type: 'canon-deep-link',
    availability: 'visible',
    order: 6,
  },
  {
    id: 'alignment',
    label: 'Alignment',
    description: 'See how canonical coherence is tested under pressure.',
    href: 'https://canon.avatark.ai/canon/alignment/arena',
    type: 'canon-deep-link',
    availability: 'visible',
    order: 7,
  },
  {
    id: 'explore-full-canon',
    label: 'Explore Full Canon',
    description: 'Enter the complete Canon knowledge environment.',
    href: 'https://canon.avatark.ai/canon',
    type: 'canon-root',
    availability: 'visible',
    order: 8,
  },
]

// Chapters with no approved public destination yet. Rendered as
// unpublished/"Soon" entries only -- never linked, never routed.
export const CANON_FUTURE_ITEMS: CanonNavItem[] = [
  { id: 'archetypes', label: 'Archetypes', description: '', href: '', type: 'canon-deep-link', availability: 'future', order: 9 },
  { id: 'practices', label: 'Practices', description: '', href: '', type: 'canon-deep-link', availability: 'future', order: 10 },
  { id: 'memory', label: 'Memory', description: '', href: '', type: 'canon-deep-link', availability: 'future', order: 11 },
  { id: 'living-echo', label: 'Living Echo', description: '', href: '', type: 'canon-deep-link', availability: 'future', order: 12 },
  { id: 'human-development', label: 'Human Development', description: '', href: '', type: 'canon-deep-link', availability: 'future', order: 13 },
  { id: 'geometry-of-becoming', label: 'Geometry of Becoming', description: '', href: '', type: 'canon-deep-link', availability: 'future', order: 14 },
]

// IDs (in page order) tracked for scroll-based active-state in the local nav.
export const CANON_INTERNAL_SECTION_IDS = ['four-axes', 'living-spiral'] as const

// The gateway cards shown after the Living Spiral section reuse these ids'
// labels/descriptions rather than duplicating copy.
export const CANON_GATEWAY_CARD_IDS = ['sacred-geometry', 'operators', 'alignment'] as const
