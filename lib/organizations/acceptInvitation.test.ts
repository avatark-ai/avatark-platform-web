import { test } from 'node:test'
import assert from 'node:assert/strict'
import { acceptOrganizationInvitation, declineOrganizationInvitation, listPendingInvitationsForEmail } from './acceptInvitation.ts'

// In-memory fake covering exactly what this module calls: select/insert/
// update with eq/is/gt/in/order/single/maybeSingle on organization_invitations/
// organizations/organization_members/platform_audit_events, plus
// auth.admin.getUserById for inviter lookups -- same discipline as
// lib/capabilities/adminGrants.test.ts's fake, extended for the extra
// filter methods and the auth admin surface this module needs.
interface FakeState {
  organization_invitations: Record<string, unknown>[]
  organizations: Record<string, unknown>[]
  organization_members: Record<string, unknown>[]
  platform_audit_events: Record<string, unknown>[]
  users: Record<string, { email: string }>
}

function makeFakeAdminClient(seed: Partial<FakeState> = {}) {
  const state: FakeState = {
    organization_invitations: seed.organization_invitations ? [...seed.organization_invitations] : [],
    organizations: seed.organizations ? [...seed.organizations] : [],
    organization_members: seed.organization_members ? [...seed.organization_members] : [],
    platform_audit_events: [],
    users: seed.users ?? {},
  }

  function from(table: keyof Omit<FakeState, 'users'>) {
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let insertPayload: Record<string, unknown> | null = null
    let updatePayload: Record<string, unknown> | null = null
    const eqFilters: [string, unknown][] = []
    const gtFilters: [string, unknown][] = []
    const inFilters: [string, unknown[]][] = []
    const isNullColumns: string[] = []
    let wantSingle: 'single' | 'maybeSingle' | null = null

    function applyFilters(rows: Record<string, unknown>[]) {
      return rows.filter(
        (row) =>
          eqFilters.every(([col, val]) => row[col] === val) &&
          gtFilters.every(([col, val]) => (row[col] as string) > (val as string)) &&
          inFilters.every(([col, vals]) => vals.includes(row[col])) &&
          isNullColumns.every((col) => row[col] === null)
      )
    }

    function resolve(): { data: unknown; error: { message: string; code?: string } | null } {
      const rows = state[table]
      if (mode === 'insert') {
        const pkConflict =
          table === 'organization_members' &&
          rows.some((r) => r.org_id === insertPayload!.org_id && r.user_id === insertPayload!.user_id)
        if (pkConflict) return { data: null, error: { message: 'duplicate key', code: '23505' } }
        const newRow = { id: `generated-${rows.length + 1}`, ...insertPayload }
        rows.push(newRow)
        return { data: wantSingle ? newRow : [newRow], error: null }
      }
      if (mode === 'update') {
        const matches = applyFilters(rows)
        matches.forEach((row) => Object.assign(row, updatePayload))
        return { data: wantSingle === 'maybeSingle' ? matches[0] ?? null : matches, error: null }
      }
      if (mode === 'delete') {
        const matches = applyFilters(rows)
        state[table] = rows.filter((r) => !matches.includes(r))
        return { data: matches, error: null }
      }
      const matches = applyFilters(rows)
      return { data: wantSingle ? matches[0] ?? null : matches, error: null }
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
      update(payload: Record<string, unknown>) {
        mode = 'update'
        updatePayload = payload
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
      gt(column: string, value: unknown) {
        gtFilters.push([column, value])
        return builder
      },
      in(column: string, values: unknown[]) {
        inFilters.push([column, values])
        return builder
      },
      is(column: string, _value: null) {
        isNullColumns.push(column)
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
      then(onFulfilled: (result: { data: unknown; error: { message: string; code?: string } | null }) => void) {
        onFulfilled(resolve())
      },
    }
    return builder
  }

  return {
    from,
    auth: {
      admin: {
        async getUserById(id: string) {
          const user = state.users[id]
          return { data: { user: user ? { email: user.email } : null }, error: null }
        },
      },
    },
    state,
  }
}

const ORG = { id: 'org-1', name: 'Test Org' }
const NOW = new Date()
const FUTURE = new Date(NOW.getTime() + 1000 * 60 * 60 * 24).toISOString()
const PAST = new Date(NOW.getTime() - 1000 * 60 * 60 * 24).toISOString()

function pendingInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    org_id: ORG.id,
    email: 'invitee@example.com',
    role: 'member',
    token: 'token-1',
    invited_by: 'inviter-1',
    created_at: NOW.toISOString(),
    expires_at: FUTURE,
    accepted_at: null,
    accepted_by: null,
    revoked_at: null,
    ...overrides,
  }
}

test('acceptOrganizationInvitation accepts a valid, matching, pending invitation and creates membership', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation()], organizations: [ORG] })
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'accepted')
  assert.equal(client.state.organization_members.length, 1)
  assert.equal(client.state.organization_members[0].role, 'member')
  assert.equal(client.state.organization_invitations[0].accepted_by, 'user-1')
  assert.equal(client.state.platform_audit_events.length, 1)
  assert.equal(client.state.platform_audit_events[0].action, 'organization_invitation.accept')
})

test('acceptOrganizationInvitation denies an expired invitation', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation({ expires_at: PAST })], organizations: [ORG] })
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'expired')
  assert.equal(client.state.organization_members.length, 0)
})

test('acceptOrganizationInvitation denies a revoked invitation', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation({ revoked_at: NOW.toISOString() })], organizations: [ORG] })
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'revoked')
  assert.equal(client.state.organization_members.length, 0)
})

test('acceptOrganizationInvitation denies a non-matching email', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation()], organizations: [ORG] })
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'someone-else@example.com' })
  assert.equal(result.status, 'email_mismatch')
  assert.equal(client.state.organization_members.length, 0)
})

test('acceptOrganizationInvitation returns not_found for an unknown token', async () => {
  const client = makeFakeAdminClient({ organizations: [ORG] })
  const result = await acceptOrganizationInvitation(client as never, { token: 'no-such-token', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'not_found')
})

test('acceptOrganizationInvitation is idempotent for a repeat acceptance by the same user', async () => {
  const client = makeFakeAdminClient({
    organization_invitations: [pendingInvitation({ accepted_at: NOW.toISOString(), accepted_by: 'user-1' })],
    organization_members: [{ org_id: ORG.id, user_id: 'user-1', role: 'member' }],
    organizations: [ORG],
  })
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'accepted')
  assert.equal(client.state.organization_members.length, 1) // not duplicated
  assert.equal(client.state.platform_audit_events.length, 0) // no re-audit on idempotent replay
})

test('acceptOrganizationInvitation refuses an invitation already accepted by a different account', async () => {
  const client = makeFakeAdminClient({
    organization_invitations: [pendingInvitation({ accepted_at: NOW.toISOString(), accepted_by: 'user-1' })],
    organizations: [ORG],
  })
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-2', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'error')
})

test('acceptOrganizationInvitation rejects an unrecognized role', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation({ role: 'superuser' })], organizations: [ORG] })
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'invalid_role')
})

test('declineOrganizationInvitation revokes a pending matching invitation', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation()], organizations: [ORG] })
  const result = await declineOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'declined')
  assert.ok(client.state.organization_invitations[0].revoked_at)
  assert.equal(client.state.platform_audit_events[0].action, 'organization_invitation.decline')
})

test('declineOrganizationInvitation refuses a non-matching email', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation()], organizations: [ORG] })
  const result = await declineOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'someone-else@example.com' })
  assert.equal(result.status, 'email_mismatch')
})

test('declineOrganizationInvitation refuses an already-accepted invitation', async () => {
  const client = makeFakeAdminClient({
    organization_invitations: [pendingInvitation({ accepted_at: NOW.toISOString(), accepted_by: 'user-1' })],
    organizations: [ORG],
  })
  const result = await declineOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'already_accepted')
})

test('listPendingInvitationsForEmail returns only this email\'s pending, unexpired, unrevoked invitations with organization and inviter names resolved', async () => {
  const client = makeFakeAdminClient({
    organization_invitations: [
      pendingInvitation(),
      pendingInvitation({ id: 'inv-2', token: 'token-2', email: 'someone-else@example.com' }),
      pendingInvitation({ id: 'inv-3', token: 'token-3', expires_at: PAST }),
      pendingInvitation({ id: 'inv-4', token: 'token-4', revoked_at: NOW.toISOString() }),
      pendingInvitation({ id: 'inv-5', token: 'token-5', accepted_at: NOW.toISOString(), accepted_by: 'user-1' }),
    ],
    organizations: [ORG],
    users: { 'inviter-1': { email: 'admin@avatark.ai' } },
  })
  const invitations = await listPendingInvitationsForEmail(client as never, 'invitee@example.com')
  assert.equal(invitations.length, 1)
  assert.equal(invitations[0].organizationName, 'Test Org')
  assert.equal(invitations[0].invitedByEmail, 'admin@avatark.ai')
})

test('acceptOrganizationInvitation never touches capability_grants (membership and capabilities stay separate)', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation()], organizations: [ORG] })
  const originalFrom = client.from
  client.from = ((table: string) => {
    assert.notEqual(table, 'capability_grants', 'acceptOrganizationInvitation must never read or write capability_grants')
    return originalFrom(table as never)
  }) as never
  const result = await acceptOrganizationInvitation(client as never, { token: 'token-1', userId: 'user-1', userEmail: 'invitee@example.com' })
  assert.equal(result.status, 'accepted')
})

test('listPendingInvitationsForEmail returns nothing for an empty email', async () => {
  const client = makeFakeAdminClient({ organization_invitations: [pendingInvitation()], organizations: [ORG] })
  const invitations = await listPendingInvitationsForEmail(client as never, '')
  assert.deepEqual(invitations, [])
})
