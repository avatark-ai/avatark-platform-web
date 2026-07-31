// ============================================================
// @avatark/account — Adapter Contracts
//
// Every adapter follows one shape: the package UI calls these methods and
// renders loading/error/empty states itself, generically. A host product
// supplies a concrete implementation of each REQUIRED adapter, and may
// omit any OPTIONAL one — the package must render a graceful "not
// available" state, never crash, when an optional adapter is absent.
//
// This file defines contracts only. No product-specific imports, no
// db.* calls, no Supabase references.
//
// Provenance: forked from prometheusk-web packages/avatar-account
// (@avatark/account 0.1.1, commit 75d9ac0). See ../../PROVENANCE.md.
// ============================================================

export interface AdapterResult<T> {
  data?: T
  error?: string
}

// ── Auth (REQUIRED) ─────────────────────────────────────────
export interface AuthAdapter {
  getIdentities(): Promise<string[]>
  changeEmail(newEmail: string): Promise<{ error?: { message: string } }>
  linkGoogleIdentity(): Promise<{ error?: { message: string } }>
  signOut(): Promise<void>
}

// ── Profile (REQUIRED) ───────────────────────────────────────
export interface AccountProfile {
  id: string
  email: string
  displayName: string | null
  bio: string | null
  role: string | null
  avatarUrl: string | null
  organization: string | null
  location: string | null
  createdAt: string
}

export interface ProfileAdapter {
  get(): Promise<AdapterResult<AccountProfile>>
  update(fields: Partial<Pick<AccountProfile, 'displayName' | 'bio' | 'role' | 'avatarUrl' | 'organization' | 'location'>>): Promise<AdapterResult<AccountProfile>>
}

// ── Product Access (REQUIRED) ─────────────────────────────────
// Honest states only — never a fabricated entitlement.
export type ProductAvailability = 'live' | 'coming_soon'

export type EntitlementState = 'active' | 'available' | 'requested' | 'invite_only' | 'coming_soon' | 'unavailable'

export interface AccountProduct {
  id: string
  name: string
  purpose: string
  url: string | null
  availability: ProductAvailability
  family?: string
  icon?: string
  launchCta?: string
  setupCta?: string
}

export interface ProductWithAccess extends AccountProduct {
  entitlement: EntitlementState
  ctaLabel: string
}

export interface ProductAccessAdapter {
  list(currentProductId: string): Promise<ProductWithAccess[]>
}

// ── Membership (REQUIRED) ─────────────────────────────────────
// Stat keys are host-defined labels (StatEntry[]), not hardcoded product
// metric names — see the "Removing PrometheusK-specific stats" note in
// PROVENANCE.md. The original fork hardcoded practices/publishedEchoes/
// borrowed/draftEchoes directly into this contract; this canonical
// version takes a generic labeled list instead so a non-PrometheusK host
// isn't forced to supply Living-Echo-shaped counters.
export interface StatEntry {
  key: string
  label: string
  value: number
}

export interface MembershipBenefit {
  label: string
  description: string
  available: boolean
}

export interface ProductRelationship {
  productId: string
  name: string
  status: 'member' | 'not_enrolled' | 'coming_soon'
  role: string | null
  since: string | null
  ctaLabel: string
  ctaHref: string | null
}

export interface MembershipSummary {
  planName: string
  creatorStatus: string
}

export interface MembershipAdapter {
  getSummary(stats: StatEntry[]): MembershipSummary
  getRelationships(currentProductId: string, memberSince: string | null): Promise<ProductRelationship[]>
  getRoles(stats: StatEntry[]): string[]
  getBenefits(): MembershipBenefit[]
}

// ── Preferences (REQUIRED) ────────────────────────────────────
export interface AccountPreferences {
  theme: string
  locale: string
  timezone: string | null
  notificationsEnabled: boolean
  reducedMotion: boolean
  defaultLandingPage: string
}

export interface PreferencesAdapter {
  get(): Promise<AdapterResult<AccountPreferences>>
  update(fields: Partial<AccountPreferences>): Promise<AdapterResult<AccountPreferences>>
}

// ── Privacy (OPTIONAL) ────────────────────────────────────────
// PlatformPrivacySettings are universal; product-specific privacy
// concepts flow entirely through the generic productControls[] list,
// rendered mechanically (a labeled toggle or select) with zero built-in
// knowledge of what any given control means.
export interface PlatformPrivacySettings {
  profileVisibility: 'private' | 'public' | 'unlisted'
  discoverable: boolean
  productCommunicationsEnabled: boolean
  personalizationEnabled: boolean
  analyticsEnabled: boolean
}

export interface PrivacyControlDefinition {
  id: string
  label: string
  description?: string
  type: 'boolean' | 'select'
  value: boolean | string
  options?: { value: string; label: string }[]
}

export interface PrivacySettings {
  platform: PlatformPrivacySettings
  productControls?: PrivacyControlDefinition[]
}

export interface PublicContentVisibility {
  id: string
  name: string
  visibility: string
}

export interface PrivacyAdapter {
  get(): Promise<AdapterResult<PrivacySettings>>
  updatePlatform(fields: Partial<PlatformPrivacySettings>): Promise<AdapterResult<PlatformPrivacySettings>>
  updateProductControl(id: string, value: boolean | string): Promise<AdapterResult<PrivacyControlDefinition>>
  listPublicContent(): Promise<PublicContentVisibility[]>
}

// ── Extension slots (OPTIONAL, plural) ────────────────────────
// Canonical, product-neutral replacement for the fork's hardcoded
// "activity"/"echoes" single-purpose adapters (kept below, unchanged,
// for API-compatibility — see ExtensionAdapter vs ActivityAdapter/
// EchoesAdapter in PROVENANCE.md and docs/ACCOUNT_EXTENSION_CONTRACT.md).
// A host registers zero or more named extension slots; the package
// renders each generically and has zero built-in knowledge of what any
// slot means. This is how PrometheusK's Living Echo/Practice Activity,
// GameK's Game Profile, CinemaK's Screenings, etc. attach to the
// canonical shell without the shell ever hardcoding a product concept.
export interface ExtensionItem {
  id: string
  title: string
  subtitle?: string
  status?: string
  href?: string
}

export interface ExtensionSlotContent {
  emptyMessage?: string
  emptyActionHref?: string
  emptyActionLabel?: string
  items: ExtensionItem[]
  footerHref?: string
  footerLabel?: string
}

export interface ExtensionAdapter {
  slotId: string
  label: string
  get(): Promise<AdapterResult<ExtensionSlotContent>>
}

// ── Legacy single-purpose extension adapters (COMPAT ONLY) ────
// Preserved unchanged from the fork for API compatibility (constraint:
// "preserve the existing public API initially"). New hosts should
// register a generic ExtensionAdapter via AccountAdapters.extensions
// instead. PrometheusK's own migration guide (docs/migrations/
// IDENTITY_PROMETHEUSK.md) moves Living Echo/Practice Activity onto the
// generic mechanism rather than these two.
export interface ActivityEvent {
  id: string
  timestamp: string
  summary: string
  reflectionPreview?: string
  source?: string
}

export interface ActivityAdapter {
  getRecent(): Promise<AdapterResult<{ events: ActivityEvent[] }>>
}

export interface AccountEcho {
  id: string
  name: string
  status: 'draft' | 'published'
  visibility: string
}

export interface EchoesAdapter {
  listOwn(): Promise<AdapterResult<AccountEcho[]>>
}

// ── Export (REQUIRED) ─────────────────────────────────────────
export interface AccountSupportConfig {
  supportEmail: string
}

export interface AccountLinksConfig {
  activityFullViewHref?: string
  createEchoHref?: string
  viewLivingEchoHref?: string
  startPracticeHref?: string
}

export interface ExportAdapter {
  exportFullAccount(): Promise<void>
  exportActivityCsv(): Promise<void>
  exportSecondaryCsv?: { label: string; run: () => Promise<void> }
}

// ── Data & Export / closure scope vocabulary (Part 13, additive) ──────
// "Export" and "delete" are not each one thing -- the mission requires
// distinguishing what is being exported/removed. ExportAdapter above
// covers exportFullAccount (~= identity_profile + product_activity
// combined) and exportActivityCsv today; the remaining scopes are named
// here as a checkable contract even though no host currently implements
// them, so future adapter/UI work has a real vocabulary to target instead
// of ad hoc strings. This is a vocabulary addition only -- no new required
// adapter method, no behavior change.
export type DataExportScope =
  | "identity_profile"
  | "product_activity"
  | "reflection_or_echo"
  | "authored_content"
  | "connected_source"

export const DATA_EXPORT_SCOPES: DataExportScope[] = [
  "identity_profile",
  "product_activity",
  "reflection_or_echo",
  "authored_content",
  "connected_source",
]

// Closing a single product's data must never imply closing the whole
// AvatarK identity, and vice versa -- these are three distinct,
// non-overlapping operations (see docs/PRIVACY_DATA_CONTROL_MODEL.md).
export type AccountClosureScope =
  | "delete_one_product_data"
  | "leave_organization"
  | "close_avatark_identity"

export const ACCOUNT_CLOSURE_SCOPES: AccountClosureScope[] = [
  "delete_one_product_data",
  "leave_organization",
  "close_avatark_identity",
]

// ── Getting Started (EXPERIMENTAL, NOT part of the stable public API) ──
export interface GettingStartedAdapter {
  getStatus(): Promise<AdapterResult<{ completed: boolean; stepsRemaining: string[] }>>
}

// ── The complete adapter set a host product supplies ──────────
export interface AccountAdapters {
  support: AccountSupportConfig
  links?: AccountLinksConfig
  auth: AuthAdapter
  profile: ProfileAdapter
  productAccess: ProductAccessAdapter
  membership: MembershipAdapter
  preferences: PreferencesAdapter
  privacy?: PrivacyAdapter
  /** @deprecated use `extensions` with slotId 'activity' */
  activity?: ActivityAdapter
  /** @deprecated use `extensions` with slotId 'echoes' */
  echoes?: EchoesAdapter
  /** Canonical, product-neutral extension slots (see docs/ACCOUNT_EXTENSION_CONTRACT.md). */
  extensions?: ExtensionAdapter[]
  export: ExportAdapter
  gettingStarted?: GettingStartedAdapter
}
