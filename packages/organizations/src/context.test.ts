import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ProductAccess } from '@avatark/membership'
import {
  findMembership,
  currentMembership,
  organizationProductAccess,
  switchOrganization,
  toMembershipList,
  type OrganizationContext,
} from './context.ts'
import type { Organization, OrganizationMember } from './types.ts'

const acme: Organization = { id: 'org_acme', name: 'Acme', createdAt: '2026-01-01', updatedAt: '2026-01-01' }
const beta: Organization = { id: 'org_beta', name: 'Beta Cohort', createdAt: '2026-02-01', updatedAt: '2026-02-01' }

function baseContext(): OrganizationContext {
  return {
    memberships: [
      { organization: acme, role: 'owner', source: 'organization' },
      { organization: beta, role: 'member', source: 'invitation' },
    ],
    currentOrganizationId: 'org_acme',
  }
}

test('findMembership returns the matching row or undefined', () => {
  const ctx = baseContext()
  assert.equal(findMembership(ctx, 'org_acme')?.role, 'owner')
  assert.equal(findMembership(ctx, 'org_unknown'), undefined)
})

test('currentMembership resolves from currentOrganizationId, undefined when null', () => {
  const ctx = baseContext()
  assert.equal(currentMembership(ctx)?.organization.id, 'org_acme')
  assert.equal(currentMembership({ ...ctx, currentOrganizationId: null }), undefined)
})

test('switchOrganization rejects switching to an organization the user is not a member of', () => {
  const ctx = baseContext()
  const result = switchOrganization(ctx, 'org_other')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'not_a_member')
  // original context is untouched
  assert.equal(ctx.currentOrganizationId, 'org_acme')
})

test('switchOrganization succeeds for a valid membership and does not mutate the input', () => {
  const ctx = baseContext()
  const result = switchOrganization(ctx, 'org_beta')
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.context.currentOrganizationId, 'org_beta')
  assert.equal(ctx.currentOrganizationId, 'org_acme')
})

test('organizationProductAccess composes ProductAccess with organizationId only for real memberships', () => {
  const ctx = baseContext()
  const access: Omit<ProductAccess, 'organizationId'> = {
    productId: 'prometheusk',
    deploymentStatus: 'live',
    integrationStatus: 'live',
    accessState: 'active',
    membershipPlan: 'free',
    roles: ['practitioner'],
    capabilities: ['practice'],
    source: 'organization',
  }
  const granted = organizationProductAccess(ctx, 'org_acme', access)
  assert.equal(granted?.organizationId, 'org_acme')

  const denied = organizationProductAccess(ctx, 'org_unknown', access)
  assert.equal(denied, undefined)
})

test('toMembershipList joins raw member rows against organizations, skipping unknown org ids', () => {
  const members: OrganizationMember[] = [
    { orgId: 'org_acme', userId: 'u1', role: 'owner', createdAt: '2026-01-01' },
    { orgId: 'org_missing', userId: 'u1', role: 'member', createdAt: '2026-01-01' },
  ]
  const list = toMembershipList(members, [acme, beta])
  assert.equal(list.length, 1)
  assert.equal(list[0].organization.id, 'org_acme')
  assert.equal(list[0].source, 'organization')
})
