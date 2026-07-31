// Reference in-memory implementation of OrganizationsAdapter -- exists to
// prove the contract is genuinely implementable by something other than
// the real Supabase-backed admin routes, and to give
// lib/organizations/adapter.test.ts a way to prove a consumer function
// works identically against two differently-configured instances (real
// substitutability, not just "the type checks").
import type { Organization, OrganizationMember } from "@avatark/organizations"
import type { OrganizationsAdapter } from "./adapter.ts"

export interface InMemoryOrgFixture {
  organizations: Organization[]
  members: OrganizationMember[]
}

export function createInMemoryOrganizationsAdapter(fixture: InMemoryOrgFixture): OrganizationsAdapter {
  const organizations = [...fixture.organizations]
  const members = [...fixture.members]

  function memberOrgIds(userId: string): Set<string> {
    return new Set(members.filter((m) => m.userId === userId).map((m) => m.orgId))
  }

  return {
    async listForUser(userId) {
      // Privacy boundary, enforced in application code since there is no
      // RLS layer here: only organizations the caller actually belongs to.
      const ids = memberOrgIds(userId)
      return { status: "ready", data: organizations.filter((o) => ids.has(o.id)) }
    },

    async get(orgId) {
      const org = organizations.find((o) => o.id === orgId)
      if (!org) return { status: "error", message: `no organization with id ${orgId}` }
      return { status: "ready", data: org }
    },

    async listMembers(orgId) {
      return { status: "ready", data: members.filter((m) => m.orgId === orgId) }
    },

    async create(name) {
      const org: Organization = {
        id: `org-${organizations.length + 1}`,
        name,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      }
      organizations.push(org)
      return { status: "ready", data: org }
    },

    async addMember(orgId, userId, role) {
      const member: OrganizationMember = { orgId, userId, role, createdAt: new Date(0).toISOString() }
      members.push(member)
      return { status: "ready", data: member }
    },

    // Deliberately omits removeMember -- proves an adapter may leave an
    // optional operation unimplemented (`undefined`, not a thrown error)
    // per the contract's own documented allowance.
  }
}

// A second, read-only variant of the same contract -- no create/addMember
// at all, and every operation reports "not_supported" rather than acting.
// Exists specifically so the conformance test can prove a consumer
// function handles a genuinely different-shaped-but-conformant adapter,
// not just a second copy of the same one with different data.
export function createReadOnlyOrganizationsAdapter(fixture: InMemoryOrgFixture): OrganizationsAdapter {
  const base = createInMemoryOrganizationsAdapter(fixture)
  return {
    listForUser: base.listForUser,
    get: base.get,
    listMembers: base.listMembers,
    // No create/addMember/removeMember at all.
  }
}
