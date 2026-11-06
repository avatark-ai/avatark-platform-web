// AVK-PROD-03A (C7, T2): frozen classification of every route this app can build. Every route
// pattern must appear in exactly one class; scripts/check-route-inventory.ts runs before
// `next build` and fails the build on any unclassified or missing route, so no new route can ship
// in the institutional release without an explicit decision.
// Source: AVK-PROD-02R / PROD-03 frozen inventory (14 allow + 59 exclude + framework).
// AVK-PROD-03C-02a adds a fourth class, LEGAL. These routes exist in source but are served only when their
// document passes lib/release/legalGate.ts. ALLOW stays the frozen 14.
import { LEGAL_ROUTE_PATHS } from './legalGate.ts'

export const ALLOW_ROUTES = [
  '/',
  '/canon',
  '/canon/alignment',
  '/canon/dynamics',
  '/canon/operators',
  '/canon/sacred-geometry',
  '/canon/sacred-geometry/[slug]',
  '/ecosystem',
  '/foundation',
  '/founder',
  '/founder/future',
  '/founder/question',
  '/founder/synthesis',
  '/living-worlds',
] as const

export const EXCLUDE_ROUTES = {
  auth: ['/auth/callback', '/auth/sign-in'],
  account: ['/account', '/api/account/preferences', '/api/account/privacy', '/api/account/profile'],
  admin: [
    '/admin', '/admin/audit', '/admin/organizations', '/admin/organizations/[id]', '/admin/products', '/admin/roles',
    '/admin/settings', '/admin/settings/auth', '/admin/settings/email', '/admin/settings/environment', '/admin/support',
    '/admin/users', '/api/admin/organizations', '/api/admin/organizations/[id]/invitations',
    '/api/admin/organizations/[id]/invitations/[invitationId]', '/api/admin/organizations/[id]/members/[userId]',
    '/api/admin/users/lookup',
  ],
  identity: ['/api/identity/me', '/api/identity/verify'],
  onboarding: ['/api/onboarding/begin'],
  developer: ['/dev/integration', '/dev/integration/simulator'],
  integration: ['/integration/dashboard'],
  echoApplication: [
    '/continue', '/discover', '/echo/[slug]', '/echo/create', '/enter', '/enter/[token]', '/guide/[slug]', '/journey',
    '/journey/history', '/journey/settings', '/journey/today', '/my/echo', '/my/echo/living-preview', '/my/journal',
    '/my/journey', '/practice/[id]', '/start', '/start/choose', '/stories', '/today', '/watch-first', '/what-is-an-echo',
    '/witness/[slug]',
  ],
  community: ['/community', '/community/challenges', '/community/cohorts', '/community/events', '/community/groups', '/community/recognition'],
  roadmap: ['/roadmap'],
} as const

/** Framework routes: Next.js internals plus the favicon and robots.txt metadata routes. */
export const FRAMEWORK_ROUTES = ['/_global-error', '/_not-found', '/favicon.ico', '/robots.txt'] as const

export const EXCLUDED_ROUTE_LIST: readonly string[] = Object.values(EXCLUDE_ROUTES).flat()

/** Approval-gated legal pages (AVK-PROD-03C-02a): 404 unless counsel-approved (see legalGate.ts). */
export const LEGAL_ROUTES: readonly string[] = LEGAL_ROUTE_PATHS

export type RouteClass = 'ALLOW' | 'LEGAL' | 'EXCLUDE' | 'FRAMEWORK'

export function classifyRoute(route: string): RouteClass | null {
  if ((ALLOW_ROUTES as readonly string[]).includes(route)) return 'ALLOW'
  if (LEGAL_ROUTES.includes(route)) return 'LEGAL'
  if (EXCLUDED_ROUTE_LIST.includes(route)) return 'EXCLUDE'
  if ((FRAMEWORK_ROUTES as readonly string[]).includes(route)) return 'FRAMEWORK'
  return null
}
