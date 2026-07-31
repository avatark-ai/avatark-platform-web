import type { AvatarKProduct } from './types.ts'

// No product in this ecosystem has a billing/subscription system yet
// (see supabase/migrations/010_organizations.sql's own note on this, in
// avatark-platform-web). Uniform, ecosystem-wide fact -- every product's
// supportsBilling is false today, not a placeholder.
export const NO_BILLING_SYSTEM_NOTE = 'No billing/subscription system exists yet anywhere in the AvatarK ecosystem.'

// Shared base so adding a product only means overriding what's actually
// true for it, per the "one object" design goal -- not restating 13
// false flags every time. No confirmed feature in this ecosystem today
// implements a literal digital-twin experience, so that flag is left
// false at the base rather than per product.
const NO_CAPABILITIES = {
  supportsAuth: false,
  supportsAccount: false,
  supportsInvitations: false,
  supportsLivingEcho: false,
  supportsNavigation: false,
  supportsOrganizations: false,
  supportsMarketplace: false,
  supportsBilling: false,
  supportsNotifications: false,
  supportsRecommendations: false,
  supportsEcho: false,
  supportsPractices: false,
  supportsEvents: false,
  supportsChallenges: false,
  supportsLeagues: false,
  supportsStreaming: false,
  supportsContent: false,
  supportsDigitalTwin: false,
} satisfies Pick<
  AvatarKProduct,
  | 'supportsAuth'
  | 'supportsAccount'
  | 'supportsInvitations'
  | 'supportsLivingEcho'
  | 'supportsNavigation'
  | 'supportsOrganizations'
  | 'supportsMarketplace'
  | 'supportsBilling'
  | 'supportsNotifications'
  | 'supportsRecommendations'
  | 'supportsEcho'
  | 'supportsPractices'
  | 'supportsEvents'
  | 'supportsChallenges'
  | 'supportsLeagues'
  | 'supportsStreaming'
  | 'supportsContent'
  | 'supportsDigitalTwin'
>

const NO_LINKS: AvatarKProduct['navigationLinks'] = []

// icon/accentColor/logo below are placeholder presentation tokens (a
// design decision so every consumer renders something consistent), not
// confirmed brand facts -- swap for real assets when they exist. `logo`
// stays null for every product: no real logo asset file was found in any
// local repo's public/ directory.

export const PRODUCT_REGISTRY: AvatarKProduct[] = [
  {
    // The platform itself. Included so "every product registers through
    // the Platform registry" is literally true rather than an implicit
    // exception.
    id: 'avatark',
    slug: 'avatark',
    displayName: 'AvatarK',
    tagline: 'Identity, account, organizations, and platform administration for the AvatarK ecosystem',
    description:
      'The shared layer every AvatarK product integrates with: identity, authentication, account, organizations, roles, permissions, product access, and platform administration. Domain finalized as this repo\'s real, linked Vercel project origin (`.vercel/repo.json`\'s project name is `avatark-platform-web`; `prometheusk-web`\'s own RC5 receipt allowlist -- `lib/onboarding/returnOrigin.ts`\'s `DEFAULT_ALLOWED_ORIGINS` -- already trusts this exact origin as Platform\'s production address, confirming it is not a guess but the address another repo already depends on today, 2026-07-21). A custom branded domain (e.g. avatark.ai/avatark.io, both used inconsistently by other, non-canonical surfaces per the cross-repo audit) remains an open, undecided naming/DNS question -- not resolved or invented here.',
    status: 'live',
    domain: 'https://avatark-platform-web.vercel.app',
    previewDomain: null,
    icon: 'sparkles',
    accentColor: '#111827',
    logo: null,
    category: 'platform',
    owner: null,
    repository: 'avatark-platform-web',
    visibility: 'public',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    // Native: this repo owns Identity/Auth, consumes @avatark/account itself,
    // is the real ArenaK-invitation consumer, and owns cross-product navigation
    // -- see docs/PLATFORM_CONTRACTS.md's Identity/Authentication/Account/
    // Invitations sections. supportsLivingEcho stays false: Living Echo is
    // PrometheusK's alone, and this repo's relationship to it is confirmed
    // link-only, not producer/consumer (docs/PLATFORM_INTEGRATION_MATRIX.md's
    // Avatar row, Living Echo column).
    supportsAuth: true,
    supportsAccount: true,
    supportsInvitations: true,
    supportsNavigation: true,
    supportsOrganizations: true,
    navigationLinks: [
      { label: 'Home', href: '/' },
      { label: 'Start', href: '/start' },
      { label: 'Journey', href: '/journey' },
    ],
    footerLinks: [{ label: 'Account', href: '/account' }],
    helpLinks: NO_LINKS,
    supportEmail: 'support@avatark.ai',
    documentation: null,
  },
  {
    id: 'prometheusk',
    slug: 'prometheusk',
    displayName: 'PrometheusK',
    tagline: 'Turns recurring observations and inherited wisdom into practices you can attempt, reflect on, and improve.',
    description:
      'The practice product: guided practices, reflection, evidence/contribution tracking, challenges, and Living Echo -- the recorded trace of a person’s practice over time.',
    status: 'live',
    domain: 'https://prometheusk.avatark.io',
    previewDomain: null,
    icon: 'flame',
    accentColor: '#c2410c',
    logo: null,
    category: 'practice',
    owner: null,
    repository: 'prometheusk-web',
    visibility: 'public',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    // supportsAuth/supportsAccount stay false: PrometheusK runs its own
    // separate Supabase project and does not consume this repo's shared
    // identity/account contract (docs/PLATFORM_INTEGRATION_MATRIX.md's
    // Prometheus row: "separate Supabase project" / "unconfirmed"). The one
    // confirmed producer relationship in this ecosystem: Living Echo.
    supportsInvitations: true,
    supportsLivingEcho: true,
    supportsRecommendations: true,
    supportsEcho: true,
    supportsPractices: true,
    supportsChallenges: true,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
    journeyRole: 'growth-engine',
    journeyOrder: 1,
    integrationStatus: 'live',
    nextProductIds: ['arenak'],
  },
  {
    id: 'gamek',
    slug: 'gamek',
    displayName: 'GameK',
    tagline: 'Turns learning into experience through flow, paths, and navigation.',
    description:
      'Tracks world progress and consumer game state, and exchanges completion events with PrometheusK via a defined export/inbound contract.',
    status: 'beta',
    domain: 'https://gamek.ai',
    previewDomain: null,
    icon: 'gamepad-2',
    accentColor: '#7c3aed',
    logo: null,
    category: 'game',
    owner: null,
    repository: 'gamek-web',
    visibility: 'public',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    // GameK Phase 1 platform integration is confirmed complete: Shared
    // Auth, Shared Account, Product Context, Avatar Menu, My Journey
    // deep-link, Arena Invitation handoff (docs/PLATFORM_INTEGRATION_MATRIX.md's
    // Game row) -- the most-integrated non-Avatar product in the ecosystem.
    supportsAuth: true,
    supportsAccount: true,
    supportsInvitations: true,
    supportsNavigation: true,
    supportsEvents: true,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
    journeyRole: 'growth-engine',
    journeyOrder: 2,
    // 'live', not 'beta' (GameK's own `status`): this repo's confirmed
    // integration with GameK (the cross-repo event contract above) is
    // already real today, even though GameK's own product maturity isn't
    // yet 'live'. integrationStatus tracks platform integration, not
    // product maturity -- the two are allowed to diverge.
    integrationStatus: 'live',
    nextProductIds: ['arenak'],
    // FlowK/PathK/GeometriK/ChronicleK: GameK's own learning experiences
    // (confirmed via gamek-web's site structure, e.g. its `flowk` Vercel
    // project at gamek.ai/flowk) -- named here once so any surface listing
    // them stays in sync with GameK's real internal structure.
    experiences: [
      { id: 'flowk', name: 'FlowK' },
      { id: 'pathk', name: 'PathK' },
      { id: 'geometrik', name: 'GeometriK' },
      { id: 'chroniclek', name: 'ChronicleK' },
    ],
  },
  {
    id: 'arenak',
    slug: 'arenak',
    displayName: 'ArenaK',
    tagline: 'Gives private practice a communal dimension through challenges, cohorts, and recognition.',
    description:
      'Competitive layer: invitations, enrollments, challenges, leagues, and rankings. `repository` stays null: the real implementation lives inside a separate `dt4m-os` repo’s `apps/avatark-consumer`, not as a sibling repo folder in this workspace the way every other non-null `repository` value here is.',
    // status stays 'alpha' deliberately, separate from the domain/visibility
    // fix above -- visibility='public' + domain confirm the destination is
    // real and reachable; status is a maturity call (alpha/beta/live) this
    // registry fix does not make unilaterally. Together will keep showing
    // "coming soon" on the consumer home page until a human decides status
    // should move (see registryAvailability() in lib/activities/registry.ts:
    // it requires status to be 'live' or 'beta', not just visibility, before
    // ever returning something other than coming_soon).
    status: 'alpha',
    // Canonical production domain as of this pass. A future redirect to the
    // consumer practice experience (practice.arenak.ai or a different final
    // destination) is planned but not live yet -- update this one field when
    // that destination is ready, since every consumer (header, ecosystem,
    // footer) resolves through it.
    domain: 'https://arenak.ai',
    previewDomain: null,
    icon: 'trophy',
    accentColor: '#b45309',
    logo: null,
    category: 'competition',
    owner: null,
    repository: null,
    visibility: 'public',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    // ArenaK owns the Invitations contract as producer (docs/PLATFORM_CONTRACTS.md's
    // Invitations section) -- supportsInvitations reflects ownership, not
    // consumption, the one product in this registry where that distinction matters.
    supportsInvitations: true,
    supportsEvents: true,
    supportsChallenges: true,
    supportsLeagues: true,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
    journeyRole: 'convergence',
    journeyOrder: 1,
    integrationStatus: 'coming-online',
    nextProductIds: ['streamk'],
  },
  {
    id: 'streamk',
    slug: 'streamk',
    displayName: 'StreamK',
    tagline: 'Witness journeys, practices, and stories as they unfold.',
    description:
      'Live and on-demand streaming. Scope (feature-level integration with Platform, beyond domain reachability) not yet confirmed.',
    // status stays 'alpha' for the same reason as ArenaK's -- see the
    // comment on that entry. Domain reachability confirms the destination
    // is real, not that the product is mature enough for a status bump.
    status: 'alpha',
    domain: 'https://streamk.ai',
    previewDomain: null,
    icon: 'video',
    accentColor: '#0369a1',
    logo: null,
    category: 'streaming',
    owner: null,
    repository: 'streamk-web',
    visibility: 'public',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    // Named as a target Invitations consumer in docs/PLATFORM_CONTRACTS.md
    // ("Owned by ArenaK. Consumed by: AvatarK, GameK, PrometheusK, StreamK,
    // StudioK") -- no confirmed real implementation, same target-vocabulary
    // convention as supportsRecommendations elsewhere in this registry.
    supportsInvitations: true,
    supportsStreaming: true,
    supportsContent: true,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
    journeyRole: 'expression',
    journeyOrder: 1,
    integrationStatus: 'in-development',
    nextProductIds: ['cinemak'],
  },
  {
    id: 'cinemak',
    slug: 'cinemak',
    displayName: 'CinemaK',
    tagline: 'Carry those same human stories into enduring cinematic form.',
    description: 'Film and cinema-format media. Scope not yet integrated with Platform.',
    status: 'alpha',
    domain: 'https://cinemak.ai',
    previewDomain: null,
    icon: 'clapperboard',
    accentColor: '#831843',
    logo: null,
    category: 'media',
    owner: null,
    repository: 'cinemak-web',
    visibility: 'internal',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    supportsStreaming: true,
    supportsContent: true,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
    journeyRole: 'expression',
    journeyOrder: 2,
    integrationStatus: 'vision',
    nextProductIds: [],
  },
  {
    id: 'studiok',
    slug: 'studiok',
    displayName: 'StudioK',
    tagline: 'Creation tools for the ecosystem’s own content and practices.',
    description:
      'Creation tools. Scope not yet integrated with Platform. No confirmed local repository found in this workspace -- a real, actively-deployed Vercel project exists under a name that doesn’t match this ecosystem’s planning documents.',
    status: 'alpha',
    domain: 'https://studiok.dt4m.ai',
    previewDomain: null,
    icon: 'palette',
    accentColor: '#0d9488',
    logo: null,
    category: 'creation',
    owner: null,
    repository: null,
    visibility: 'internal',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    // Named as a target Invitations consumer, same citation as StreamK above.
    supportsInvitations: true,
    supportsContent: true,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
  },
  {
    id: 'atlas',
    slug: 'atlas',
    displayName: 'Atlas',
    tagline: 'Connects knowledge, evidence, relationships, and decisions.',
    description: 'Exploration/reference product. Scope not yet integrated with Platform.',
    status: 'alpha',
    domain: 'https://atlas.dt4i.ai',
    previewDomain: null,
    icon: 'map',
    accentColor: '#166534',
    logo: null,
    category: 'exploration',
    owner: null,
    repository: 'atlas-web',
    visibility: 'internal',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    supportsContent: true,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
    journeyRole: 'growth-engine',
    journeyOrder: 3,
    integrationStatus: 'preview',
    nextProductIds: ['arenak'],
  },
  {
    id: 'setpointk',
    slug: 'setpointk',
    displayName: 'SetpointK',
    tagline: 'Human-state intelligence: longitudinal health, adaptive protocols, and digital-twin reasoning via the SETPOINT Physiological Index',
    description:
      'Wellness/goal-setting product. Historically backed by its own Cognito auth; not yet integrated with Platform identity. No local repository found in this workspace.',
    status: 'internal',
    domain: 'https://setpointk.ai',
    previewDomain: null,
    icon: 'compass',
    accentColor: '#4338ca',
    logo: null,
    category: 'wellness',
    owner: null,
    repository: null,
    visibility: 'internal',
    requiresAuth: true,
    ...NO_CAPABILITIES,
    navigationLinks: NO_LINKS,
    footerLinks: NO_LINKS,
    helpLinks: NO_LINKS,
    supportEmail: null,
    documentation: null,
  },
]

export const PRODUCT_IDS = PRODUCT_REGISTRY.map((p) => p.id)
