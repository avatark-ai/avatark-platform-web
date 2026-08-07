import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLivingWorldsAdapter } from './livingWorldsAdapter.ts'
import type { LivingWorld } from '@avatark/account'

function fakeFetch(responses: Record<string, { body: unknown; ok?: boolean; status?: number }>): typeof fetch {
  return (async (url: string) => {
    const r = responses[url] ?? { body: {}, ok: true, status: 200 }
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body }
  }) as unknown as typeof fetch
}

const WORLD: LivingWorld = {
  id: 'living-forest',
  name: 'Living Forest',
  status: 'Ready to Begin',
  description: 'Living Forest (sample fixture world)',
  progress: '0% (0/3 locations)',
  canContinue: false,
}

test('list() returns the worlds from a successful response', async () => {
  const adapter = createLivingWorldsAdapter(fakeFetch({ '/api/account/living-worlds': { body: { worlds: [WORLD] } } }))
  const result = await adapter.list()
  assert.equal(result.error, undefined)
  assert.deepEqual(result.data, [WORLD])
})

test('list() surfaces a server error instead of throwing or fabricating data', async () => {
  const adapter = createLivingWorldsAdapter(
    fakeFetch({ '/api/account/living-worlds': { body: { error: 'Not signed in' }, ok: false, status: 401 } }),
  )
  const result = await adapter.list()
  assert.equal(result.data, undefined)
  assert.equal(result.error, 'Not signed in')
})

test('enter() posts the enter action and returns the matching updated world', async () => {
  const entered: LivingWorld = { ...WORLD, status: 'Active', canContinue: true, currentLocation: 'Entry' }
  const adapter = createLivingWorldsAdapter(
    fakeFetch({ '/api/account/living-worlds': { body: { worlds: [entered] } } }),
  )
  const result = await adapter.enter!('living-forest')
  assert.equal(result.error, undefined)
  assert.equal(result.data?.status, 'Active')
  assert.equal(result.data?.currentLocation, 'Entry')
})

test('enter() errors honestly if the response does not include the requested world', async () => {
  const adapter = createLivingWorldsAdapter(fakeFetch({ '/api/account/living-worlds': { body: { worlds: [] } } }))
  const result = await adapter.enter!('living-forest')
  assert.equal(result.data, undefined)
  assert.match(result.error ?? '', /not found/)
})
