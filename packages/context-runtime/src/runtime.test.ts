import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InMemoryContextRepository } from './repository.ts'
import { ContextRuntime } from './runtime.ts'
import { ContextValidationError } from './validation.ts'
import type { ContextAdapter } from './adapter.ts'

function newRuntime(adapters: ContextAdapter[] = []) {
  return new ContextRuntime(new InMemoryContextRepository(), { adapters })
}

test('getContext on a brand-new user returns an honestly empty snapshot, never an error', async () => {
  const runtime = newRuntime()
  const snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.userId, 'user-a')
  assert.equal(snapshot.updatedAt, null)
  for (const field of Object.values(snapshot.fields)) {
    assert.equal(field.value, null)
    assert.equal(field.source, null)
  }
})

test('setContext accepts a partial context — untouched fields stay empty, not required', async () => {
  const runtime = newRuntime()
  const outcome = await runtime.setContext(
    'user-a',
    { currentProductId: 'gamek', currentEpisodeId: 'ep-1' },
    { productId: 'gamek' },
  )
  assert.deepEqual(outcome.applied.sort(), ['currentEpisodeId', 'currentProductId'])
  assert.equal(outcome.rejected.length, 0)

  const snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentProductId.value, 'gamek')
  assert.equal(snapshot.fields.currentEpisodeId.value, 'ep-1')
  assert.equal(snapshot.fields.currentSceneId.value, null) // never fabricated
})

test('a later update overwrites an earlier one at the same scope', async () => {
  const runtime = newRuntime()
  await runtime.setContext('user-a', { currentEpisodeId: 'ep-1' }, { productId: 'gamek', occurredAt: '2026-08-01T00:00:00.000Z' })
  await runtime.setContext('user-a', { currentEpisodeId: 'ep-2' }, { productId: 'gamek', occurredAt: '2026-08-02T00:00:00.000Z' })

  const snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentEpisodeId.value, 'ep-2')
})

test('a stale update is rejected, not silently applied, and is reported to the caller', async () => {
  const runtime = newRuntime()
  await runtime.setContext('user-a', { currentEpisodeId: 'ep-2' }, { productId: 'gamek', occurredAt: '2026-08-02T00:00:00.000Z' })
  const outcome = await runtime.setContext('user-a', { currentEpisodeId: 'ep-1-stale' }, { productId: 'gamek', occurredAt: '2026-08-01T00:00:00.000Z' })

  assert.equal(outcome.applied.length, 0)
  assert.equal(outcome.rejected.length, 1)
  assert.equal(outcome.rejected[0].reason, 'stale')

  const snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentEpisodeId.value, 'ep-2') // untouched
})

test('source precedence: an explicit session write outranks a persisted write, which outranks a product default', async () => {
  const adapter: ContextAdapter = {
    productId: 'gamek',
    async getDefaults() {
      return { currentLivingWorldId: 'default-world' }
    },
  }
  const runtime = newRuntime([adapter])

  await runtime.setContext('user-a', { currentProductId: 'gamek' }, { productId: 'gamek' })
  let snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentLivingWorldId.value, 'default-world') // nothing more specific yet

  await runtime.patchContext('user-a', { productId: 'gamek', scope: 'persisted', fields: { currentLivingWorldId: 'persisted-world' } })
  snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentLivingWorldId.value, 'persisted-world') // beats the default

  await runtime.setContext('user-a', { currentLivingWorldId: 'session-world' }, { productId: 'gamek' })
  snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentLivingWorldId.value, 'session-world') // beats persisted

  const rejectedOutcome = await runtime.patchContext('user-a', {
    productId: 'gamek',
    scope: 'persisted',
    fields: { currentLivingWorldId: 'persisted-world-again' },
  })
  assert.equal(rejectedOutcome.rejected[0]?.reason, 'lower_precedence') // never silently overwrites the session value
})

test('clearContextField clears exactly one field, leaving the rest of the snapshot intact', async () => {
  const runtime = newRuntime()
  await runtime.setContext('user-a', { currentProductId: 'gamek', currentEpisodeId: 'ep-1' }, { productId: 'gamek' })
  await runtime.clearContextField('user-a', 'currentEpisodeId', { productId: 'gamek' })

  const snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentEpisodeId.value, null)
  assert.equal(snapshot.fields.currentProductId.value, 'gamek')
})

test('clearContext resets every field for that user', async () => {
  const runtime = newRuntime()
  await runtime.setContext(
    'user-a',
    { currentProductId: 'gamek', currentEpisodeId: 'ep-1', currentAvatarId: 'avatar-1' },
    { productId: 'gamek' },
  )
  await runtime.clearContext('user-a', { productId: 'gamek' })

  const snapshot = await runtime.getContext('user-a')
  for (const field of Object.values(snapshot.fields)) {
    assert.equal(field.value, null)
  }
})

test('pushContext + restoreContext round-trips an earlier snapshot back to being live', async () => {
  const runtime = newRuntime()
  await runtime.setContext('user-a', { currentEpisodeId: 'ep-1', currentSceneId: 'scene-1' }, { productId: 'gamek' })
  const checkpoint = await runtime.pushContext('user-a')

  await runtime.setContext('user-a', { currentEpisodeId: 'ep-2', currentSceneId: 'scene-9' }, { productId: 'gamek' })
  let snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentEpisodeId.value, 'ep-2')

  await runtime.restoreContext('user-a', checkpoint.id, { productId: 'gamek' })
  snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentEpisodeId.value, 'ep-1')
  assert.equal(snapshot.fields.currentSceneId.value, 'scene-1')
})

test('getContextHistory returns entries for the requesting user only, newest first', async () => {
  const runtime = newRuntime()
  await runtime.setContext('user-a', { currentEpisodeId: 'ep-1' }, { productId: 'gamek', occurredAt: '2026-08-01T00:00:00.000Z' })
  await runtime.setContext('user-a', { currentEpisodeId: 'ep-2' }, { productId: 'gamek', occurredAt: '2026-08-02T00:00:00.000Z' })
  await runtime.setContext('user-b', { currentEpisodeId: 'other-user-episode' }, { productId: 'gamek' })

  const historyA = await runtime.getContextHistory('user-a', 10)
  assert.equal(historyA.length, 2)
  assert.equal(historyA[0].snapshot.fields.currentEpisodeId.value, 'ep-2') // newest first
  assert.ok(historyA.every((e) => e.userId === 'user-a'))
})

test('user isolation: one user\'s writes are invisible to another user\'s context', async () => {
  const runtime = newRuntime()
  await runtime.setContext('user-a', { currentProductId: 'gamek', currentEpisodeId: 'ep-1' }, { productId: 'gamek' })

  const snapshotB = await runtime.getContext('user-b')
  for (const field of Object.values(snapshotB.fields)) {
    assert.equal(field.value, null)
  }
})

test('malformed context is rejected loudly by the runtime, not coerced', async () => {
  const runtime = newRuntime()
  await assert.rejects(
    () => runtime.patchContext('user-a', { productId: 'gamek', scope: 'session', fields: { doesNotExist: 'x' } as never }),
    ContextValidationError,
  )
})

test('product switch updates only the product field — no cascading resets (no franchise logic, no inference)', async () => {
  const runtime = newRuntime()
  await runtime.setContext(
    'user-a',
    { currentProductId: 'gamek', currentEpisodeId: 'ep-1', currentLivingWorldId: 'world-1', currentAvatarId: 'avatar-1' },
    { productId: 'gamek' },
  )

  await runtime.setContext('user-a', { currentProductId: 'prometheusk' }, { productId: 'prometheusk' })

  const snapshot = await runtime.getContext('user-a')
  assert.equal(snapshot.fields.currentProductId.value, 'prometheusk')
  // Everything else survives the switch untouched — deciding whether any
  // of it still makes sense for the new product is the caller's job, not
  // this runtime's.
  assert.equal(snapshot.fields.currentEpisodeId.value, 'ep-1')
  assert.equal(snapshot.fields.currentLivingWorldId.value, 'world-1')
  assert.equal(snapshot.fields.currentAvatarId.value, 'avatar-1')
})
