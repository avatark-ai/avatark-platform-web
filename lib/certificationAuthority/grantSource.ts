// Server-only. The certification-invocation grant source (PLT-ADR-015 §2):
// the existing administrator-issued capability_grants table (migration
// 020) -- RLS owner-read only, no INSERT/UPDATE/DELETE policy for
// `authenticated`, so no user can grant themselves anything; every write
// goes through the platform-admin-gated service-role path
// (lib/capabilities/adminGrants.ts). Resolution reuses the existing
// resolver unmodified: exact capability, exact platform scope, active
// (not revoked, not expired) rows only.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CertificationGrantSource } from '@avatark/certification-authority'
import { resolveCapability } from '../capabilities/queries.ts'

export function createCapabilityGrantSource(supabase: SupabaseClient, now: () => Date = () => new Date()): CertificationGrantSource {
  return {
    async resolveInvocationGrant(userId, capability) {
      const resolution = await resolveCapability(supabase, { userId, capability, scope: { type: 'platform' }, now: now() })
      if (!resolution.granted) return { granted: false, reason: resolution.reason }
      const g = resolution.grant
      return {
        granted: true,
        grant: { id: g.id, capability: g.capability, scopeType: g.scopeType, scopeId: g.scopeId, grantedAt: g.grantedAt, grantedBy: g.grantedBy },
      }
    },
  }
}
