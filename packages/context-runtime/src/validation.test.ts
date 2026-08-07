import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ContextValidationError, validateContextPatch } from './validation.ts'

test('validateContextPatch accepts a well-formed patch', () => {
  assert.doesNotThrow(() =>
    validateContextPatch({
      productId: 'gamek',
      scope: 'session',
      fields: { currentProductId: 'gamek', currentEpisodeId: null },
    }),
  )
})

test('validateContextPatch rejects an unknown field key', () => {
  assert.throws(
    () =>
      validateContextPatch({
        productId: 'gamek',
        scope: 'session',
        fields: { currentFranchiseId: 'star-wars' } as never,
      }),
    ContextValidationError,
  )
})

test('validateContextPatch rejects a non-string, non-null field value', () => {
  assert.throws(
    () =>
      validateContextPatch({
        productId: 'gamek',
        scope: 'session',
        fields: { currentEpisodeId: 42 as never },
      }),
    ContextValidationError,
  )
})

test('validateContextPatch rejects an empty-string field value', () => {
  assert.throws(
    () =>
      validateContextPatch({
        productId: 'gamek',
        scope: 'session',
        fields: { currentEpisodeId: '' },
      }),
    ContextValidationError,
  )
})

test('validateContextPatch rejects a missing productId', () => {
  assert.throws(
    () =>
      validateContextPatch({
        productId: '',
        scope: 'session',
        fields: { currentEpisodeId: 'ep-1' },
      }),
    ContextValidationError,
  )
})

test('validateContextPatch rejects an unknown scope', () => {
  assert.throws(
    () =>
      validateContextPatch({
        productId: 'gamek',
        scope: 'admin_override' as never,
        fields: { currentEpisodeId: 'ep-1' },
      }),
    ContextValidationError,
  )
})

test('validateContextPatch rejects a malformed occurredAt', () => {
  assert.throws(
    () =>
      validateContextPatch({
        productId: 'gamek',
        scope: 'session',
        fields: { currentEpisodeId: 'ep-1' },
        occurredAt: 'not-a-date',
      }),
    ContextValidationError,
  )
})

test('validateContextPatch rejects a non-object fields value', () => {
  assert.throws(
    () =>
      validateContextPatch({
        productId: 'gamek',
        scope: 'session',
        fields: 'currentEpisodeId=ep-1' as never,
      }),
    ContextValidationError,
  )
})
