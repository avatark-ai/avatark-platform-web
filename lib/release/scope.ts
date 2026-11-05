// AVK-PROD-03A (C1/C2): immutable release scope and deny-by-default request allowlist.
//
// The release scope is a CODE CONSTANT, never an environment variable: a missing, renamed or
// mis-set env can never widen what this build serves. Widening the scope (Scope II) requires a
// code change through its own owner gate.
//
// Pure module (no next/* imports) so it loads under `node --test` and inside proxy.ts alike.

export type ReleaseScope = 'institutional' | 'platform'

export const RELEASE_SCOPE: ReleaseScope = 'institutional'

export function isInstitutionalScope(scope: ReleaseScope = RELEASE_SCOPE): boolean {
  return scope === 'institutional'
}

// The exact 12 Canon plate slugs (AVK-PROD-02R frozen inventory). Pinned here as a closed list;
// lib/release/scope.test.ts cross-checks it against lib/content/canonPlates.ts.
export const CANON_PLATE_SLUGS = [
  'orientation',
  'symmetry',
  'repetition',
  'verticality',
  'threshold',
  'precision',
  'circumambulation',
  'material-logic',
  'fractals',
  'time',
  'erosion',
  'synthesis',
] as const

// The 13 fixed institutional pages; with the 12 plates this is the frozen set of 25 URLs.
export const INSTITUTIONAL_PAGES = [
  '/',
  '/living-worlds',
  '/foundation',
  '/ecosystem',
  '/canon',
  '/canon/alignment',
  '/canon/dynamics',
  '/canon/operators',
  '/canon/sacred-geometry',
  '/founder',
  '/founder/question',
  '/founder/synthesis',
  '/founder/future',
] as const

export const INSTITUTIONAL_URLS: readonly string[] = [
  ...INSTITUTIONAL_PAGES,
  ...CANON_PLATE_SLUGS.map((slug) => `/canon/sacred-geometry/${slug}`),
]

// Framework resources answered by this app itself. /_next/static/* is served before the proxy
// (excluded from its matcher) and is listed here only so the pure decision stays complete.
export const FRAMEWORK_PATHS = ['/favicon.ico', '/robots.txt'] as const
const STATIC_ASSET_PREFIX = '/_next/static/'

const ALLOWED = new Set<string>([...INSTITUTIONAL_URLS, ...FRAMEWORK_PATHS])
const ALLOWED_METHODS = new Set(['GET', 'HEAD'])

export type RequestDecision =
  | { kind: 'ALLOW' }
  | { kind: 'DENY'; status: 404 }
  | { kind: 'DENY'; status: 405 }

/**
 * Exact-match decision on the raw request pathname. Anything not byte-identical to an allowed
 * path -- encoded variants, trailing slashes, case changes, dot segments, double slashes,
 * extensions -- is denied, so normalisation tricks cannot reach an excluded route.
 * Path first (404), then method (405): an unsupported method on an excluded path stays 404.
 */
export function decideRequest(method: string, pathname: string, scope: ReleaseScope = RELEASE_SCOPE): RequestDecision {
  if (!isInstitutionalScope(scope)) return { kind: 'ALLOW' }
  const allowedPath = ALLOWED.has(pathname) || (pathname.startsWith(STATIC_ASSET_PREFIX) && !pathname.includes('..'))
  if (!allowedPath) return { kind: 'DENY', status: 404 }
  if (!ALLOWED_METHODS.has(method.toUpperCase())) return { kind: 'DENY', status: 405 }
  return { kind: 'ALLOW' }
}
