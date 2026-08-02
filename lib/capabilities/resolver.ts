// Pure capability-resolution logic — no Supabase, no I/O (see queries.ts
// for the thin DB-backed wrapper). Kept pure and dependency-free so the
// actual authorization decision can be tested directly against fixture
// rows, the same discipline lib/organizations/adapter.test.ts and
// lib/identity/claims.test.ts already established in this repo, rather
// than requiring a mocked Supabase client for every case.
import type { CapabilityGrantRow, CapabilityResolution, CapabilityScope } from './types.ts'

function hasScopeId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.length > 0
}

// Exact-match only, by design (mission requirement): a product-scoped
// grant never authorizes any other product, an organization-scoped grant
// never authorizes any other organization. No wildcard, no inheritance,
// no "platform grant implies every product/org" shortcut exists here —
// this is also what keeps a product-scoped grant (e.g. a SetpointK
// capability) structurally incapable of leaking into an unrelated
// product's or organization's scope.
export function scopeMatches(row: CapabilityGrantRow, scope: CapabilityScope): boolean {
  if (scope.type === 'platform') return row.scopeType === 'platform'
  if (scope.type === 'product') return row.scopeType === 'product' && row.scopeId === scope.productId
  return row.scopeType === 'organization' && row.scopeId === scope.organizationId
}

export function isGrantCurrentlyActive(row: CapabilityGrantRow, now: Date): boolean {
  if (row.revokedAt !== null) return false
  if (row.expiresAt !== null && new Date(row.expiresAt).getTime() <= now.getTime()) return false
  return true
}

export interface ResolveCapabilityFromGrantsInput {
  capability: string
  scope: CapabilityScope
  now?: Date
}

// grants must already be scoped to the correct user (the caller's query
// is responsible for that — see queries.ts) — this function does not take
// or check a userId, so it stays testable with plain fixture arrays.
export function resolveCapabilityFromGrants(
  grants: CapabilityGrantRow[],
  input: ResolveCapabilityFromGrantsInput
): CapabilityResolution {
  const now = input.now ?? new Date()

  // Malformed input is denied before any row is even considered —
  // "unknown means no privileged access" applies to the request shape
  // itself, not just to the absence of a matching row.
  if (typeof input.capability !== 'string' || input.capability.trim().length === 0) {
    return { granted: false, reason: 'unknown_capability' }
  }
  if (input.scope.type === 'product' && !hasScopeId(input.scope.productId)) {
    return { granted: false, reason: 'malformed_scope' }
  }
  if (input.scope.type === 'organization' && !hasScopeId(input.scope.organizationId)) {
    return { granted: false, reason: 'malformed_scope' }
  }

  const matching = grants.filter((g) => g.capability === input.capability && scopeMatches(g, input.scope))
  if (matching.length === 0) return { granted: false, reason: 'no_grant' }

  const active = matching.find((g) => isGrantCurrentlyActive(g, now))
  if (active) return { granted: true, grant: active }

  // A matching row exists but none is currently active — report the more
  // specific of the two lifecycle-denial reasons. Revocation is checked
  // first: a grant that was both revoked and would otherwise be expired is
  // reported as revoked, since revocation is the deliberate, actionable
  // fact (expiry is passive and could recur on a re-grant).
  const revoked = matching.find((g) => g.revokedAt !== null)
  if (revoked) return { granted: false, reason: 'revoked' }
  return { granted: false, reason: 'expired' }
}
