import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ContextRuntime, InMemoryContextRepository } from '@avatark/context-runtime'
import { InMemoryJourneyRepository, JourneyRuntime, type JourneyDefinition } from '@avatark/experience-runtime'
import { createInMemoryNarrativeRepository, createNarrativeRuntime, type NarrativeDefinition } from '@avatark/narrative-runtime'
import { applyJourneyViewAction, narrativeSummary, toJourneyViewResponse } from './journeyView.ts'

const EXPERIENCE_DEFINITION: JourneyDefinition = {
  id: 'avatark-welcome-journey',
  title: 'Welcome Experience',
  episodes: [{ id: 'orientation', title: 'Orientation', prerequisites: [] }],
  livingWorlds: [],
  practices: [{ id: 'daily-checkin', kind: 'practice', title: 'Daily Check-In', prerequisites: [] }],
  reflections: [],
  milestones: [],
  completionCriteria: { requiredEpisodeIds: ['orientation'] },
}

const NARRATIVE_DEFINITION: NarrativeDefinition = {
  id: 'n',
  version: 1,
  title: 'N',
  entrySeasonId: 's1',
  seasons: [{ id: 's1', title: 'S1', entryEpisodeId: 'e1', episodes: [{ id: 'e1', title: 'E1', entrySceneId: 'sc1', scenes: [{ id: 'sc1', title: 'Sc1', entryBeatId: 'b1', beats: [{ id: 'b1', kind: 'narration', next: { to: 'end' } }] }] }] }],
}

function makeInstances() {
  return {
    journey: new JourneyRuntime(EXPERIENCE_DEFINITION, new InMemoryJourneyRepository()),
    narrative: createNarrativeRuntime({ definition: NARRATIVE_DEFINITION, repository: createInMemoryNarrativeRepository() }),
    context: new ContextRuntime(new InMemoryContextRepository()),
  }
}

test('narrativeSummary returns null for a user who never started the narrative, not an error', async () => {
  const { narrative } = makeInstances()
  const summary = await narrativeSummary(narrative, 'user-1')
  assert.equal(summary, null)
})

test('narrativeSummary returns real state once started', async () => {
  const { narrative } = makeInstances()
  await narrative.startNarrative('user-1')
  const summary = await narrativeSummary(narrative, 'user-1')
  assert.equal(summary?.status, 'active')
  assert.equal(summary?.sceneId, 'sc1')
})

test('toJourneyViewResponse returns null progress/narrative for a brand-new user, never fabricated', async () => {
  const { journey, narrative } = makeInstances()
  const view = await toJourneyViewResponse(journey, narrative, 'user-1')
  assert.equal(view.progress, null)
  assert.equal(view.narrative, null)
  assert.deepEqual(view.history, [])
})

test('applyJourneyViewAction syncs currentPracticeId to Context on beginPractice, clears it on finishPractice', async () => {
  const { journey, narrative, context } = makeInstances()
  await journey.start('user-1')

  await applyJourneyViewAction(journey, narrative, 'user-1', 'beginPractice', 'daily-checkin', context, 'avatark')
  let snapshot = await context.getContext('user-1')
  assert.equal(snapshot.fields.currentPracticeId.value, 'daily-checkin')

  await applyJourneyViewAction(journey, narrative, 'user-1', 'finishPractice', 'daily-checkin', context, 'avatark')
  snapshot = await context.getContext('user-1')
  assert.equal(snapshot.fields.currentPracticeId.value, null)
})

test('applyJourneyViewAction syncs currentEpisodeId and currentLivingWorldId to Context', async () => {
  const { journey, narrative, context } = makeInstances()
  await journey.start('user-1')

  await applyJourneyViewAction(journey, narrative, 'user-1', 'completeEpisode', 'orientation', context, 'avatark')
  const snapshot = await context.getContext('user-1')
  assert.equal(snapshot.fields.currentEpisodeId.value, 'orientation')
})

test('applyJourneyViewAction degrades gracefully with no ContextRuntime supplied at all', async () => {
  const { journey, narrative } = makeInstances()
  await journey.start('user-1')
  // Should not throw even though contextRuntime is omitted.
  await applyJourneyViewAction(journey, narrative, 'user-1', 'beginPractice', 'daily-checkin')
  const progress = await journey.getProgress('user-1')
  assert.equal(progress?.status, 'active')
})

test('applyJourneyViewAction dispatches narrative actions to the narrative runtime', async () => {
  const { journey, narrative } = makeInstances()
  await applyJourneyViewAction(journey, narrative, 'user-1', 'startNarrative', null)
  const summary = await narrativeSummary(narrative, 'user-1')
  assert.equal(summary?.status, 'active')
})
