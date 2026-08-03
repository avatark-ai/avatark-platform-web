import { test } from 'node:test'
import assert from 'node:assert/strict'
import { grantPlatformRole, revokePlatformRole, grantProductAccess, revokeProductAccess } from './platformAccess.ts'

// A minimal in-memory fake of the Supabase service-role client surface
// this module actually calls (select/insert/upsert/update/delete/eq/
// single/maybeSingle, thenable like the real PostgrestFilterBuilder) --
// same discipline as lib/capabilities/adminGrants.test.ts's fake client,
// extended with upsert/delete and per-table primary-key duplicate
// detection (to simulate a real 23505 unique-violation on platform_roles'
// composite PK without a real database).
interface FakeState {
  platform_roles: Record<string, unknown>[]
  product_access: Record<string, unknown>[]
  platform_audit_events: Record<string, unknown>[]
}

const PK: Record<string, string[]> = {
  platform_roles: ['user_id', 'role'],
  product_access: ['user_id', 'product_id'],
}

function makeFakeAdminClient(
  seed: { platformRoles?: Record<string, unknown>[]; productAccess?: Record<string, unknown>[]; failFor?: Set<string> } = {}
) {
  const state: FakeState = {
    platform_roles: seed.platformRoles ? [...seed.platformRoles] : [],
    product_access: seed.productAccess ? [...seed.productAccess] : [],
    platform_audit_events: [],
  }
  const failFor = seed.failFor ?? new Set<string>()

  function matchesPK(row: Record<string, unknown>, payload: Record<string, unknown>, pkCols: string[]) {
    return pkCols.every((c) => row[c] === payload[c])
  }

  function from(table: keyof FakeState) {
    let mode: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select'
    let payload: Record<string, unknown> | null = null
    const eqFilters: [string, unknown][] = []
    let wantSingle: 'single' | 'maybeSingle' | null = null

    function applyFilters(rows: Record<string, unknown>[]) {
      return rows.filter((row) => eqFilters.every(([col, val]) => row[col] === val))
    }

    function resolve(): { data: unknown; error: { message: string; code?: string } | null } {
      const rows = state[table]
      const pkCols = PK[table] ?? []

      if (mode === 'insert') {
        if (failFor.has(table)) return { data: null, error: { message: `simulated insert failure on ${table}` } }
        const dup = pkCols.length > 0 && payload && rows.find((r) => matchesPK(r, payload!, pkCols))
        if (dup) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } }
        const newRow = { granted_by: null, granted_at: new Date().toISOString(), ...payload }
        rows.push(newRow)
        return { data: wantSingle ? newRow : [newRow], error: null }
      }
      if (mode === 'upsert') {
        if (failFor.has(table)) return { data: null, error: { message: `simulated upsert failure on ${table}` } }
        const existing = pkCols.length > 0 && payload ? rows.find((r) => matchesPK(r, payload!, pkCols)) : undefined
        if (existing) {
          Object.assign(existing, payload)
          return { data: wantSingle ? existing : [existing], error: null }
        }
        const newRow = { ...payload }
        rows.push(newRow)
        return { data: wantSingle ? newRow : [newRow], error: null }
      }
      if (mode === 'update') {
        if (failFor.has(table)) return { data: null, error: { message: `simulated update failure on ${table}` } }
        const matches = applyFilters(rows)
        matches.forEach((row) => Object.assign(row, payload))
        return { data: wantSingle === 'maybeSingle' ? matches[0] ?? null : matches, error: null }
      }
      if (mode === 'delete') {
        if (failFor.has(table)) return { data: null, error: { message: `simulated delete failure on ${table}` } }
        const matches = applyFilters(rows)
        matches.forEach((row) => {
          const idx = rows.indexOf(row)
          if (idx !== -1) rows.splice(idx, 1)
        })
        return { data: wantSingle === 'maybeSingle' ? matches[0] ?? null : matches, error: null }
      }
      const matches = applyFilters(rows)
      return { data: wantSingle ? matches[0] ?? null : matches, error: null }
    }

    const builder = {
      select() {
        return builder
      },
      insert(p: Record<string, unknown>) {
        mode = 'insert'
        payload = p
        return builder
      },
      upsert(p: Record<string, unknown>) {
        mode = 'upsert'
        payload = p
        return builder
      },
      update(p: Record<string, unknown>) {
        mode = 'update'
        payload = p
        return builder
      },
      delete() {
        mode = 'delete'
        return builder
      },
      eq(column: string, value: unknown) {
        eqFilters.push([column, value])
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
      then(onFulfilled: (result: { data: unknown; error: { message: string; code?: string } | null }) => void) {
        onFulfilled(resolve())
      },
    }
    return builder
  }

  return { from, state }
}

// ── grantPlatformRole ──────────────────────────────────────────
test('grantPlatformRole inserts a new role grant', async () => {
  const client = makeFakeAdminClient()
  const result = await grantPlatformRole(client as never, 'admin-1', 'user-1', 'admin')
  assert.equal(result.status, 'ready')
  assert.equal(client.state.platform_roles.length, 1)
  assert.equal(client.state.platform_audit_events[0].action, 'platform_role.grant')
  assert.equal(client.state.platform_audit_events[0].result, 'success')
})

test('grantPlatformRole is idempotent-success when the exact grant already exists', async () => {
  const client = makeFakeAdminClient({ platformRoles: [{ user_id: 'user-1', role: 'admin', granted_by: null, granted_at: '2026-01-01' }] })
  const result = await grantPlatformRole(client as never, 'admin-1', 'user-1', 'admin')
  assert.equal(result.status, 'ready')
  assert.equal(client.state.platform_roles.length, 1)
})

test('grantPlatformRole rejects an empty role or userId before touching the database', async () => {
  const client = makeFakeAdminClient()
  assert.equal((await grantPlatformRole(client as never, 'admin-1', 'user-1', '')).status, 'error')
  assert.equal((await grantPlatformRole(client as never, 'admin-1', '', 'admin')).status, 'error')
  assert.equal(client.state.platform_audit_events.length, 0)
})

test('grantPlatformRole records a failure audit event when the insert itself fails', async () => {
  const client = makeFakeAdminClient({ failFor: new Set(['platform_roles']) })
  const result = await grantPlatformRole(client as never, 'admin-1', 'user-1', 'admin')
  assert.equal(result.status, 'error')
  assert.equal(client.state.platform_audit_events[0].result, 'failure')
})

// ── revokePlatformRole ─────────────────────────────────────────
test('revokePlatformRole deletes an existing role grant and audits it', async () => {
  const client = makeFakeAdminClient({ platformRoles: [{ user_id: 'user-1', role: 'admin', granted_by: null, granted_at: '2026-01-01' }] })
  const result = await revokePlatformRole(client as never, 'admin-2', 'user-1', 'admin')
  assert.equal(result.status, 'ready')
  assert.equal(client.state.platform_roles.length, 0)
  assert.equal(client.state.platform_audit_events[0].action, 'platform_role.revoke')
})

test('revokePlatformRole errors, not silently succeeds, when no such grant exists', async () => {
  const client = makeFakeAdminClient()
  const result = await revokePlatformRole(client as never, 'admin-2', 'user-1', 'admin')
  assert.equal(result.status, 'error')
})

test('revokePlatformRole blocks an admin from revoking their own admin role, without touching the database', async () => {
  const client = makeFakeAdminClient({ platformRoles: [{ user_id: 'admin-1', role: 'admin', granted_by: null, granted_at: '2026-01-01' }] })
  const result = await revokePlatformRole(client as never, 'admin-1', 'admin-1', 'admin')
  assert.equal(result.status, 'error')
  assert.equal(client.state.platform_roles.length, 1)
  assert.equal(client.state.platform_audit_events.length, 0)
})

test('revokePlatformRole allows revoking a non-admin role for oneself (the guard is admin-role-specific)', async () => {
  const client = makeFakeAdminClient({ platformRoles: [{ user_id: 'user-1', role: 'beta_tester', granted_by: null, granted_at: '2026-01-01' }] })
  const result = await revokePlatformRole(client as never, 'user-1', 'user-1', 'beta_tester')
  assert.equal(result.status, 'ready')
})

// ── grantProductAccess ─────────────────────────────────────────
test('grantProductAccess upserts an active grant for a canonical product id', async () => {
  const client = makeFakeAdminClient()
  const result = await grantProductAccess(client as never, 'admin-1', 'user-1', 'gamek')
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') assert.equal(result.data.status, 'active')
  assert.equal(client.state.product_access.length, 1)
})

test('grantProductAccess re-activates a previously revoked grant instead of duplicating the row', async () => {
  const client = makeFakeAdminClient({ productAccess: [{ user_id: 'user-1', product_id: 'gamek', status: 'revoked', granted_by: null, granted_at: '2026-01-01' }] })
  const result = await grantProductAccess(client as never, 'admin-1', 'user-1', 'gamek')
  assert.equal(result.status, 'ready')
  assert.equal(client.state.product_access.length, 1)
  assert.equal(client.state.product_access[0].status, 'active')
})

test('grantProductAccess rejects a non-canonical product id before touching the database', async () => {
  const client = makeFakeAdminClient()
  const result = await grantProductAccess(client as never, 'admin-1', 'user-1', 'not-a-real-product')
  assert.equal(result.status, 'error')
  assert.equal(client.state.product_access.length, 0)
  assert.equal(client.state.platform_audit_events.length, 0)
})

// ── revokeProductAccess ────────────────────────────────────────
test('revokeProductAccess sets status to revoked on an existing grant', async () => {
  const client = makeFakeAdminClient({ productAccess: [{ user_id: 'user-1', product_id: 'gamek', status: 'active', granted_by: null, granted_at: '2026-01-01' }] })
  const result = await revokeProductAccess(client as never, 'admin-1', 'user-1', 'gamek')
  assert.equal(result.status, 'ready')
  assert.equal(client.state.product_access[0].status, 'revoked')
  assert.equal(client.state.platform_audit_events[0].action, 'product_access.revoke')
})

test('revokeProductAccess errors when no grant exists for that user/product pair', async () => {
  const client = makeFakeAdminClient()
  const result = await revokeProductAccess(client as never, 'admin-1', 'user-1', 'gamek')
  assert.equal(result.status, 'error')
})
