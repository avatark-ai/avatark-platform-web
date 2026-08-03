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
  /** Real verification fact (e.g. Supabase's `email_confirmed_at !== null`) -- never a hardcoded "Verified" claim. */
  isEmailVerified(): Promise<boolean>
  changeEmail(newEmail: string): Promise<{ error?: { message: string } }>
  linkGoogleIdentity(): Promise<{ error?: { message: string } }>
  signOut(): Promise<void>
  /** Optional: only present when a host can genuinely revoke every session, not just this browser's (Part 10). Absent, not a disabled/fake button, when no real adapter exists. */
  signOutAllDevices?(): Promise<{ error?: { message: string } }>
}

// Normalized location (Platform RC, Phase 4) -- replaces a single free-text
// `location` string. Every field is independently nullable: a host with
// partial geography data (e.g. country known, state/city not picked yet)
// must never fabricate the missing fields. `timezone` here is the location's
// own timezone (best-effort, derived from country/state), independent of
// `AccountPreferences.timezone` (the user's preferred display timezone,
// Part 6 below) -- the two are different concepts and intentionally not
// merged.
export interface AccountLocation {
  countryCode: string | null
  countryName: string | null
  stateCode: string | null
  stateName: string | null
  city: string | null
  timezone: string | null
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
  location: AccountLocation | null
  createdAt: string
}

// Canonical, suggested Role vocabulary (Platform RC, Phase 4) -- a real
// dropdown, not a hidden free-text escape hatch, so "Other" is a literal
// selectable value like every other option, not a disguised text input.
export const ACCOUNT_ROLE_OPTIONS: SelectOption[] = [
  { value: 'Founder', label: 'Founder' },
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Executive', label: 'Executive' },
  { value: 'Creator', label: 'Creator' },
  { value: 'Producer', label: 'Producer' },
  { value: 'Artist', label: 'Artist' },
  { value: 'Developer', label: 'Developer' },
  { value: 'Researcher', label: 'Researcher' },
  { value: 'Community Manager', label: 'Community Manager' },
  { value: 'Student', label: 'Student' },
  { value: 'Other', label: 'Other' },
]

export interface ProfileAdapter {
  get(): Promise<AdapterResult<AccountProfile>>
  update(fields: Partial<Pick<AccountProfile, 'displayName' | 'bio' | 'role' | 'avatarUrl' | 'organization' | 'location'>>): Promise<AdapterResult<AccountProfile>>
  /** Optional: a host with no storage backend wired up omits this -- ProfileTab falls back to URL-paste only. Uploads, returns the new public URL; does NOT itself persist avatarUrl onto the profile (the caller still calls update()). */
  uploadAvatar?(file: File): Promise<AdapterResult<{ avatarUrl: string }>>
  /** Optional, paired with uploadAvatar. Best-effort storage cleanup only -- the caller still calls update({ avatarUrl: null }) regardless of this call's outcome. */
  removeAvatar?(): Promise<AdapterResult<void>>
}

// ── Product Access (REQUIRED) ─────────────────────────────────
// Honest states only — never a fabricated entitlement.
export type ProductAvailability = 'live' | 'coming_soon'

export type EntitlementState = 'active' | 'available' | 'requested' | 'invite_only' | 'coming_soon' | 'unavailable'

// Three independent axes (RC1.1, Part 4) — never collapsed into one
// binary "live"/"coming soon" flag by this package or a host. A product
// can be `deploymentStatus: 'live'` (DNS-reachable) while
// `integrationStatus: 'pending_shared_identity'` (not yet wired to
// canonical identity) and `productAccessRequirement:
// 'entitlement_and_consent_required'` (an arbitrary signed-in user still
// isn't let in) — all three true at once, none implying the others.
export type DeploymentStatus = 'live' | 'preview' | 'internal' | 'planned' | 'unknown'
export type IntegrationStatus = 'canonical' | 'pilot' | 'pending' | 'legacy' | 'unknown'
export type ProductAccessRequirement = 'available' | 'entitlement_dependent' | 'entitlement_and_consent_required'

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
  /** Optional, additive: real DNS/production-reachability fact, independent of `availability`. Undefined for a host that hasn't supplied it yet — never inferred from `availability`. */
  deploymentStatus?: DeploymentStatus
  /** Optional, additive: how confirmed this product's canonical-identity integration is today. */
  integrationStatus?: IntegrationStatus
  /** Optional, additive: whether an arbitrary signed-in user can reach this product at all, independent of deployment/integration. */
  accessRequirement?: ProductAccessRequirement
  /** User-facing roles known for this product, if any — never fabricated when unknown. */
  roles?: string[]
}

export interface ProductWithAccess extends AccountProduct {
  entitlement: EntitlementState
  ctaLabel: string
  ctaHref?: string | null
}

export interface ProductAccessAdapter {
  list(currentProductId: string): Promise<ProductWithAccess[]>
}

// ── Access / Entitlements (OPTIONAL, Part 5) ──────────────────
// A consumer-readable expansion of ProductWithAccess above, scoped to
// "what does *my* access to each product actually look like" rather than
// the product catalog itself (ProductsTab's job). Every field is honestly
// absent (null/[]) rather than fabricated when this host has no real data
// source for it yet — see docs/IDENTITY_RC11_ACCOUNT_AUDIT.md's database
// reality check for exactly which fields that applies to today.
export type UserAccessState =
  | 'no_grant' | 'not_requested' | 'requested' | 'invited'
  | 'active' | 'suspended' | 'expired' | 'revoked'

export interface ProductAccessSummary {
  productId: string
  productName: string
  deploymentStatus: DeploymentStatus
  integrationStatus: IntegrationStatus
  /** Product-level fact: does this product require entitlement/consent at all. */
  accessRequirement: ProductAccessRequirement
  /** User-level fact: this signed-in user's actual grant state for the product — never assumed from accessRequirement. */
  userAccessState: UserAccessState
  /** Null when the granting mechanism isn't recorded (no `source` column exists yet) — never guessed. */
  source: string | null
  organizationName: string | null
  roles: string[]
  capabilities: string[]
  validFrom: string | null
  validUntil: string | null
  suspensionReason: string | null
  expiryReason: string | null
  nextAction: { kind: 'open' | 'learn_more' | 'current'; label: string; href: string | null }
}

export interface AccessAdapter {
  list(currentProductId: string): Promise<ProductAccessSummary[]>
}

// ── Organizations (OPTIONAL, Part 7) ──────────────────────────
// Minimal, host-neutral organization-context view. Self-contained (does
// not import @avatark/organizations — see package.json's zero-dependency
// rule) so this package stays independently type-checkable.
export interface AccountOrganizationMembership {
  organizationId: string
  organizationName: string
  role: string
  source: string
  validFrom: string | null
}

export interface AccountOrganizationContext {
  memberships: AccountOrganizationMembership[]
  currentOrganizationId: string | null
}

// A pending invitation to join an organization, not yet accepted/declined.
// `invitedByEmail` is null when the inviter can't be safely resolved (a
// host must never fabricate an inviter identity) -- see
// docs/ACCOUNT_ORGANIZATION_INVITATION_INTEGRATION.md for why this schema
// has no "originating product" field: organization invitations are
// platform-level, not issued by or scoped to a specific product today.
export interface AccountOrganizationInvitation {
  id: string
  /** Opaque invitation code/token -- what "Enter invitation code" accepts, and what acceptInvitation/declineInvitation take, not `id`. */
  token: string
  organizationId: string
  organizationName: string
  role: string
  invitedByEmail: string | null
  createdAt: string
  expiresAt: string
}

export interface OrganizationsAdapter {
  get(): Promise<AdapterResult<AccountOrganizationContext>>
  switchOrganization(organizationId: string | null): Promise<AdapterResult<AccountOrganizationContext>>
  /** Optional: a host with no invitation subsystem wired up yet may omit this -- the tab renders no pending-invitations section rather than a fake empty one. */
  listInvitations?(): Promise<AdapterResult<AccountOrganizationInvitation[]>>
  /** `token`, same value as "Enter invitation code" -- a listed pending invitation and a manually-entered code accept through the same path. */
  acceptInvitation?(token: string): Promise<AdapterResult<AccountOrganizationContext>>
  declineInvitation?(token: string): Promise<AdapterResult<void>>
  /** Optional: omitted entirely (not merely a no-op) when a host has no leave policy implemented -- the tab must never show a Leave control with no real backend behind it. */
  leaveOrganization?(organizationId: string): Promise<AdapterResult<AccountOrganizationContext>>
}

// ── Current Context (OPTIONAL, Platform RC Phase 1) ───────────
// A shared "where am I" signal every AvatarK product can render the same
// way. Product/Organization are NOT part of this adapter -- they're already
// available to AvatarKAccount (currentProduct/productName props,
// OrganizationsAdapter) and CurrentContextCard reads them directly, so a
// host never has to duplicate that data here. This adapter covers only the
// four forward-looking axes no product has real data for yet -- a host
// with none of them simply omits the adapter; every field then renders
// "Not active", never a fabricated value.
export interface CurrentContextState {
  livingWorld: string | null
  journey: string | null
  episode: string | null
  practice: string | null
}

export interface CurrentContextAdapter {
  get(): Promise<AdapterResult<CurrentContextState>>
}

// ── Living Worlds (OPTIONAL, Platform RC Phase 2) ─────────────
// A platform-level concept, not a GameK concept -- this contract and its
// rendering component know nothing about any specific world's name or
// franchise. A host supplies whatever worlds it wants to surface (including
// placeholder "coming soon" entries), generically shaped.
export interface LivingWorld {
  id: string
  name: string
  status: string
  description: string
  progress: string
}

export interface LivingWorldsAdapter {
  list(): Promise<AdapterResult<LivingWorld[]>>
}

// ── Notifications (OPTIONAL, Part 8) ──────────────────────────
// Category vocabulary mirrors @avatark/notifications'
// NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY but is redeclared locally for
// the same zero-dependency reason as everything else in this file — a
// host composes both without either package importing the other.
export interface NotificationCategoryPreference {
  category: string
  label: string
  mandatory: boolean
  enabled: boolean
}

export interface NotificationPreferencesState {
  deliveryActive: boolean
  categories: NotificationCategoryPreference[]
}

export interface NotificationsAdapter {
  get(): Promise<AdapterResult<NotificationPreferencesState>>
  updateCategory(category: string, enabled: boolean): Promise<AdapterResult<NotificationPreferencesState>>
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
// Options lists are host-supplied (never hardcoded in this package) so a
// host's real, reviewed locale/appearance registries stay the single
// source of truth for what's actually selectable -- see
// docs/IDENTITY_RC11_ACCOUNT_AUDIT.md for the bug this replaced (a
// hardcoded `en-GB` option with no real translation behind it).
export interface SelectOption {
  value: string
  label: string
}

export interface AccountPreferences {
  theme: string
  locale: string
  timezone: string | null
  notificationsEnabled: boolean
  reducedMotion: boolean
  /** A safe, host-registered destination id -- never an arbitrary URL a user typed. */
  defaultLandingPage: string
  /** Undefined for a host that hasn't supplied a real registry yet -- the tab falls back to a single safe default, never a hardcoded, possibly-stale list. */
  availableLocales?: SelectOption[]
  availableAppearanceModes?: SelectOption[]
  availableLandingDestinations?: SelectOption[]
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
  // 'date' (RC1.1, Part 11, additive): so a policy-dependent consent
  // control can express a real revocation/effective date (e.g. SetpointK's
  // care-team-access or research-participation consent) without a value
  // encoded as a magic string. Existing consumers that only ever branch on
  // 'boolean'/'select' are unaffected — this is a new, additive variant.
  type: 'boolean' | 'select' | 'date'
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

// ── System Information (OPTIONAL) ─────────────────────────────
// Reusable across every product that mounts this package -- the server
// decides `visibilityTier`; a host's adapter must never let client input
// widen it (see docs/ACCOUNT_SYSTEM_INFORMATION_ARCHITECTURE.md). Every
// admin-only field is `null` at the 'safe' tier, not merely hidden by the
// UI -- the tab must never receive privileged data it then has to
// remember not to render.
export type SystemInformationVisibilityTier = 'safe' | 'admin'

// 'unknown' is a first-class, honest outcome -- never collapsed into
// 'unavailable'. A host with no real signal for a service must return
// 'unknown', not guess.
export type SystemServiceStatus = 'operational' | 'degraded' | 'unavailable' | 'unknown'

export interface SystemInformationServiceStates {
  identity: SystemServiceStatus
  account: SystemServiceStatus
  storage: SystemServiceStatus
  capabilities: SystemServiceStatus
  invitations: SystemServiceStatus
  organizations: SystemServiceStatus
  audit: SystemServiceStatus
}

export interface SystemInformationSnapshot {
  visibilityTier: SystemInformationVisibilityTier
  environment: 'local' | 'preview' | 'test' | 'production' | 'unknown'
  productId: string
  productName: string

  // Safe tier
  /** Real, current plan/tier label (e.g. "Free") -- the only plan that genuinely exists today, never a fabricated tier. */
  userTier: string
  appVersion: string | null
  buildDate: string | null
  deploymentIdShort: string | null
  authProviders: string[]
  currentOrganizationId: string | null
  currentOrganizationName: string | null
  accountPackageVersion: string | null
  authUiPackageVersion: string | null
  registryVersion: string | null
  platformStatusSummary: string
  storageAvailability: SystemServiceStatus
  capabilityServiceAvailability: SystemServiceStatus
  invitationServiceAvailability: SystemServiceStatus
  statusUrl: string
  supportUrl: string

  // Admin tier only -- null at 'safe' visibility, always, not merely
  // unrendered.
  vercelEnvironment: string | null
  commitShaShort: string | null
  buildTimestamp: string | null
  supabaseProjectLabel: string | null
  migrationLevel: number | null
  services: SystemInformationServiceStates | null
  callbackOrigin: string | null
  currentSiteOrigin: string | null
  packageVersions: Record<string, string> | null
  registryRevision: string | null
  lastHealthCheckAt: string | null
  adminUrl: string | null
}

export interface SystemInformationAdapter {
  get(): Promise<AdapterResult<SystemInformationSnapshot>>
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
  access?: AccessAdapter
  organizations?: OrganizationsAdapter
  notifications?: NotificationsAdapter
  currentContext?: CurrentContextAdapter
  livingWorlds?: LivingWorldsAdapter
  /** @deprecated use `extensions` with slotId 'activity' */
  activity?: ActivityAdapter
  /** @deprecated use `extensions` with slotId 'echoes' */
  echoes?: EchoesAdapter
  /** Canonical, product-neutral extension slots (see docs/ACCOUNT_EXTENSION_CONTRACT.md). */
  extensions?: ExtensionAdapter[]
  export: ExportAdapter
  gettingStarted?: GettingStartedAdapter
  systemInformation?: SystemInformationAdapter
}
