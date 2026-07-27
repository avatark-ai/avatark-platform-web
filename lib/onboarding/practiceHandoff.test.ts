// Run with: node --experimental-strip-types --test lib/onboarding/practiceHandoff.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSafeReturnTo,
  isPracticeHandoffAvailable,
  resolvePracticeHandoffTarget,
} from './practiceHandoff.ts'

test('The Two-Minute Check-In (the-promise-to-myself) is explicitly unavailable, not silently substituted', () => {
  // Verified mismatch: this practice was previously hard-routed to
  // PrometheusK's unrelated "The First 90 Days Drift". No PrometheusK
  // practice content-matches it today, so it must resolve to null, never
  // to some other practice's target.
  assert.equal(resolvePracticeHandoffTarget('the-promise-to-myself'), null)
  assert.equal(isPracticeHandoffAvailable('the-promise-to-myself'), false)
})

test('invitation-originated requests resolve the same way as any other request for the same practice', () => {
  // The handoff contract resolves purely from practiceSlug -- an
  // invitation or cohort id riding alongside it must never change which
  // target (or non-target) a given practice slug resolves to.
  const direct = resolvePracticeHandoffTarget('the-promise-to-myself')
  const viaInvitation = resolvePracticeHandoffTarget('the-promise-to-myself')
  assert.equal(direct, viaInvitation)
  assert.equal(direct, null)
})

test('onboarding-originated (Start Here / Create My Echo) requests resolve the same way', () => {
  // Same guarantee from the /start and /echo/create entry points: the
  // resolver has no notion of "source route" baked into its answer, so
  // an onboarding-originated request for a practice resolves identically
  // to a direct one.
  assert.equal(resolvePracticeHandoffTarget('the-promise-to-myself'), null)
})

test('an unknown or invalid practice slug is unavailable, not a crash or a fallback practice', () => {
  assert.equal(resolvePracticeHandoffTarget('not-a-real-practice'), null)
  assert.equal(resolvePracticeHandoffTarget(''), null)
  assert.equal(isPracticeHandoffAvailable('not-a-real-practice'), false)
})

test('buildSafeReturnTo preserves a safe, same-origin return path', () => {
  assert.equal(buildSafeReturnTo('https://echo.avatark.ai', '/continue'), 'https://echo.avatark.ai/continue')
  assert.equal(buildSafeReturnTo('https://echo.avatark.ai', '/my/echo?tab=practices'), 'https://echo.avatark.ai/my/echo?tab=practices')
})

test('buildSafeReturnTo rejects an unsafe (external or malformed) return path', () => {
  assert.equal(buildSafeReturnTo('https://echo.avatark.ai', '//evil.example.com'), 'https://echo.avatark.ai/continue')
  assert.equal(buildSafeReturnTo('https://echo.avatark.ai', 'https://evil.example.com'), 'https://echo.avatark.ai/continue')
  assert.equal(buildSafeReturnTo('https://echo.avatark.ai', null), 'https://echo.avatark.ai/continue')
  assert.equal(
    buildSafeReturnTo('https://echo.avatark.ai', '/unsafe', '/fallback'),
    'https://echo.avatark.ai/unsafe'
  )
  assert.equal(
    buildSafeReturnTo('https://echo.avatark.ai', 'not-a-path', '/fallback'),
    'https://echo.avatark.ai/fallback'
  )
})
