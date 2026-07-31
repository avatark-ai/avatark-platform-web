// Run with: node --experimental-strip-types --test lib/auth/callbackError.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyCallbackFailure, callbackErrorMessage } from './callbackError.ts'

test('classifies a provider-level cancellation (e.g. Google consent denied)', () => {
  assert.equal(classifyCallbackFailure({ providerError: 'access_denied' }), 'access_denied')
})

test('classifies any other provider error as a generic callback failure', () => {
  assert.equal(classifyCallbackFailure({ providerError: 'server_error' }), 'callback_failed')
})

test('classifies an expired magic-link exchange error', () => {
  assert.equal(
    classifyCallbackFailure({ exchangeError: 'Email link is invalid or has expired' }),
    'expired'
  )
})

test('classifies a reused/invalid code exchange error', () => {
  assert.equal(
    classifyCallbackFailure({ exchangeError: 'invalid flow state, no valid flow state found' }),
    'reused_or_invalid'
  )
})

test('falls back to callback_failed for an unrecognized message', () => {
  assert.equal(classifyCallbackFailure({ exchangeError: 'network hiccup' }), 'callback_failed')
})

test('falls back to callback_failed when nothing is provided', () => {
  assert.equal(classifyCallbackFailure({}), 'callback_failed')
})

test('callbackErrorMessage maps every known reason to a distinct, non-empty message', () => {
  const reasons = ['access_denied', 'expired', 'reused_or_invalid', 'missing_code', 'callback_failed']
  const messages = reasons.map((r) => callbackErrorMessage(r))
  for (const m of messages) assert.ok(m && m.length > 0)
  assert.equal(new Set(messages).size, messages.length)
})

test('callbackErrorMessage returns null when there is no error param', () => {
  assert.equal(callbackErrorMessage(null), null)
})

test('callbackErrorMessage falls back to the generic message for an unknown reason', () => {
  assert.equal(callbackErrorMessage('something_made_up'), callbackErrorMessage('callback_failed'))
})
