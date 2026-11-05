// AVK-PROD-03B (X-1): Scope I external product destination allowlist.
//
// Owner ruling X-1: only product destinations independently verified as public, appropriate and
// consistent with their previously approved product status may stay clickable in the institutional
// release; every other product renders as plain text. StudioK stays plain text until separately
// certified, whatever its HTTP response. Inconclusive verification defaults to plain text.
//
// Audit evidence: _claude_reports/AVK_PROD_03B/evidence/x1 (2026-11-05). Like RELEASE_SCOPE this is
// a CODE CONSTANT: an env override (NEXT_PUBLIC_*_URL) can never add a destination or change the
// host of an approved one -- the resolved URL must equal the audited URL exactly.
//
// Pure module (no next/* imports) so it loads under `node --test`.
import { isInstitutionalScope, RELEASE_SCOPE, type ReleaseScope } from './scope.ts'

export type DestinationClass = 'VERIFIED_PUBLIC' | 'UNAVAILABLE' | 'UNVERIFIED' | 'REQUIRES_OWNER_REVIEW'

export interface DestinationAudit {
  id: string
  url: string
  classification: DestinationClass
  basis: string
}

// The eight destinations identified in AVK-PROD-02R X-1, as audited in AVK-PROD-03B.
export const X1_DESTINATION_AUDIT: readonly DestinationAudit[] = [
  { id: 'prometheusk', url: 'https://prometheusk.avatark.io', classification: 'VERIFIED_PUBLIC', basis: 'HTTPS 200, no redirect; public landing, optional sign-in; registry public / live' },
  { id: 'gamek', url: 'https://gamek.ai', classification: 'UNAVAILABLE', basis: 'redirects to /preview access-code wall ("private preview", noindex); not reachable by public visitors' },
  { id: 'arenak', url: 'https://arenak.ai', classification: 'VERIFIED_PUBLIC', basis: 'HTTPS 200 via www redirect; public landing, no auth wall; registry public / coming online' },
  { id: 'streamk', url: 'https://streamk.ai', classification: 'VERIFIED_PUBLIC', basis: 'HTTPS 200 via www redirect; public landing, no auth wall; registry public / in development' },
  { id: 'cinemak', url: 'https://cinemak.ai', classification: 'REQUIRES_OWNER_REVIEW', basis: 'HTTPS 200 public landing, but registry visibility internal / vision: no prior public approval' },
  { id: 'atlas', url: 'https://atlas.dt4i.ai', classification: 'REQUIRES_OWNER_REVIEW', basis: 'HTTPS 200; registry visibility internal; no prior public approval' },
  { id: 'setpointk', url: 'https://setpointk.ai', classification: 'REQUIRES_OWNER_REVIEW', basis: 'HTTPS 200 via www redirect; registry visibility internal / status internal; different legal entity named' },
  { id: 'studiok', url: 'https://studiok.dt4m.ai', classification: 'UNAVAILABLE', basis: 'DNS does not resolve; owner rule: plain text until separately certified' },
]

// Products that must render as plain text regardless of any audit result.
const ALWAYS_PLAIN_TEXT = new Set(['studiok'])

export const SCOPE_I_CLICKABLE_PRODUCT_URLS: ReadonlyMap<string, string> = new Map(
  X1_DESTINATION_AUDIT.filter((d) => d.classification === 'VERIFIED_PUBLIC' && !ALWAYS_PLAIN_TEXT.has(d.id)).map((d) => [d.id, d.url]),
)

/**
 * The href an institutional surface may render for a sibling product. Outside Scope I the
 * resolved URL passes through unchanged (Scope II keeps today's behaviour). In Scope I it is kept
 * only when the product is VERIFIED_PUBLIC and the resolved URL equals the audited URL exactly;
 * otherwise null, which every product surface already renders as plain text.
 */
export function scopeIProductHref(id: string, resolvedUrl: string | null, scope: ReleaseScope = RELEASE_SCOPE): string | null {
  if (!isInstitutionalScope(scope)) return resolvedUrl
  const approved = SCOPE_I_CLICKABLE_PRODUCT_URLS.get(id)
  return approved !== undefined && resolvedUrl === approved ? resolvedUrl : null
}
