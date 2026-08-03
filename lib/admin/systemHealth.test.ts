import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSystemHealth } from './systemHealth.ts'

function makeFakeAdminClient(opts: { missingTables?: Set<string>; erroringTables?: Set<string>; bucketOk?: boolean } = {}) {
  const missingTables = opts.missingTables ?? new Set<string>()
  const erroringTables = opts.erroringTables ?? new Set<string>()
  const bucketOk = opts.bucketOk ?? true

  return {
    from(table: string) {
      return {
        select() {
          return {
            then(onFulfilled: (r: { error: { code?: string } | null }) => void) {
              if (missingTables.has(table)) return onFulfilled({ error: { code: '42P01' } })
              if (erroringTables.has(table)) return onFulfilled({ error: { code: 'other' } })
              onFulfilled({ error: null })
            },
          }
        },
      }
    },
    storage: {
      async getBucket() {
        return bucketOk ? { data: { name: 'avatars' }, error: null } : { data: null, error: { message: 'not found' } }
      },
    },
  }
}

test('computeSystemHealth reports unknown for every service when the admin client is unavailable', async () => {
  const result = await computeSystemHealth(null, true)
  assert.equal(result.identity, 'operational')
  assert.equal(result.account, 'unknown')
  assert.equal(result.storage, 'unknown')
  assert.equal(result.capabilities, 'unknown')
})

test('computeSystemHealth reports operational for every reachable table and bucket', async () => {
  const client = makeFakeAdminClient({})
  const result = await computeSystemHealth(client as never, true)
  assert.equal(result.account, 'operational')
  assert.equal(result.capabilities, 'operational')
  assert.equal(result.invitations, 'operational')
  assert.equal(result.organizations, 'operational')
  assert.equal(result.audit, 'operational')
  assert.equal(result.storage, 'operational')
})

test('computeSystemHealth reports unavailable for a genuinely missing table (undefined_table)', async () => {
  const client = makeFakeAdminClient({ missingTables: new Set(['capability_grants']) })
  const result = await computeSystemHealth(client as never, true)
  assert.equal(result.capabilities, 'unavailable')
  assert.equal(result.account, 'operational') // unaffected
})

test('computeSystemHealth reports unknown (not operational) for an unrecognized error', async () => {
  const client = makeFakeAdminClient({ erroringTables: new Set(['organization_invitations']) })
  const result = await computeSystemHealth(client as never, true)
  assert.equal(result.invitations, 'unknown')
})

test('computeSystemHealth reports storage unavailable when the bucket lookup errors', async () => {
  const client = makeFakeAdminClient({ bucketOk: false })
  const result = await computeSystemHealth(client as never, true)
  assert.equal(result.storage, 'unavailable')
})

test('computeSystemHealth reflects identity health from the passed-in environment check, not a guess', async () => {
  const client = makeFakeAdminClient({})
  const result = await computeSystemHealth(client as never, false)
  assert.equal(result.identity, 'unavailable')
})
