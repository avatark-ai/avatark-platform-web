import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCapabilityGrant, listGrantsForUser, revokeCapabilityGrant } from './adminGrants.ts'

// A minimal in-memory fake of the Supabase service-role client surface
// this module actually calls (select/insert/update/eq/is/order/single/
// maybeSingle, thenable like the real PostgrestFilterBuilder) -- same
// discipline as lib/identity/claims.test.ts's fake client, extended to
// cover writes and a simulated DB-level failure so the audit-on-failure
// path is exercisable without a real database.
interface FakeState {
  capability_grants: Record<string, unknown>[]
  organizations: Record<string, unknown>[]
  platform_audit_events: Record<string, unknown>[]
}

function makeFakeAdminClient(seed: { capabilityGrants?: Record<string, unknown>[]; organizations?: Record<string, unknown>[]; failInsertFor?: Set<string> } = {}) {
  const state: FakeState = {
    capability_grants: seed.capabilityGrants ? [...seed.capabilityGrants] : [],
    organizations: seed.organizations ? [...seed.organizations] : [],
    platform_audit_events: [],
  }
  const failInsertFor = seed.failInsertFor ?? new Set<string>()
  let nextId = 1

  function from(table: keyof FakeState) {
    let mode: 'select' | 'insert' | 'update' = 'select'
    let insertPayload: Record<string, unknown> | null = null
    let updatePayload: Record<string, unknown> | null = null
    const eqFilters: [string, unknown][] = []
    let isNullColumn: string | null = null
    let wantSingle: 'single' | 'maybeSingle' | null = null

    function applyFilters(rows: Record<string, unknown>[]) {
      return rows.filter(
        (row) => eqFilters.every(([col, val]) => row[col] === val) && (isNullColumn === null || row[isNullColumn] === null)
      )
    }

    function resolve(): { data: unknown; error: { message: string } | null } {
      const rows = state[table]
      if (mode === 'insert') {
        if (failInsertFor.has(table)) return { data: null, error: { message: `simulated insert failure on ${table}` } }
        const newRow = { id: `generated-${nextId++}`, revoked_at: null, expires_at: null, granted_by: null, ...insertPayload }
        rows.push(newRow)
        return { data: wantSingle ? newRow : [newRow], error: null }
      }
      if (mode === 'update') {
        const matches = applyFilters(rows)
        matches.forEach((row) => Object.assign(row, updatePayload))
        return { data: wantSingle === 'maybeSingle' ? matches[0] ?? null : matches, error: null }
      }
      const matches = applyFilters(rows)
      return { data: wantSingle ? matches[0] ?? null : matches, error: null }
    }

    const builder = {
      select() {
        return builder
      },
      insert(payload: Record<string, unknown>) {
        mode = 'insert'
        insertPayload = payload
        return builder
      },
      update(payload: Record<string, unknown>) {
        mode = 'update'
        updatePayload = payload
        return builder
      },
      eq(column: string, value: unknown) {
        eqFilters.push([column, value])
        return builder
      },
      is(column: string, _value: null) {
        isNullColumn = column
        return builder
      },
      order() {
        return builder
      },
      single() {
        wantSingle = 'single'
        return builder
      },
      maybeSingle() {
        wantSingle = 'maybeSingle'
        return builder
      },
      then(onFulfilled: (result: { data: unknown; error: { message: string } | null }) => void) {
        onFulfilled(resolve())
      },
    }
    return builder
  }

  return { from, state }
}

const EXISTING_ORG = { id: '11111111-1111-1111-1111-111111111111', name: 'Org One' }

test('createCapabilityGrant accepts a platform-scope grant with no scopeId', async () => {
  const client = makeFakeAdminClient()
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'platform.capability.manage',
    scopeType: 'platform',
  })
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') {
    assert.equal(result.data.scopeId, null)
    assert.equal(result.data.grantedBy, 'admin-1')
  }
})

test('createCapabilityGrant rejects a platform-scope grant that supplies a scopeId', async () => {
  const client = makeFakeAdminClient()
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'platform.capability.manage',
    scopeType: 'platform',
    scopeId: 'unexpected',
  })
  assert.equal(result.status, 'error')
})

test('createCapabilityGrant accepts a product-scope grant for a canonical product id', async () => {
  const client = makeFakeAdminClient()
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'gamek.world.play',
    scopeType: 'product',
    scopeId: 'gamek',
  })
  assert.equal(result.status, 'ready')
})

test('createCapabilityGrant rejects a product-scope grant for a non-canonical product id', async () => {
  const client = makeFakeAdminClient()
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'x.y',
    scopeType: 'product',
    scopeId: 'not-a-real-product',
  })
  assert.equal(result.status, 'error')
})

test('createCapabilityGrant rejects a product-scope grant with no scopeId', async () => {
  const client = makeFakeAdminClient()
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'x.y',
    scopeType: 'product',
  })
  assert.equal(result.status, 'error')
})

test('createCapabilityGrant accepts an organization-scope grant for an existing organization', async () => {
  const client = makeFakeAdminClient({ organizations: [EXISTING_ORG] })
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'org.billing.manage',
    scopeType: 'organization',
    scopeId: EXISTING_ORG.id,
  })
  assert.equal(result.status, 'ready')
})

test('createCapabilityGrant rejects an organization-scope grant for a non-uuid scopeId', async () => {
  const client = makeFakeAdminClient({ organizations: [EXISTING_ORG] })
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'org.billing.manage',
    scopeType: 'organization',
    scopeId: 'not-a-uuid',
  })
  assert.equal(result.status, 'error')
})

test('createCapabilityGrant rejects an organization-scope grant for a well-formed but nonexistent organization', async () => {
  const client = makeFakeAdminClient({ organizations: [EXISTING_ORG] })
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'org.billing.manage',
    scopeType: 'organization',
    scopeId: '22222222-2222-2222-2222-222222222222',
  })
  assert.equal(result.status, 'error')
})

test('createCapabilityGrant rejects an invalid scopeType', async () => {
  const client = makeFakeAdminClient()
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'x.y',
    // @ts-expect-error deliberately invalid for the test
    scopeType: 'wildcard',
  })
  assert.equal(result.status, 'error')
})

test('createCapabilityGrant records a success audit event', async () => {
  const client = makeFakeAdminClient()
  await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'platform.capability.manage',
    scopeType: 'platform',
  })
  const events = client.state.platform_audit_events
  assert.equal(events.length, 1)
  assert.equal(events[0].action, 'capability.grant')
  assert.equal(events[0].result, 'success')
})

test('createCapabilityGrant records a failure audit event when the insert itself fails', async () => {
  const client = makeFakeAdminClient({ failInsertFor: new Set(['capability_grants']) })
  const result = await createCapabilityGrant(client as never, 'admin-1', {
    userId: 'user-1',
    capability: 'platform.capability.manage',
    scopeType: 'platform',
  })
  assert.equal(result.status, 'error')
  const events = client.state.platform_audit_events
  assert.equal(events.length, 1)
  assert.equal(events[0].result, 'failure')
})

test('listGrantsForUser returns every grant for a user, most recent first per the query', async () => {
  const client = makeFakeAdminClient({
    capabilityGrants: [
      { id: 'g1', user_id: 'user-1', capability: 'a', scope_type: 'platform', scope_id: null, granted_at: '2026-01-01', granted_by: null, expires_at: null, revoked_at: null },
      { id: 'g2', user_id: 'user-2', capability: 'b', scope_type: 'platform', scope_id: null, granted_at: '2026-01-01', granted_by: null, expires_at: null, revoked_at: null },
    ],
  })
  const result = await listGrantsForUser(client as never, 'user-1')
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') {
    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].id, 'g1')
  }
})

test('listGrantsForUser rejects an empty userId', async () => {
  const client = makeFakeAdminClient()
  const result = await listGrantsForUser(client as never, '')
  assert.equal(result.status, 'error')
})

test('revokeCapabilityGrant sets revoked_at on an active grant and audits it', async () => {
  const client = makeFakeAdminClient({
    capabilityGrants: [
      { id: 'g1', user_id: 'user-1', capability: 'a', scope_type: 'platform', scope_id: null, granted_at: '2026-01-01', granted_by: null, expires_at: null, revoked_at: null },
    ],
  })
  const result = await revokeCapabilityGrant(client as never, 'admin-1', 'g1')
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') assert.ok(result.data.revokedAt !== null)

  const events = client.state.platform_audit_events
  assert.equal(events.length, 1)
  assert.equal(events[0].action, 'capability.revoke')
  assert.equal(events[0].result, 'success')
})

test('revokeCapabilityGrant on an already-revoked grant errors rather than silently succeeding again', async () => {
  const client = makeFakeAdminClient({
    capabilityGrants: [
      { id: 'g1', user_id: 'user-1', capability: 'a', scope_type: 'platform', scope_id: null, granted_at: '2026-01-01', granted_by: null, expires_at: null, revoked_at: '2026-02-01T00:00:00.000Z' },
    ],
  })
  const result = await revokeCapabilityGrant(client as never, 'admin-1', 'g1')
  assert.equal(result.status, 'error')
})

test('revokeCapabilityGrant rejects an empty grantId before touching the database', async () => {
  const client = makeFakeAdminClient()
  const result = await revokeCapabilityGrant(client as never, 'admin-1', '')
  assert.equal(result.status, 'error')
  assert.equal(client.state.platform_audit_events.length, 0)
})
