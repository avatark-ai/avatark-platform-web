import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InMemoryContextRepository } from './repository.ts'
import type { ContextSnapshot } from './types.ts'

function snapshotFor(userId: string): ContextSnapshot {
  return {
    userId,
    updatedAt: '2026-08-01T00:00:00.000Z',
    fields: {
      currentProductId: { value: 'gamek', source: { scope: 'session', productId: 'gamek', writtenAt: '2026-08-01T00:00:00.000Z' } },
      currentOrganizationId: { value: null, source: null },
      currentExperienceId: { value: null, source: null },
      currentNarrativeId: { value: null, source: null },
      currentEpisodeId: { value: null, source: null },
      currentSceneId: { value: null, source: null },
      currentLivingWorldId: { value: null, source: null },
      currentLocationId: { value: null, source: null },
      currentPracticeId: { value: null, source: null },
      currentReflectionId: { value: null, source: null },
      currentCohortId: { value: null, source: null },
      currentInvitationId: { value: null, source: null },
      currentAvatarId: { value: null, source: null },
    },
  }
}

test('InMemoryContextRepository returns null for a user with no snapshot yet', async () => {
  const repo = new InMemoryContextRepository()
  assert.equal(await repo.loadSnapshot('user-a'), null)
})

test('InMemoryContextRepository keeps snapshots isolated per user', async () => {
  const repo = new InMemoryContextRepository()
  await repo.saveSnapshot('user-a', snapshotFor('user-a'))
  assert.equal(await repo.loadSnapshot('user-b'), null)
  assert.equal((await repo.loadSnapshot('user-a'))?.fields.currentProductId.value, 'gamek')
})

test('InMemoryContextRepository returns history newest-first, scoped per user', async () => {
  const repo = new InMemoryContextRepository()
  await repo.appendHistory({ id: 'h1', userId: 'user-a', snapshot: snapshotFor('user-a'), patch: null, recordedAt: '2026-08-01T00:00:00.000Z' })
  await repo.appendHistory({ id: 'h2', userId: 'user-a', snapshot: snapshotFor('user-a'), patch: null, recordedAt: '2026-08-02T00:00:00.000Z' })
  await repo.appendHistory({ id: 'h3', userId: 'user-b', snapshot: snapshotFor('user-b'), patch: null, recordedAt: '2026-08-02T00:00:00.000Z' })

  const historyA = await repo.loadHistory('user-a', 10)
  assert.deepEqual(historyA.map((e) => e.id), ['h2', 'h1'])

  const historyB = await repo.loadHistory('user-b', 10)
  assert.deepEqual(historyB.map((e) => e.id), ['h3'])
})

test('InMemoryContextRepository loadHistoryEntry never finds another user\'s entry', async () => {
  const repo = new InMemoryContextRepository()
  await repo.appendHistory({ id: 'h1', userId: 'user-a', snapshot: snapshotFor('user-a'), patch: null, recordedAt: '2026-08-01T00:00:00.000Z' })
  assert.equal(await repo.loadHistoryEntry('user-b', 'h1'), null)
  assert.notEqual(await repo.loadHistoryEntry('user-a', 'h1'), null)
})
