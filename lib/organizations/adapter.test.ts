import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryOrganizationsAdapter, createReadOnlyOrganizationsAdapter } from './inMemoryAdapter.ts'
import type { OrganizationsAdapter } from './adapter.ts'

const FIXTURE = {
  organizations: [
    { id: 'org-a', name: 'Org A', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'org-b', name: 'Org B', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ],
  members: [
    { orgId: 'org-a', userId: 'user-1', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' },
    { orgId: 'org-b', userId: 'user-2', role: 'member', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
}

// A tiny "consumer" -- the same shape any real caller (an admin page, a
// future member-facing surface) would be -- written entirely against the
// OrganizationsAdapter interface, never against a concrete implementation.
// Run against two differently-configured adapters below to prove the
// contract is genuinely substitutable, not just type-compatible.
async function describeUserOrganizations(adapter: OrganizationsAdapter, userId: string): Promise<string[]> {
  const result = await adapter.listForUser(userId)
  if (result.status !== 'ready') return []
  return result.data.map((org) => org.name)
}

test('consumer function behaves identically against two conformant adapter implementations', async () => {
  const mutable = createInMemoryOrganizationsAdapter(FIXTURE)
  const readOnly = createReadOnlyOrganizationsAdapter(FIXTURE)

  assert.deepEqual(await describeUserOrganizations(mutable, 'user-1'), ['Org A'])
  assert.deepEqual(await describeUserOrganizations(readOnly, 'user-1'), ['Org A'])
  assert.deepEqual(await describeUserOrganizations(mutable, 'user-2'), ['Org B'])
  assert.deepEqual(await describeUserOrganizations(readOnly, 'user-2'), ['Org B'])
})

test('privacy boundary: a user never sees an organization they are not a member of', async () => {
  const adapter = createInMemoryOrganizationsAdapter(FIXTURE)
  const result = await adapter.listForUser('user-2')
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') {
    assert.ok(!result.data.some((org) => org.id === 'org-a'), 'user-2 must not see org-a')
  }
})

test('a user with no memberships gets an empty ready result, not an error', async () => {
  const adapter = createInMemoryOrganizationsAdapter(FIXTURE)
  const result = await adapter.listForUser('user-nobody')
  assert.deepEqual(result, { status: 'ready', data: [] })
})

test('get() reports a typed error for an unknown org id, not a throw', async () => {
  const adapter = createInMemoryOrganizationsAdapter(FIXTURE)
  const result = await adapter.get('org-does-not-exist')
  assert.equal(result.status, 'error')
})

test('optional mutation operations may be omitted entirely, per the contract', async () => {
  const readOnly = createReadOnlyOrganizationsAdapter(FIXTURE)
  assert.equal(readOnly.create, undefined)
  assert.equal(readOnly.addMember, undefined)
  assert.equal(readOnly.removeMember, undefined)

  const mutable = createInMemoryOrganizationsAdapter(FIXTURE)
  assert.equal(typeof mutable.create, 'function')
  assert.equal(mutable.removeMember, undefined, 'this reference implementation deliberately leaves removeMember unimplemented')
})

test('create() on a mutable adapter is reflected in subsequent listMembers/get calls', async () => {
  const adapter = createInMemoryOrganizationsAdapter({ organizations: [], members: [] })
  const created = await adapter.create!('New Org')
  assert.equal(created.status, 'ready')
  if (created.status !== 'ready') return

  const fetched = await adapter.get(created.data.id)
  assert.deepEqual(fetched, { status: 'ready', data: created.data })
})
