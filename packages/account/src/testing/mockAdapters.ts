// Real, honest test doubles -- every method returns genuinely well-formed
// data by default; error and empty states are opt-in via options.
import type { AccountAdapters, StatEntry } from '../contracts/adapters.ts'

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
      changeEmail: () => wait(forceError ? { error: { message: 'Mock email change failure' } } : {}),
      linkGoogleIdentity: () => wait(forceError ? { error: { message: 'Mock link failure' } } : {}),
      signOut: () => wait(undefined),
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
      list: () => wait([]),
    },
    membership: {
      getSummary: (_stats: StatEntry[]) => ({ planName: 'Free', creatorStatus: 'Member' }),
      getRelationships: () => wait([]),
      getRoles: () => [],
      getBenefits: () => [],
    },
    preferences: {
      get: () => wait(forceError
        ? { error: 'Mock preferences fetch failure' }
        : { data: { theme: 'dark', locale: 'en-US', timezone: 'America/Los_Angeles', notificationsEnabled: true, reducedMotion: false, defaultLandingPage: '/' } }),
      update: (fields) => wait(forceError
        ? { error: 'Mock preferences update failure' }
        : { data: { theme: 'dark', locale: fields.locale ?? 'en-US', timezone: fields.timezone ?? 'America/Los_Angeles', notificationsEnabled: fields.notificationsEnabled ?? true, reducedMotion: fields.reducedMotion ?? false, defaultLandingPage: fields.defaultLandingPage ?? '/' } }),
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
