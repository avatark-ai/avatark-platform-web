import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listActiveCapabilityGrants, resolveCapability } from './queries.ts'

const NOW = new Date('2026-08-02T12:00:00.000Z')

// Same minimal fake of the Supabase query-builder chain used by
// lib/identity/claims.test.ts — thenable like the real PostgrestFilterBuilder,
// with an opt-in failure mode (`shouldError`) so the adapter-error path can
// be exercised without a real network/database failure.
function makeFakeClient(rows: Record<string, unknown>[], options: { shouldError?: boolean; shouldThrow?: boolean } = {}) {
  return {
    from(_table: string) {
      const filters: Record<string, unknown> = {}
      const isNullFilters: string[] = []
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          filters[column] = value
          return builder
        },
        is(column: string, _value: null) {
          isNullFilters.push(column)
          return builder
        },
        then(onFulfilled: (result: { data: Record<string, unknown>[] | null; error: { message: string } | null }) => void) {
          if (options.shouldThrow) throw new Error('network unreachable')
          if (options.shouldError) {
            onFulfilled({ data: null, error: { message: 'relation "capability_grants" does not exist' } })
            return
          }
          const matches = rows.filter(
            (row) =>
              Object.entries(filters).every(([column, value]) => row[column] === value) &&
              isNullFilters.every((column) => row[column] === null)
          )
          onFulfilled({ data: matches, error: null })
        },
      }
      return builder
    },
  }
}

const ACTIVE_ROW = {
  id: 'grant-1',
  user_id: 'user-1',
  capability: 'gamek.world.play',
  scope_type: 'product',
  scope_id: 'gamek',
  granted_at: '2026-01-01T00:00:00.000Z',
  granted_by: 'admin-1',
  expires_at: null,
  revoked_at: null,
}

test('resolveCapability grants when a matching active row exists', async () => {
  const client = makeFakeClient([ACTIVE_ROW])
  const result = await resolveCapability(client as never, {
    userId: 'user-1',
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.equal(result.granted, true)
})

test('resolveCapability denies with no_grant when the table has no matching row', async () => {
  const client = makeFakeClient([])
  const result = await resolveCapability(client as never, {
    userId: 'user-1',
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'no_grant' })
})

test('resolveCapability defaults to deny with adapter_error when the query errors (e.g. table not migrated yet)', async () => {
  const client = makeFakeClient([], { shouldError: true })
  const result = await resolveCapability(client as never, {
    userId: 'user-1',
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'adapter_error' })
})

test('resolveCapability defaults to deny with adapter_error when the client throws', async () => {
  const client = makeFakeClient([], { shouldThrow: true })
  const result = await resolveCapability(client as never, {
    userId: 'user-1',
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'adapter_error' })
})

test('resolveCapability denies with no_grant for a missing userId, never queries as "everyone"', async () => {
  const client = makeFakeClient([ACTIVE_ROW])
  const result = await resolveCapability(client as never, {
    userId: '',
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'no_grant' })
})

test('listActiveCapabilityGrants returns only non-revoked rows, mapped to camelCase', async () => {
  const client = makeFakeClient([ACTIVE_ROW])
  const rows = await listActiveCapabilityGrants(client as never, 'user-1', NOW)
  assert.deepEqual(rows, [
    {
      id: 'grant-1',
      userId: 'user-1',
      capability: 'gamek.world.play',
      scopeType: 'product',
      scopeId: 'gamek',
      grantedAt: '2026-01-01T00:00:00.000Z',
      grantedBy: 'admin-1',
      expiresAt: null,
      revokedAt: null,
    },
  ])
})

test('listActiveCapabilityGrants excludes a row that has already expired', async () => {
  const client = makeFakeClient([{ ...ACTIVE_ROW, expires_at: '2026-01-01T00:00:00.000Z' }])
  const rows = await listActiveCapabilityGrants(client as never, 'user-1', NOW)
  assert.deepEqual(rows, [])
})

test('listActiveCapabilityGrants returns an empty array (not a throw) when the query errors', async () => {
  const client = makeFakeClient([], { shouldError: true })
  const rows = await listActiveCapabilityGrants(client as never, 'user-1', NOW)
  assert.deepEqual(rows, [])
})

test('listActiveCapabilityGrants returns an empty array when the client throws', async () => {
  const client = makeFakeClient([], { shouldThrow: true })
  const rows = await listActiveCapabilityGrants(client as never, 'user-1', NOW)
  assert.deepEqual(rows, [])
})
