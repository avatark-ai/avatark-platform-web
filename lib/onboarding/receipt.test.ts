// Uses Node's built-in test runner + native TypeScript support (Node
// 24) rather than adding a test framework as a new dependency -- this
// repo deliberately has none yet (see docs/ONBOARDING_VERIFICATION.md).
// Run with: node --experimental-strip-types --test lib/onboarding/receipt.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { verifyReceipt } from './receipt.ts'

const SECRET = 'test-only-secret-do-not-use-in-real-environments'
const PRACTICE_ID = 'aad2380d-8d13-4499-8ac9-eb37d9f41cbb'
const ISSUER = 'prometheusk-web'
const AUDIENCE = 'avatark-platform-web'

// Independent, from-scratch signer -- deliberately not importing any
// signing helper, so a bug shared between signer and verifier logic
// wouldn't hide a failure here.
function makeReceipt(overrides: Record<string, unknown> = {}, opts: { skipSign?: boolean } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    v: 1,
    jti: randomUUID(),
    practice_id: PRACTICE_ID,
    status: 'completed',
    completed_at: new Date(now * 1000).toISOString(),
    source: 'avatark-onboarding',
    state: 'expected-state-value',
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + 600,
    ...overrides,
  }
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const sig = opts.skipSign
    ? 'not-a-real-signature'
    : createHmac('sha256', SECRET).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

test('accepts a validly signed, matching receipt', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const receipt = makeReceipt()
  const result = verifyReceipt(receipt, 'expected-state-value')
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.receipt.practiceId, PRACTICE_ID)
    assert.equal(result.receipt.state, 'expected-state-value')
  }
})

test('rejects when no secret is configured', () => {
  delete process.env.ONBOARDING_RECEIPT_SECRET
  const receipt = makeReceipt()
  const result = verifyReceipt(receipt, 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'not_configured')
})

test('rejects a bad issuer', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt(makeReceipt({ iss: 'some-other-service' }), 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'bad_issuer')
})

test('rejects a bad audience', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt(makeReceipt({ aud: 'some-other-app' }), 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'bad_audience')
})

test('rejects an expired receipt', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const now = Math.floor(Date.now() / 1000)
  const result = verifyReceipt(
    makeReceipt({ iat: now - 1200, exp: now - 600 }),
    'expected-state-value'
  )
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'expired')
})

test('rejects a tampered (modified) receipt', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const receipt = makeReceipt()
  const [payloadB64, sig] = receipt.split('.')
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(payloadB64, 'base64url').toString()), practice_id: 'attacker-chosen-id' })
  ).toString('base64url')
  const tampered = `${tamperedPayload}.${sig}`
  const result = verifyReceipt(tampered, 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'bad_signature')
})

test('rejects a receipt signed with the wrong secret', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const receipt = makeReceipt({}, {})
  const [payloadB64] = receipt.split('.')
  const wrongSig = createHmac('sha256', 'a-completely-different-secret').update(payloadB64).digest('base64url')
  const result = verifyReceipt(`${payloadB64}.${wrongSig}`, 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'bad_signature')
})

test('rejects on state/nonce mismatch', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt(makeReceipt(), 'a-different-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'state_mismatch')
})

test('rejects when no state cookie was present at all', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt(makeReceipt(), null)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'missing_state_cookie')
})

test('rejects an unsupported practice ID', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt(makeReceipt({ practice_id: 'some-other-practice' }), 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'unsupported_practice')
})

test('rejects a non-completed status', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt(makeReceipt({ status: 'started' }), 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'not_completed')
})

test('rejects a malformed token', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt('not-even-close-to-a-receipt', 'expected-state-value')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'malformed')
})

test('never requires or exposes reflection/journal/echo content', () => {
  process.env.ONBOARDING_RECEIPT_SECRET = SECRET
  const result = verifyReceipt(makeReceipt(), 'expected-state-value')
  assert.equal(result.ok, true)
  if (result.ok) {
    const keys = Object.keys(result.receipt)
    assert.deepEqual(keys.sort(), ['completedAt', 'practiceId', 'state'])
  }
})
