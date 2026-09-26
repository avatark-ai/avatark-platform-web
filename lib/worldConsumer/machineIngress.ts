// WORLDK-M12: machine-ingress host gate.
//
// `platform-preview.avatark.ai` is a MACHINE ACCESS BOUNDARY for the
// WorldK Preview server, not a browsable Platform Preview website. On
// that host (and only that host) every request is denied unless it
//   1. carries the dedicated M12 machine credential (X-WorldK-Preview-Key),
//   2. targets exactly one of the WorldK consumer routes: the two
//      projections (GET) or, since WORLDK-M14-A, world entry (POST).
// Method handling is left to the routes.
//
// WORLDK-M14-A adds a second, SELF-AUTHENTICATING class that never carries
// the WorldK key: the handoff gateway (authenticated by the single-use
// EntryTicket / its HttpOnly session capability), the Runtime Ingress
// (authenticated by the runtime's own per-instance credential, verified in
// the database) and the presence-sweep trigger (its own key). Those routes
// refuse unauthenticated callers themselves; the WorldK machine key grants
// nothing on them.
//
// The machine credential authenticates the WorldK SERVER only. It never
// carries, selects or overrides visitor identity: the visitor projection
// still derives subjectId from the verified Supabase session cookie. The
// header is stripped before the request reaches any route handler.
//
// The host is a code constant, not an env var, so a missing/renamed env
// can never silently turn the gate off: on this host a missing or
// malformed configured key denies everything.
import { createHash, timingSafeEqual } from 'node:crypto'

export const MACHINE_INGRESS_HOST = 'platform-preview.avatark.ai'
export const MACHINE_KEY_HEADER = 'x-worldk-preview-key'
export const MACHINE_KEY_ENV = 'WORLDK_PREVIEW_MACHINE_KEY'

// base64url, >= 32 bytes of entropy (43 chars), bounded length.
const KEY_FORMAT = /^[A-Za-z0-9_-]{43,128}$/
const ALLOWED_PATH = /^\/api\/worlds\/[^/]+\/(?:public-projection|visitor-projection|entry)$/
const SELF_AUTHENTICATING_PATH = /^(?:\/world-entry\/h\/[A-Za-z0-9_-]{43}|\/world-entry\/session|\/world-entry\/session\/leave|\/api\/runtime\/v1\/(?:poll|claim|arrival|presence|departure|disconnect)|\/api\/platform\/v1\/presence-sweep)$/

/** Normalises a Host header: lowercase, no port, no trailing dot. */
export function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return ''
  let h = raw.trim().toLowerCase()
  if (h.startsWith('[')) return h // IPv6 literal, never the ingress host
  const colon = h.indexOf(':')
  if (colon !== -1) h = h.slice(0, colon)
  while (h.endsWith('.')) h = h.slice(0, -1)
  return h
}

export function isMachineIngressHost(rawHost: string | null | undefined): boolean {
  return normalizeHost(rawHost) === MACHINE_INGRESS_HOST
}

function digest(v: string): Buffer {
  return createHash('sha256').update(v, 'utf8').digest()
}

/** Constant-time comparison of two well-formed keys. */
export function machineKeyMatches(supplied: string | null | undefined, configured: string | null | undefined): boolean {
  if (typeof configured !== 'string' || !KEY_FORMAT.test(configured)) return false
  if (typeof supplied !== 'string' || !KEY_FORMAT.test(supplied)) return false
  // Hash first so timingSafeEqual always sees equal-length inputs.
  return timingSafeEqual(digest(supplied), digest(configured))
}

export type IngressDecision =
  | { kind: 'ALLOW' }
  | { kind: 'ALLOW_SELF_AUTHENTICATING' }
  | { kind: 'DENY'; status: 401 | 404; code: 'MACHINE_UNAUTHORIZED' | 'NOT_FOUND' }

/**
 * Pure decision for a request that has ALREADY been identified as
 * arriving on the machine-ingress host. Credential first, so an
 * unauthenticated caller learns nothing about which paths exist.
 */
export function decideMachineIngress(input: {
  pathname: string
  suppliedKey: string | null
  configuredKey: string | undefined
}): IngressDecision {
  // WORLDK-M14-A: these routes authenticate their own callers.
  if (SELF_AUTHENTICATING_PATH.test(input.pathname)) return { kind: 'ALLOW_SELF_AUTHENTICATING' }
  if (!machineKeyMatches(input.suppliedKey, input.configuredKey)) {
    return { kind: 'DENY', status: 401, code: 'MACHINE_UNAUTHORIZED' }
  }
  if (!ALLOWED_PATH.test(input.pathname)) return { kind: 'DENY', status: 404, code: 'NOT_FOUND' }
  // Any method on an allowed path passes through so the route answers
  // with its own contract (the routes export GET only -> POST is 405).
  return { kind: 'ALLOW' }
}

/** Denial body: fixed, secret-free, never echoes request data. */
export function denialResponse(d: Extract<IngressDecision, { kind: 'DENY' }>): Response {
  return new Response(JSON.stringify({ error: d.code }), {
    status: d.status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}

/** Copy of the request headers with the machine credential removed. */
export function withoutMachineKey(headers: Headers): Headers {
  const h = new Headers(headers)
  h.delete(MACHINE_KEY_HEADER)
  return h
}
