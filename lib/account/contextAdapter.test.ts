import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createContextAdapter, toCurrentContextState } from './contextAdapter.ts'
import type { ContextSnapshot } from '@avatark/context-runtime'

function emptySnapshot(): ContextSnapshot {
  const keys = [
    'currentProductId', 'currentOrganizationId', 'currentExperienceId', 'currentNarrativeId',
    'currentEpisodeId', 'currentSceneId', 'currentLivingWorldId', 'currentLocationId',
    'currentPracticeId', 'currentReflectionId', 'currentCohortId', 'currentInvitationId', 'currentAvatarId',
  ] as const
  const fields = Object.fromEntries(keys.map((k) => [k, { value: null, source: null }])) as ContextSnapshot['fields']
  return { userId: 'user-a', fields, updatedAt: null }
}

function fakeFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () => ({ ok, status, json: async () => body })) as unknown as typeof fetch
}

test('toCurrentContextState renders "Not active" fields as null, never fabricated', () => {
  const state = toCurrentContextState(emptySnapshot())
  assert.deepEqual(state, { livingWorld: null, journey: null, episode: null, practice: null })
})

test('toCurrentContextState maps the runtime axes onto the legacy CurrentContextState shape', () => {
  const snapshot = emptySnapshot()
  snapshot.fields.currentLivingWorldId.value = 'living-forest'
  snapshot.fields.currentNarrativeId.value = 'the-ascent'
  snapshot.fields.currentEpisodeId.value = 'ep-3'
  snapshot.fields.currentPracticeId.value = 'stillness-practice'

  const state = toCurrentContextState(snapshot)
  assert.deepEqual(state, {
    livingWorld: 'living-forest',
    journey: 'the-ascent',
    episode: 'ep-3',
    practice: 'stillness-practice',
  })
})

test('createContextAdapter.get() returns mapped data on a successful response', async () => {
  const snapshot = emptySnapshot()
  snapshot.fields.currentEpisodeId.value = 'ep-1'
  const adapter = createContextAdapter(fakeFetch(snapshot))

  const result = await adapter.get()
  assert.equal(result.error, undefined)
  assert.equal(result.data?.episode, 'ep-1')
})

test('createContextAdapter.get() surfaces a server error instead of throwing or fabricating data', async () => {
  const adapter = createContextAdapter(fakeFetch({ error: 'Not signed in' }, false, 401))

  const result = await adapter.get()
  assert.equal(result.data, undefined)
  assert.equal(result.error, 'Not signed in')
})
