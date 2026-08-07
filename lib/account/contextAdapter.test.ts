import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createContextAdapter, toCurrentContextState } from './contextAdapter.ts'
import type { ContextSnapshot } from '@avatark/context-runtime'
import type { JourneyProgress } from '@avatark/experience-runtime'

function emptySnapshot(): ContextSnapshot {
  const keys = [
    'currentProductId', 'currentOrganizationId', 'currentExperienceId', 'currentNarrativeId',
    'currentEpisodeId', 'currentSceneId', 'currentLivingWorldId', 'currentLocationId',
    'currentPracticeId', 'currentReflectionId', 'currentCohortId', 'currentInvitationId', 'currentAvatarId',
  ] as const
  const fields = Object.fromEntries(keys.map((k) => [k, { value: null, source: null }])) as ContextSnapshot['fields']
  return { userId: 'user-a', fields, updatedAt: null }
}

function fakeFetch(responses: Record<string, { body: unknown; ok?: boolean; status?: number }>): typeof fetch {
  return (async (url: string) => {
    const r = responses[url] ?? { body: {}, ok: true, status: 200 }
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body }
  }) as unknown as typeof fetch
}

test('toCurrentContextState renders every field as null when the snapshot is empty and there is no journey progress', () => {
  const state = toCurrentContextState(emptySnapshot(), null)
  assert.deepEqual(state, {
    livingWorld: null,
    journey: null,
    episode: null,
    practice: null,
    experience: null,
    scene: null,
    reflection: null,
    location: null,
    challenge: null,
    milestone: null,
    journeyStatus: null,
    progress: null,
  })
})

test('toCurrentContextState maps the original four legacy axes unchanged', () => {
  const snapshot = emptySnapshot()
  snapshot.fields.currentLivingWorldId.value = 'living-forest'
  snapshot.fields.currentNarrativeId.value = 'the-ascent'
  snapshot.fields.currentEpisodeId.value = 'ep-3'
  snapshot.fields.currentPracticeId.value = 'stillness-practice'

  const state = toCurrentContextState(snapshot, null)
  assert.equal(state.livingWorld, 'living-forest')
  assert.equal(state.journey, 'the-ascent')
  assert.equal(state.episode, 'ep-3')
  assert.equal(state.practice, 'stillness-practice')
})

test('toCurrentContextState maps the new context-runtime axes (experience/scene/reflection/location) 1:1', () => {
  const snapshot = emptySnapshot()
  snapshot.fields.currentExperienceId.value = 'exp-1'
  snapshot.fields.currentSceneId.value = 'scene-1'
  snapshot.fields.currentReflectionId.value = 'refl-1'
  snapshot.fields.currentLocationId.value = 'loc-1'

  const state = toCurrentContextState(snapshot, null)
  assert.equal(state.experience, 'exp-1')
  assert.equal(state.scene, 'scene-1')
  assert.equal(state.reflection, 'refl-1')
  assert.equal(state.location, 'loc-1')
})

test('toCurrentContextState derives journeyStatus/progress from JourneyProgress, and challenge only when nextPractice is a challenge', () => {
  const progress = {
    status: 'active',
    percentComplete: 42,
    nextPractice: { id: 'first-challenge', kind: 'challenge', title: 'First Challenge', prerequisites: [] },
    completedMilestoneIds: [],
  } as unknown as JourneyProgress

  const state = toCurrentContextState(emptySnapshot(), progress)
  assert.equal(state.journeyStatus, 'active')
  assert.equal(state.progress, '42%')
  assert.equal(state.challenge, 'First Challenge')
})

test('toCurrentContextState leaves challenge null when nextPractice is a plain practice, not a challenge', () => {
  const progress = {
    status: 'active',
    percentComplete: 10,
    nextPractice: { id: 'daily-checkin', kind: 'practice', title: 'Daily Check-In', prerequisites: [] },
    completedMilestoneIds: [],
  } as unknown as JourneyProgress

  const state = toCurrentContextState(emptySnapshot(), progress)
  assert.equal(state.challenge, null)
})

test('toCurrentContextState resolves milestone title from the most recently completed milestone id', () => {
  const progress = {
    status: 'active',
    percentComplete: 20,
    nextPractice: null,
    completedMilestoneIds: ['welcomed'],
  } as unknown as JourneyProgress

  const state = toCurrentContextState(emptySnapshot(), progress)
  assert.equal(state.milestone, 'Welcomed')
})

test('createContextAdapter.get() merges context + journey fetches into one CurrentContextState', async () => {
  const snapshot = emptySnapshot()
  snapshot.fields.currentEpisodeId.value = 'ep-1'
  const adapter = createContextAdapter(
    fakeFetch({
      '/api/account/context': { body: snapshot },
      '/api/account/journey': { body: { progress: { status: 'active', percentComplete: 5, nextPractice: null, completedMilestoneIds: [] } } },
    }),
  )

  const result = await adapter.get()
  assert.equal(result.error, undefined)
  assert.equal(result.data?.episode, 'ep-1')
  assert.equal(result.data?.journeyStatus, 'active')
  assert.equal(result.data?.progress, '5%')
})

test('createContextAdapter.get() surfaces a context server error instead of throwing or fabricating data', async () => {
  const adapter = createContextAdapter(
    fakeFetch({
      '/api/account/context': { body: { error: 'Not signed in' }, ok: false, status: 401 },
      '/api/account/journey': { body: {} },
    }),
  )

  const result = await adapter.get()
  assert.equal(result.data, undefined)
  assert.equal(result.error, 'Not signed in')
})

test('createContextAdapter.get() still returns context data when the journey fetch fails', async () => {
  const snapshot = emptySnapshot()
  snapshot.fields.currentEpisodeId.value = 'ep-1'
  const adapter = createContextAdapter(
    fakeFetch({
      '/api/account/context': { body: snapshot },
      '/api/account/journey': { body: { error: 'boom' }, ok: false, status: 500 },
    }),
  )

  const result = await adapter.get()
  assert.equal(result.error, undefined)
  assert.equal(result.data?.episode, 'ep-1')
  assert.equal(result.data?.journeyStatus, null)
  assert.equal(result.data?.progress, null)
})
