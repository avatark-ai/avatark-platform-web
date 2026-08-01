// Real, honest test doubles -- every method returns genuinely well-formed
// data by default; error and empty states are opt-in via options.
import type { AccountAdapters, StatEntry, ProductWithAccess, ProductAccessSummary } from '../contracts/adapters.ts'

// Fixture products spanning every combination of the three-axis model
// (RC1.1, Part 4) -- deliberately synthetic ids/names, never a real
// product's identity (this package is host-neutral -- see
// importBoundary.test.ts), just enough variety to visually exercise every
// state a real host might show.
const MOCK_PRODUCTS: ProductWithAccess[] = [
  { id: 'mock-host', name: 'Mock Host', purpose: 'Identity and account home', url: null, availability: 'live', deploymentStatus: 'live', integrationStatus: 'canonical', accessRequirement: 'available', roles: ['admin'], entitlement: 'active', ctaLabel: "You're here", ctaHref: null },
  { id: 'mock-product-b', name: 'Mock Product B', purpose: 'Open, always-available product', url: 'https://mock-b.example.invalid', availability: 'live', deploymentStatus: 'live', integrationStatus: 'legacy', accessRequirement: 'available', roles: [], entitlement: 'available', ctaLabel: 'Open', ctaHref: 'https://mock-b.example.invalid' },
  { id: 'mock-product-c', name: 'Mock Product C', purpose: 'Deployed, canonical-identity-pending product', url: 'https://mock-c.example.invalid', availability: 'live', deploymentStatus: 'live', integrationStatus: 'pending', accessRequirement: 'available', roles: [], entitlement: 'available', ctaLabel: 'Open', ctaHref: 'https://mock-c.example.invalid' },
  { id: 'mock-product-d', name: 'Mock Product D', purpose: 'Entitlement-gated product', url: 'https://mock-d.example.invalid', availability: 'live', deploymentStatus: 'live', integrationStatus: 'pending', accessRequirement: 'entitlement_dependent', roles: [], entitlement: 'invite_only', ctaLabel: 'Learn more', ctaHref: 'https://mock-d.example.invalid' },
  { id: 'mock-product-e', name: 'Mock Product E', purpose: 'Entitlement- and consent-gated product', url: 'https://mock-e.example.invalid', availability: 'live', deploymentStatus: 'live', integrationStatus: 'pending', accessRequirement: 'entitlement_and_consent_required', roles: [], entitlement: 'invite_only', ctaLabel: 'Learn more', ctaHref: 'https://mock-e.example.invalid' },
]

const MOCK_ACCESS: ProductAccessSummary[] = [
  { productId: 'mock-host', productName: 'Mock Host', deploymentStatus: 'live', integrationStatus: 'canonical', accessRequirement: 'available', userAccessState: 'active', source: 'public', organizationName: null, roles: ['admin'], capabilities: [], validFrom: null, validUntil: null, suspensionReason: null, expiryReason: null, nextAction: { kind: 'current', label: "You're here", href: null } },
  { productId: 'mock-product-d', productName: 'Mock Product D', deploymentStatus: 'live', integrationStatus: 'pending', accessRequirement: 'entitlement_dependent', userAccessState: 'active', source: 'invitation', organizationName: 'Mock University', roles: ['Organizer'], capabilities: ['Create events', 'Invite participants'], validFrom: new Date('2026-01-01').toISOString(), validUntil: null, suspensionReason: null, expiryReason: null, nextAction: { kind: 'open', label: 'Open', href: 'https://mock-d.example.invalid' } },
  { productId: 'mock-product-e', productName: 'Mock Product E', deploymentStatus: 'live', integrationStatus: 'pending', accessRequirement: 'entitlement_and_consent_required', userAccessState: 'no_grant', source: null, organizationName: null, roles: [], capabilities: [], validFrom: null, validUntil: null, suspensionReason: null, expiryReason: null, nextAction: { kind: 'learn_more', label: 'Learn more', href: 'https://mock-e.example.invalid' } },
]

export interface MockAdapterOptions {
  delayMs?: number
  forceError?: boolean
  omitOptional?: boolean
}

export function createMockAdapters(opts: MockAdapterOptions = {}): AccountAdapters {
  const { delayMs = 0, forceError = false } = opts
  const wait = <T,>(v: T) => new Promise<T>(resolve => setTimeout(() => resolve(v), delayMs))

  const base: AccountAdapters = {
    support: { supportEmail: 'support@example.invalid' },
    links: opts.omitOptional ? undefined : {
      activityFullViewHref: '/mock/timeline', createEchoHref: '/mock/create-echo',
      viewLivingEchoHref: '/mock/echo', startPracticeHref: '/mock/practice',
    },
    auth: {
      getIdentities: () => wait(['google']),
      isEmailVerified: () => wait(true),
      changeEmail: () => wait(forceError ? { error: { message: 'Mock email change failure' } } : {}),
      linkGoogleIdentity: () => wait(forceError ? { error: { message: 'Mock link failure' } } : {}),
      signOut: () => wait(undefined),
      signOutAllDevices: opts.omitOptional ? undefined : () => wait(forceError ? { error: { message: 'Mock sign-out-all failure' } } : {}),
    },
    profile: {
      get: () => wait(forceError
        ? { error: 'Mock profile fetch failure' }
        : { data: { id: 'mock-user', email: 'mock@example.com', displayName: 'Mock User', bio: null, role: null, avatarUrl: null, organization: null, location: null, createdAt: new Date().toISOString() } }),
      update: (fields) => wait(forceError
        ? { error: 'Mock profile update failure' }
        : { data: { id: 'mock-user', email: 'mock@example.com', displayName: fields.displayName ?? 'Mock User', bio: fields.bio ?? null, role: fields.role ?? null, avatarUrl: fields.avatarUrl ?? null, organization: fields.organization ?? null, location: fields.location ?? null, createdAt: new Date().toISOString() } }),
    },
    productAccess: {
      list: () => wait(MOCK_PRODUCTS),
    },
    membership: {
      getSummary: (_stats: StatEntry[]) => ({ planName: 'Free', creatorStatus: 'Member' }),
      getRelationships: () => wait([]),
      getRoles: () => ['admin'],
      getBenefits: () => [],
    },
    access: opts.omitOptional ? undefined : {
      list: () => wait(MOCK_ACCESS),
    },
    organizations: opts.omitOptional ? undefined : {
      get: () => wait(forceError
        ? { error: 'Mock organization fetch failure' }
        : { data: {
            memberships: [{ organizationId: 'org-mock-1', organizationName: 'Mock University', role: 'Organizer', source: 'invitation', validFrom: new Date('2026-01-01').toISOString() }],
            currentOrganizationId: null,
          } }),
      switchOrganization: (organizationId) => wait({ data: {
        memberships: [{ organizationId: 'org-mock-1', organizationName: 'Mock University', role: 'Organizer', source: 'invitation', validFrom: new Date('2026-01-01').toISOString() }],
        currentOrganizationId: organizationId,
      } }),
    },
    preferences: {
      get: () => wait(forceError
        ? { error: 'Mock preferences fetch failure' }
        : { data: {
            theme: 'dark', locale: 'en-US', timezone: 'America/Los_Angeles', notificationsEnabled: true, reducedMotion: false, defaultLandingPage: '/',
            availableAppearanceModes: [{ value: 'system', label: 'Match system' }, { value: 'dark', label: 'Dark' }],
            availableLocales: [{ value: 'en-US', label: 'English (United States)' }, { value: 'en-IN', label: 'English (India)' }],
            availableLandingDestinations: [{ value: '/', label: 'Home' }, { value: '/account', label: 'Account' }],
          } }),
      update: (fields) => wait(forceError
        ? { error: 'Mock preferences update failure' }
        : { data: { theme: fields.theme ?? 'dark', locale: fields.locale ?? 'en-US', timezone: fields.timezone ?? 'America/Los_Angeles', notificationsEnabled: fields.notificationsEnabled ?? true, reducedMotion: fields.reducedMotion ?? false, defaultLandingPage: fields.defaultLandingPage ?? '/' } }),
    },
    notifications: opts.omitOptional ? undefined : {
      get: () => wait(forceError
        ? { error: 'Mock notifications fetch failure' }
        : { data: {
            deliveryActive: false,
            categories: [
              { category: 'security_account', label: 'Security and account', mandatory: true, enabled: true },
              { category: 'invitations', label: 'Invitations', mandatory: false, enabled: true },
              { category: 'practices_reflections', label: 'Practices and reflections', mandatory: false, enabled: true },
              { category: 'events', label: 'Events', mandatory: false, enabled: false },
              { category: 'product_announcements', label: 'Product announcements', mandatory: false, enabled: true },
            ],
          } }),
      updateCategory: (category, enabled) => wait({ data: {
        deliveryActive: false,
        categories: [
          { category: 'security_account', label: 'Security and account', mandatory: true, enabled: true },
          { category, label: category, mandatory: false, enabled },
        ],
      } }),
    },
    privacy: opts.omitOptional ? undefined : {
      get: () => wait(forceError
        ? { error: 'Mock privacy fetch failure' }
        : { data: { platform: {
            profileVisibility: 'private', discoverable: false,
            productCommunicationsEnabled: true, personalizationEnabled: true, analyticsEnabled: true,
          } } }),
      updatePlatform: (fields) => wait(forceError
        ? { error: 'Mock privacy update failure' }
        : { data: {
            profileVisibility: fields.profileVisibility ?? 'private',
            discoverable: fields.discoverable ?? false,
            productCommunicationsEnabled: fields.productCommunicationsEnabled ?? true,
            personalizationEnabled: fields.personalizationEnabled ?? true,
            analyticsEnabled: fields.analyticsEnabled ?? true,
          } }),
      updateProductControl: (id, value) => wait(forceError
        ? { error: 'Mock privacy control update failure' }
        : { data: { id, label: id, type: typeof value === 'boolean' ? 'boolean' : 'select', value } }),
      listPublicContent: () => wait([]),
    },
    activity: opts.omitOptional ? undefined : {
      getRecent: () => wait(forceError ? { error: 'Mock activity fetch failure' } : { data: { events: [] } }),
    },
    echoes: opts.omitOptional ? undefined : {
      listOwn: () => wait(forceError ? { error: 'Mock echoes fetch failure' } : { data: [] }),
    },
    extensions: opts.omitOptional ? undefined : [
      {
        slotId: 'mock-extension',
        label: 'Mock Extension',
        get: () => wait(forceError ? { error: 'Mock extension fetch failure' } : { data: { items: [] } }),
      },
    ],
    export: {
      exportFullAccount: () => wait(undefined),
      exportActivityCsv: () => wait(undefined),
    },
    gettingStarted: opts.omitOptional ? undefined : {
      getStatus: () => wait({ data: { completed: true, stepsRemaining: [] } }),
    },
  }

  return base
}
