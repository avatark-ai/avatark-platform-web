import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { PROD_SCOPE_I_COPY, PROD_SCOPE_I_COPY_SHA256 } from './prodScopeICopy.ts'

// AVK-PROD-03A (T6): the owner-approved Scope I strings, exact text and pinned SHA-256 (GK-01: AVK-RELEASE-01A-GO-C1).
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

test('exactly the three approved strings, byte-exact', () => {
  assert.deepEqual(Object.keys(PROD_SCOPE_I_COPY), ['AVK-PROD-CD1-01', 'AVK-PROD-CD1B-01', 'AVK-PROD-GK-01'])
  assert.equal(PROD_SCOPE_I_COPY['AVK-PROD-GK-01'], 'Interactive experiences in development. Public access is not yet available.')
  assert.equal(PROD_SCOPE_I_COPY['AVK-PROD-CD1-01'], 'Discover Echo')
  assert.equal(PROD_SCOPE_I_COPY['AVK-PROD-CD1B-01'], 'Echo · In development')
  assert.deepEqual([...PROD_SCOPE_I_COPY['AVK-PROD-CD1B-01']].map((c) => c.codePointAt(0)!.toString(16)).slice(4, 7), ['20', 'b7', '20'])
})

test('pinned hashes match', () => {
  for (const [id, text] of Object.entries(PROD_SCOPE_I_COPY)) {
    assert.equal(sha(text), PROD_SCOPE_I_COPY_SHA256[id as keyof typeof PROD_SCOPE_I_COPY_SHA256], id)
  }
})
