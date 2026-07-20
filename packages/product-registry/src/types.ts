// Shared, framework-agnostic shape for every AvatarK product. Any app in the
// ecosystem (landing page, Platform Account, product switcher, navigation,
// permissions, marketplace, billing, feature flags, documentation) reads
// from the same PRODUCT_REGISTRY instead of keeping its own copy.

export type ProductStatus = 'alpha' | 'beta' | 'live' | 'internal'

export type ProductCategory =
  | 'platform'
  | 'practice'
  | 'game'
  | 'competition'
  | 'streaming'
  | 'media'
  | 'creation'
  | 'exploration'
  | 'wellness'

export type ProductVisibility = 'public' | 'internal'

export interface ProductLink {
  label: string
  href: string
}

export interface AvatarKProduct {
  id: string
  slug: string
  displayName: string
  tagline: string | null
  description: string
  status: ProductStatus
  /** Best-known canonical production domain. Null when no confirmed default exists. */
  domain: string | null
  /** Placeholder design token (icon key into whatever icon set the consuming app uses) pending real brand assets. */
  icon: string
  /** Placeholder design token (hex) pending real brand assets. */
  accentColor: string
  /** Path/URL to a real logo asset. Null until one exists. */
  logo: string | null
  category: ProductCategory
  /** Team or person responsible. Null: no ownership data exists anywhere in this ecosystem yet. */
  owner: string | null
  /** Repository name, if one is confirmed to exist in this workspace. Null otherwise -- never guessed. */
  repository: string | null
  visibility: ProductVisibility
  requiresAuth: boolean
  supportsOrganizations: boolean
  supportsMarketplace: boolean
  supportsBilling: boolean
  supportsNotifications: boolean
  supportsRecommendations: boolean
  supportsEcho: boolean
  supportsPractices: boolean
  supportsEvents: boolean
  supportsChallenges: boolean
  supportsLeagues: boolean
  supportsStreaming: boolean
  supportsContent: boolean
  supportsDigitalTwin: boolean
  navigationLinks: ProductLink[]
  footerLinks: ProductLink[]
  helpLinks: ProductLink[]
  supportEmail: string | null
  documentation: string | null
}

export const CAPABILITY_KEYS = [
  'supportsOrganizations',
  'supportsMarketplace',
  'supportsBilling',
  'supportsNotifications',
  'supportsRecommendations',
  'supportsEcho',
  'supportsPractices',
  'supportsEvents',
  'supportsChallenges',
  'supportsLeagues',
  'supportsStreaming',
  'supportsContent',
  'supportsDigitalTwin',
] as const satisfies readonly (keyof AvatarKProduct)[]

export type ProductCapabilityKey = (typeof CAPABILITY_KEYS)[number]
