import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leaveOrganization } from './leave.ts'

interface FakeState {
  organization_members: Record<string, unknown>[]
  platform_audit_events: Record<string, unknown>[]
}

function makeFakeAdminClient(members: Record<string, unknown>[]) {
  const state: FakeState = { organization_members: [...members], platform_audit_events: [] }

  function from(table: keyof FakeState) {
    let mode: 'select' | 'insert' | 'delete' = 'select'
    let insertPayload: Record<string, unknown> | null = null
    const eqFilters: [string, unknown][] = []

    function applyFilters(rows: Record<string, unknown>[]) {
      return rows.filter((row) => eqFilters.every(([col, val]) => row[col] === val))
    }

    function resolve() {
      const rows = state[table]
      if (mode === 'insert') {
        rows.push({ id: `generated-${rows.length + 1}`, ...insertPayload })
        return { data: null, error: null }
      }
      if (mode === 'delete') {
        const matches = applyFilters(rows)
        state[table] = rows.filter((r) => !matches.includes(r))
        return { data: matches, error: null }
      }
      return { data: applyFilters(rows), error: null }
    }

    const builder = {
      select() {
        mode = 'select'
        return builder
      },
      insert(payload: Record<string, unknown>) {
        mode = 'insert'
        insertPayload = payload
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
      maybeSingle() {
        const original = resolve
        return { then: (fn: (r: unknown) => void) => fn({ data: (original().data as Record<string, unknown>[])[0] ?? null, error: null }) }
      },
      then(onFulfilled: (result: { data: unknown; error: null }) => void) {
        onFulfilled(resolve())
      },
    }
    return builder
  }

  return { from, state }
}

test('leaveOrganization removes membership for a plain member', async () => {
  const client = makeFakeAdminClient([
    { org_id: 'org-1', user_id: 'user-1', role: 'member' },
    { org_id: 'org-1', user_id: 'user-2', role: 'owner' },
  ])
  const result = await leaveOrganization(client as never, { userId: 'user-1', organizationId: 'org-1' })
  assert.equal(result.status, 'left')
  assert.equal(client.state.organization_members.length, 1)
  assert.equal(client.state.platform_audit_events.length, 1)
})

test('leaveOrganization refuses a non-member', async () => {
  const client = makeFakeAdminClient([{ org_id: 'org-1', user_id: 'user-2', role: 'owner' }])
  const result = await leaveOrganization(client as never, { userId: 'user-1', organizationId: 'org-1' })
  assert.equal(result.status, 'not_a_member')
})

test('leaveOrganization blocks the sole owner while other members remain', async () => {
  const client = makeFakeAdminClient([
    { org_id: 'org-1', user_id: 'user-1', role: 'owner' },
    { org_id: 'org-1', user_id: 'user-2', role: 'member' },
  ])
  const result = await leaveOrganization(client as never, { userId: 'user-1', organizationId: 'org-1' })
  assert.equal(result.status, 'blocked_sole_owner')
  assert.equal(client.state.organization_members.length, 2)
})

test('leaveOrganization allows the sole owner to leave an otherwise-empty organization', async () => {
  const client = makeFakeAdminClient([{ org_id: 'org-1', user_id: 'user-1', role: 'owner' }])
  const result = await leaveOrganization(client as never, { userId: 'user-1', organizationId: 'org-1' })
  assert.equal(result.status, 'left')
})

test('leaveOrganization allows leaving when a co-owner remains', async () => {
  const client = makeFakeAdminClient([
    { org_id: 'org-1', user_id: 'user-1', role: 'owner' },
    { org_id: 'org-1', user_id: 'user-2', role: 'owner' },
  ])
  const result = await leaveOrganization(client as never, { userId: 'user-1', organizationId: 'org-1' })
  assert.equal(result.status, 'left')
})
