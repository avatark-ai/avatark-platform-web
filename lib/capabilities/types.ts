// Capability Grants — shared vocabulary (migration 020_capability_grants.sql).
//
// Distinct from three existing, deliberately-unrelated concepts already in
// this repo (see docs/AVATARK_PLATFORM_TEST_MIGRATION_020_RUNBOOK.md's
// audit section for the full comparison):
//   - platform_roles (011): a global, coarse role ('admin') — still the
//     sole thing that authorizes Platform Admin access (lib/admin/authz.ts).
//   - product_access (012): "may this user enter the product at all" —
//     unaffected by capability grants, never collapsed into them (mission
//     Part 9).
//   - @avatark/membership's resolveCapability(access, capability): a pure,
//     already-frozen contract function that answers "is `capability` in
//     access.capabilities" — this module is one honest way to populate
//     that capabilities array from real rows, not a replacement for it.
export type CapabilityScopeType = 'platform' | 'product' | 'organization'

// The three scopes this pass supports, per the mission's explicit
// "unless existing code proves another real need" constraint — no fourth
// scope, no wildcard scope, exists anywhere in this repo today.
export type CapabilityScope =
  | { type: 'platform' }
  | { type: 'product'; productId: string }
  | { type: 'organization'; organizationId: string }

// Application-shape mirror of the capability_grants table (camelCase,
// decoupled from the DB row's snake_case — see queries.ts for the mapping).
export interface CapabilityGrantRow {
  id: string
  userId: string
  capability: string
  scopeType: CapabilityScopeType
  scopeId: string | null
  grantedAt: string
  grantedBy: string | null
  expiresAt: string | null
  revokedAt: string | null
}

// Every reason resolveCapability can deny for — no bare `false`/`boolean`
// return anywhere in this module, so a denial's cause is always inspectable
// (by a test, or by a diagnostics surface) instead of collapsing every
// "no" into one undifferentiated case.
export type CapabilityDenialReason =
  | 'no_grant'
  | 'revoked'
  | 'expired'
  | 'malformed_scope'
  | 'unknown_capability'
  | 'adapter_error'

export type CapabilityResolution =
  | { granted: true; grant: CapabilityGrantRow }
  | { granted: false; reason: CapabilityDenialReason }
