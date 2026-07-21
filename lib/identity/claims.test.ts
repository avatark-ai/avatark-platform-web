import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadIdentityExtras } from './claims.ts'

// A minimal fake of the Supabase query-builder chain this function calls
// (.from().select().eq()...), thenable like the real PostgrestFilterBuilder
// so `await` resolves it directly. No live database is reachable from this
// environment (no environment has ever run the platform migrations against
// a real Postgres instance -- see docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md),
// so this is how "does the identity contract actually return populated
// claims for a user with memberships/access/roles" is verified here: real
// execution of the real function, against fixture rows shaped exactly like
// the tables it queries, not a live end-to-end check.
function makeFakeClient(rows: Record<string, Record<string, unknown>[]>) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          filters[column] = value
          return builder
        },
        then(onFulfilled: (result: { data: Record<string, unknown>[]; error: null }) => void) {
          const matches = (rows[table] ?? []).filter((row) =>
            Object.entries(filters).every(([column, value]) => row[column] === value)
          )
          onFulfilled({ data: matches, error: null })
        },
      }
      return builder
    },
  }
}

test('loadIdentityExtras returns populated claims for a user with real memberships, active access, and roles', async () => {
  const client = makeFakeClient({
    organization_members: [
      { user_id: 'u1', org_id: 'org-1' },
      { user_id: 'u2', org_id: 'org-2' },
    ],
    product_access: [
      { user_id: 'u1', product_id: 'prometheusk', status: 'active' },
      { user_id: 'u1', product_id: 'gamek', status: 'revoked' },
    ],
    platform_roles: [{ user_id: 'u1', role: 'admin' }],
  })

  const extras = await loadIdentityExtras(client as never, 'u1')

  assert.deepEqual(extras, {
    organizationIds: ['org-1'],
    // 'gamek' is deliberately excluded -- its row exists but status is
    // 'revoked', and the query itself filters to status = 'active', the
    // same filter recommended in docs/ecosystem/WAVE2_IDENTITY_REPORT.md §3.1.
    productAccess: ['prometheusk'],
    roles: ['admin'],
  })
})

test('loadIdentityExtras returns honest empty arrays for a user with no rows', async () => {
  const client = makeFakeClient({ organization_members: [], product_access: [], platform_roles: [] })

  const extras = await loadIdentityExtras(client as never, 'nobody')

  assert.deepEqual(extras, { organizationIds: [], productAccess: [], roles: [] })
})
