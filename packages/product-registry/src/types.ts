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

// Where a product sits in the AvatarK -> Echo -> Growth Engines -> ArenaK ->
// StreamK -> CinemaK platform journey. Absent on products outside that
// narrative chain (e.g. avatark itself, studiok, setpointk) -- they remain
// valid registry entries, just not positioned on this particular graph.
export type JourneyRole = 'entry' | 'growth-engine' | 'convergence' | 'expression'

// How confirmed this product's platform integration is *today* -- a
// separate axis from `status` (which is the product's own maturity).
// GameK, for example, is `status: 'beta'` but its Echo/Platform integration
// is already confirmed live, hence `integrationStatus: 'live'`.
export type IntegrationStatus = 'live' | 'preview' | 'coming-online' | 'in-development' | 'vision'

export interface ProductExperience {
  id: string
  name: string
}

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
  /**
   * A confirmed, fixed preview/staging domain distinct from `domain` -- e.g. a stable
   * `preview.<product>.ai` alias, not a per-deployment Vercel preview URL (those are
   * unique per build and cannot be a registry fact). Null for every product today: no
   * such fixed preview address has been confirmed anywhere in this ecosystem's docs
   * (`docs/GAMEK_SHARED_PLATFORM_SETUP.md` names only a generic `<gamek-preview-origin>`
   * placeholder, not a real fixed hostname). See `@avatark/navigation`'s Redirect
   * Manager for how a consumer resolves this vs. `domain`.
   */
  previewDomain: string | null
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
  /**
   * Confirmed to consume AvatarK's own shared identity/auth contract (`lib/identity/`,
   * `lib/auth/`) today -- distinct from `requiresAuth` (which is true for every product,
   * including ones like SetpointK that gate access via their *own*, unrelated auth
   * system). See `docs/PLATFORM_CONTRACTS.md`'s Identity/Authentication sections and
   * `docs/PLATFORM_INTEGRATION_MATRIX.md`'s Auth column for the per-product facts this
   * flag is derived from.
   */
  supportsAuth: boolean
  /** Confirmed to consume `@avatark/account` (this repo's canonical shared Account experience) today. See `docs/PLATFORM_CONTRACTS.md`'s Account section. */
  supportsAccount: boolean
  /** Confirmed real or target relationship (as producer or consumer) with `@avatark/invitations`, ArenaK's owned Invitations contract. See `docs/PLATFORM_CONTRACTS.md`'s Invitations section ("Owned by ArenaK. Consumed by: ..."). */
  supportsInvitations: boolean
  /**
   * Confirmed to produce or consume **Living Echo** -- PrometheusK's own recorded
   * practice trace (`docs/PLATFORM_CONTRACTS.md`'s Living Echo section). Deliberately
   * a distinct field from `supportsEcho` below, which is a different, pre-existing
   * ecosystem-wide capability flag that predates this disambiguation; see
   * `docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md` row 3/5 for why the two are not merged.
   */
  supportsLivingEcho: boolean
  /** Confirmed to consume the shared cross-product navigation contract (Product Switcher / Avatar Menu / product-context nav, `@avatark/navigation`) today. See `docs/PLATFORM_INTEGRATION_MATRIX.md`'s Game row ("Avatar Menu", "Product Context"). */
  supportsNavigation: boolean
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
  /** This product's position in the platform journey graph. Undefined if it isn't part of that narrative. */
  journeyRole?: JourneyRole
  /** Sort order among sibling products sharing the same journeyRole. */
  journeyOrder?: number
  /** How confirmed this product's platform integration is today -- separate from `status`. */
  integrationStatus?: IntegrationStatus
  /** Ids of products this one's journey typically continues into. Empty/undefined means terminal. */
  nextProductIds?: string[]
  /** Sub-experiences inside this product (e.g. GameK's FlowK/PathK/GeometriK/ChronicleK), if any. */
  experiences?: ProductExperience[]
}

export const CAPABILITY_KEYS = [
  'supportsAuth',
  'supportsAccount',
  'supportsInvitations',
  'supportsLivingEcho',
  'supportsNavigation',
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
