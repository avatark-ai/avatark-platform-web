import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getCollectionBySlug,
  getEchoBySlug,
  getPracticeBySlug,
  listCollections,
  listEchoes,
  listPractices,
  listPracticesByEcho,
  listStories,
  pickPracticeForIntention,
} from './echo.ts'

test('lists the seed Echo with real content, not fabricated', () => {
  const echoes = listEchoes()
  assert.equal(echoes.length, 1)
  const [returner] = echoes
  assert.equal(returner.slug, 'the-returner')
  assert.equal(returner.name, 'The Returner')
  assert.equal(returner.category, 'archetype')
  assert.ok(returner.mission.length > 0)
  assert.ok(returner.giftMessage.length > 0)
  assert.equal(returner.isDemo, false)
})

test('getEchoBySlug finds the seed entry and returns undefined for unknown slugs', () => {
  assert.ok(getEchoBySlug('the-returner'))
  assert.equal(getEchoBySlug('does-not-exist'), undefined)
})

test('lists the seed Practice, generalized from the old witness/guide pair', () => {
  const practices = listPractices()
  assert.equal(practices.length, 1)
  const [practice] = practices
  assert.equal(practice.slug, 'the-promise-to-myself')
  assert.equal(practice.sourceEcho, 'the-returner')
  assert.equal(practice.title, 'The Two-Minute Check-In')
  assert.equal(practice.witnessLabel, 'The Promise to Myself')
  assert.ok(practice.narrative.length > 0)
})

test('getPracticeBySlug and listPracticesByEcho resolve correctly', () => {
  assert.ok(getPracticeBySlug('the-promise-to-myself'))
  assert.equal(getPracticeBySlug('missing'), undefined)
  assert.equal(listPracticesByEcho('the-returner').length, 1)
  assert.equal(listPracticesByEcho('unknown-echo').length, 0)
})

test('pickPracticeForIntention matches on declared themes, falls back to first practice', () => {
  const stuckMatch = pickPracticeForIntention('stuck')
  assert.equal(stuckMatch?.slug, 'the-promise-to-myself')

  const noMatch = pickPracticeForIntention('curious')
  assert.equal(noMatch?.slug, 'the-promise-to-myself')

  const noIntention = pickPracticeForIntention(null)
  assert.equal(noIntention?.slug, 'the-promise-to-myself')
})

test('listStories is honestly empty -- no story content authored yet', () => {
  assert.deepEqual(listStories(), [])
})

test('lists the seed Collection grouping real Echo/Practice content', () => {
  const collections = listCollections()
  assert.equal(collections.length, 1)
  const [collection] = collections
  assert.equal(collection.slug, 'beginning-with-change')
  assert.deepEqual(collection.echoSlugs, ['the-returner'])
  assert.deepEqual(collection.practiceSlugs, ['the-promise-to-myself'])
  assert.deepEqual(collection.storySlugs, [])
})

test('getCollectionBySlug resolves correctly', () => {
  assert.ok(getCollectionBySlug('beginning-with-change'))
  assert.equal(getCollectionBySlug('missing'), undefined)
})
