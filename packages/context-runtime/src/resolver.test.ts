import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ContextResolver } from './resolver.ts'
import type { ContextFieldValue, ContextSource } from './types.ts'

function source(scope: ContextSource['scope'], writtenAt: string, productId = 'gamek'): ContextSource {
  return { scope, productId, writtenAt }
}

test('resolveField applies a write when the field is empty', () => {
  const resolver = new ContextResolver()
  const outcome = resolver.resolveField({
    field: 'currentEpisodeId',
    existing: undefined,
    incomingValue: 'ep-1',
    incomingSource: source('persisted', '2026-08-01T00:00:00.000Z'),
  })
  assert.equal(outcome.applied, true)
  if (outcome.applied) assert.equal(outcome.result.value, 'ep-1')
})

test('resolveField: session precedes persisted regardless of timestamp', () => {
  const resolver = new ContextResolver()
  const existing: ContextFieldValue = { value: 'old-episode', source: source('session', '2026-08-05T00:00:00.000Z') }
  const outcome = resolver.resolveField({
    field: 'currentEpisodeId',
    existing,
    incomingValue: 'new-episode',
    incomingSource: source('persisted', '2026-08-06T00:00:00.000Z'), // "newer" but lower precedence
  })
  assert.equal(outcome.applied, false)
  if (!outcome.applied) assert.equal(outcome.rejection.reason, 'lower_precedence')
})

test('resolveField: persisted precedes product_default', () => {
  const resolver = new ContextResolver()
  const existing: ContextFieldValue = { value: 'persisted-world', source: source('persisted', '2026-08-01T00:00:00.000Z') }
  const outcome = resolver.resolveField({
    field: 'currentLivingWorldId',
    existing,
    incomingValue: 'default-world',
    incomingSource: source('product_default', '2026-08-07T00:00:00.000Z'),
  })
  assert.equal(outcome.applied, false)
  if (!outcome.applied) assert.equal(outcome.rejection.reason, 'lower_precedence')
})

test('resolveField: a higher-precedence write overrides a lower one already in place', () => {
  const resolver = new ContextResolver()
  const existing: ContextFieldValue = { value: 'default-world', source: source('product_default', '2026-08-01T00:00:00.000Z') }
  const outcome = resolver.resolveField({
    field: 'currentLivingWorldId',
    existing,
    incomingValue: 'session-world',
    incomingSource: source('session', '2026-07-01T00:00:00.000Z'), // "older" but higher precedence
  })
  assert.equal(outcome.applied, true)
  if (outcome.applied) assert.equal(outcome.result.value, 'session-world')
})

test('resolveField: same-scope newer write applies', () => {
  const resolver = new ContextResolver()
  const existing: ContextFieldValue = { value: 'ep-1', source: source('session', '2026-08-01T00:00:00.000Z') }
  const outcome = resolver.resolveField({
    field: 'currentEpisodeId',
    existing,
    incomingValue: 'ep-2',
    incomingSource: source('session', '2026-08-02T00:00:00.000Z'),
  })
  assert.equal(outcome.applied, true)
  if (outcome.applied) assert.equal(outcome.result.value, 'ep-2')
})

test('resolveField: same-scope older write is rejected as stale, not silently applied', () => {
  const resolver = new ContextResolver()
  const existing: ContextFieldValue = { value: 'ep-2', source: source('session', '2026-08-02T00:00:00.000Z') }
  const outcome = resolver.resolveField({
    field: 'currentEpisodeId',
    existing,
    incomingValue: 'ep-1-stale',
    incomingSource: source('session', '2026-08-01T00:00:00.000Z'),
  })
  assert.equal(outcome.applied, false)
  if (!outcome.applied) {
    assert.equal(outcome.rejection.reason, 'stale')
    assert.equal(outcome.rejection.attemptedValue, 'ep-1-stale')
  }
})
