import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bootstrapPlatformAdmin } from './bootstrap.ts'

// Minimal fake covering exactly what bootstrapPlatformAdmin calls: a
// count-only select on platform_roles, an insert into platform_roles, and
// the audit-log insert every admin mutation in this repo goes through
// (lib/admin/audit.ts) -- same discipline as adminGrants.test.ts's fake.
function makeFakeAdminClient(opts: { existingAdminCount?: number; insertErrorCode?: string } = {}) {
  const existingAdminCount = opts.existingAdminCount ?? 0
  const inserted: Record<string, unknown>[] = []
  const auditEvents: Record<string, unknown>[] = []

  function from(table: 'platform_roles' | 'platform_audit_events') {
    let mode: 'select' | 'insert' = 'select'
    let insertPayload: Record<string, unknown> | null = null

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
      eq() {
        return builder
      },
      then(onFulfilled: (result: { data: unknown; count?: number; error: { message: string; code?: string } | null }) => void) {
        if (mode === 'insert') {
          if (table === 'platform_roles') {
            if (opts.insertErrorCode) {
              onFulfilled({ data: null, error: { message: 'insert failed', code: opts.insertErrorCode } })
              return
            }
            inserted.push(insertPayload!)
          } else {
            auditEvents.push(insertPayload!)
          }
          onFulfilled({ data: null, error: null })
          return
        }
        // select (count-only, head: true) on platform_roles
        onFulfilled({ data: null, count: existingAdminCount, error: null })
      },
    }
    return builder
  }

  return { from, inserted, auditEvents }
}

test('bootstrapPlatformAdmin refuses when PLATFORM_ADMIN_BOOTSTRAP_EMAIL is unset', async () => {
  const client = makeFakeAdminClient()
  const result = await bootstrapPlatformAdmin(client as never, {
    userId: 'user-1',
    userEmail: 'admin@avatark.ai',
    bootstrapEmail: undefined,
  })
  assert.equal(result.status, 'not_configured')
  assert.equal(client.inserted.length, 0)
})

test('bootstrapPlatformAdmin refuses an account that does not match the configured email', async () => {
  const client = makeFakeAdminClient()
  const result = await bootstrapPlatformAdmin(client as never, {
    userId: 'user-1',
    userEmail: 'someone-else@avatark.ai',
    bootstrapEmail: 'admin@avatark.ai',
  })
  assert.equal(result.status, 'wrong_account')
  assert.equal(client.inserted.length, 0)
})

test('bootstrapPlatformAdmin matches the configured email case-insensitively', async () => {
  const client = makeFakeAdminClient()
  const result = await bootstrapPlatformAdmin(client as never, {
    userId: 'user-1',
    userEmail: 'Admin@AvatarK.ai',
    bootstrapEmail: 'admin@avatark.ai',
  })
  assert.equal(result.status, 'granted')
  assert.equal(client.inserted.length, 1)
  assert.equal(client.inserted[0].user_id, 'user-1')
  assert.equal(client.inserted[0].role, 'admin')
})

test('bootstrapPlatformAdmin records an audit event on success', async () => {
  const client = makeFakeAdminClient()
  await bootstrapPlatformAdmin(client as never, {
    userId: 'user-1',
    userEmail: 'admin@avatark.ai',
    bootstrapEmail: 'admin@avatark.ai',
  })
  assert.equal(client.auditEvents.length, 1)
  assert.equal(client.auditEvents[0].action, 'platform_admin.bootstrap_grant')
})

test('bootstrapPlatformAdmin self-disables once any admin already exists', async () => {
  const client = makeFakeAdminClient({ existingAdminCount: 1 })
  const result = await bootstrapPlatformAdmin(client as never, {
    userId: 'user-1',
    userEmail: 'admin@avatark.ai',
    bootstrapEmail: 'admin@avatark.ai',
  })
  assert.equal(result.status, 'already_bootstrapped')
  assert.equal(client.inserted.length, 0)
})

test('bootstrapPlatformAdmin treats a duplicate-grant race as success, not an error', async () => {
  const client = makeFakeAdminClient({ insertErrorCode: '23505' })
  const result = await bootstrapPlatformAdmin(client as never, {
    userId: 'user-1',
    userEmail: 'admin@avatark.ai',
    bootstrapEmail: 'admin@avatark.ai',
  })
  assert.equal(result.status, 'granted')
})

test('bootstrapPlatformAdmin surfaces a real insert failure as an error', async () => {
  const client = makeFakeAdminClient({ insertErrorCode: '23503' })
  const result = await bootstrapPlatformAdmin(client as never, {
    userId: 'user-1',
    userEmail: 'admin@avatark.ai',
    bootstrapEmail: 'admin@avatark.ai',
  })
  assert.equal(result.status, 'error')
})
