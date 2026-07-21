import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getActivityCards } from './registry.ts'

test('all four primary Activities are present, in order', () => {
  const cards = getActivityCards()
  assert.deepEqual(cards.map((c) => c.id), ['explore', 'practice', 'together', 'watch'])
})

test('Explore (GameK, beta+public) is shown with a beta badge and a real href', () => {
  const card = getActivityCards().find((c) => c.id === 'explore')
  assert.equal(card?.availability, 'beta')
  assert.ok(card?.href, 'expected a resolved destination URL')
})

test('Practice routes through AvatarK\'s own /start funnel, not PrometheusK\'s domain', () => {
  const card = getActivityCards().find((c) => c.id === 'practice')
  assert.equal(card?.href, '/start')
  assert.equal(card?.availability, 'available')
})

test('Together (ArenaK, alpha+public) is an honest coming-soon state with no href', () => {
  const card = getActivityCards().find((c) => c.id === 'together')
  assert.equal(card?.availability, 'coming_soon')
  assert.equal(card?.href, null)
})

test('Watch (StreamK, alpha+public) is an honest coming-soon state with no href', () => {
  const card = getActivityCards().find((c) => c.id === 'watch')
  assert.equal(card?.availability, 'coming_soon')
  assert.equal(card?.href, null)
})

test('no card ever claims an availability other than coming_soon while href is null', () => {
  for (const card of getActivityCards()) {
    if (card.href === null) assert.equal(card.availability, 'coming_soon')
  }
})
